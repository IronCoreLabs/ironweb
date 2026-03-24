import * as Recrypt from "./crypto/recrypt";
import * as AES from "./crypto/aes";
import {StreamingDecryptor, StreamingEncryptor, StreamProcessor} from "./crypto/aes/StreamingAes";
import Future from "futurejs";
import SDKError from "../../lib/SDKError";
import {ErrorCodes} from "../../Constants";

/**
 * Decrypt a document given the document container and the private key needed to decrypt
 * @param {EncryptedDocument<Uint8Array>} document     Container of the encrypted document. Contains encrypted document, symmetric key, and nonce necessary for decryption
 * @param {TransformedEncryptedMessage}   symmetricKey Encrypted symmetric key for this document
 * @param {Uint8Array}                    myPrivateKey The private key of the current user decrypting the document
 */
export function decryptDocument(document: EncryptedDocument, symmetricKey: TransformedEncryptedMessage, myPrivateKey: Uint8Array) {
    return Recrypt.decryptPlaintext(symmetricKey, myPrivateKey)
        .flatMap(([_, documentSymmetricKey]) => AES.decryptDocument(document.content, documentSymmetricKey, document.iv))
        .errorMap((error) => new SDKError(error, ErrorCodes.DOCUMENT_DECRYPT_FAILURE));
}

/**
 * Encrypts the given bytes and returns a package of the encrypted data, encrypted symmetric key, and nonce.
 * @param {Uint8Array}            document  Data to encrypt
 * @param {PublicKey<Uint8Array>} publicKey Public key of user to encrypt to
 * @param {SigningKeyPair}        signingKeys    Current users signing keys used to sign transform key
 */
export function encryptDocument(document: Uint8Array, userKeyList: UserOrGroupPublicKey[], groupKeyList: UserOrGroupPublicKey[], signingKeys: SigningKeyPair) {
    return Recrypt.generateDocumentKey()
        .flatMap(([documentKeyPlaintext, documentSymmetricKey]) => {
            return Future.gather3(
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, userKeyList, signingKeys),
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, groupKeyList, signingKeys),
                AES.encryptDocument(document, documentSymmetricKey)
            );
        })
        .map(([encryptedUserKeys, encryptedGroupKeys, encryptedDocument]) => ({
            userAccessKeys: encryptedUserKeys,
            groupAccessKeys: encryptedGroupKeys,
            encryptedDocument,
        }))
        .errorMap((error) => new SDKError(error, ErrorCodes.DOCUMENT_ENCRYPT_FAILURE));
}

/**
 * Encrypt a new document using the same symmetric key. Takes existing document data in order to decrypt the symmetric key, the generates a new document nonce
 * and re-encrypts.
 * @param {Uint8Array}                  newDocumentData              New data to encrypt
 * @param {TransformedEncryptedMessage} existingDocumentSymmetricKey Existing document symmetric key
 * @param {Uint8Array}                  myPrivateKey                 Users private key to decrypt existing document
 */
export function reEncryptDocument(newDocumentData: Uint8Array, existingDocumentSymmetricKey: TransformedEncryptedMessage, myPrivateKey: Uint8Array) {
    return Recrypt.decryptPlaintext(existingDocumentSymmetricKey, myPrivateKey)
        .flatMap(([_, documentSymmetricKey]) => AES.encryptDocument(newDocumentData, documentSymmetricKey))
        .errorMap((error) => new SDKError(error, ErrorCodes.DOCUMENT_REENCRYPT_FAILURE));
}

/**
 * Grant document access by taking the document metadata and list of public keys of users/groups to grant acces to, decrypt the document symmetric key, and then reencrypt it
 * to the public keys of each of the users/groups to grant access to.
 * @param {TransformedEncryptedMessage} symmetricKey   Symmetric key for document to grant access
 * @param {UserOrGroupPublicKey[]}      userKeyList    List of user public keys with which to grant access
 * @param {UserOrGroupPublicKey[]}      groupKeyList   List of group public keys with which to grant access
 * @param {Uint8Array}                  userPrivateKey Current users private encryption key
 * @param {SigningKeyPair}              signingKeys    Current users signing keys used to sign transform key
 */
export function encryptToKeys(
    symmetricKey: TransformedEncryptedMessage,
    userKeyList: UserOrGroupPublicKey[],
    groupKeyList: UserOrGroupPublicKey[],
    myPrivateKey: Uint8Array,
    signingKeys: SigningKeyPair
) {
    return Recrypt.decryptPlaintext(symmetricKey, myPrivateKey)
        .flatMap(([documentKeyPlaintext]) => {
            return Future.gather2(
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, userKeyList, signingKeys),
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, groupKeyList, signingKeys)
            ).map(([encryptedUserKeys, encryptedGroupKeys]) => ({
                userAccessKeys: encryptedUserKeys,
                groupAccessKeys: encryptedGroupKeys,
            }));
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.DOCUMENT_GRANT_ACCESS_FAILURE));
}

/**
 * Initialize streaming decryption: unwrap the symmetric key via PRE, then run the streaming
 * AES-CTR + GHASH decrypt loop. Reads from encryptedStream, writes plaintext to plaintextStream.
 * On success, closes plaintextStream. On failure (including auth tag mismatch), aborts it.
 */
export function decryptDocumentStream(
    encryptedSymmetricKey: TransformedEncryptedMessage,
    myPrivateKey: Uint8Array,
    iv: Uint8Array,
    encryptedStream: ReadableStream<Uint8Array>,
    plaintextStream: WritableStream<Uint8Array>
): Future<SDKError, void> {
    return Recrypt.decryptPlaintext(encryptedSymmetricKey, myPrivateKey)
        .map(([_, documentSymmetricKey]) => {
            // Fire-and-forget: the stream loop runs in the background.
            // Success/failure is communicated through the stream itself.
            StreamingDecryptor.create(documentSymmetricKey, iv).then((decryptor) =>
                runStreamLoop(decryptor, encryptedStream, plaintextStream)
            );
        })
        .errorMap((error) => {
            // PRE key decryption failed — abort the output stream so the caller sees an error
            plaintextStream.abort(error).catch(noop);
            return new SDKError(error, ErrorCodes.DOCUMENT_STREAM_DECRYPT_FAILURE);
        });
}

/**
 * Initialize streaming encryption: generate a document key, encrypt it to all recipients via PRE,
 * then run the streaming AES-CTR + GHASH encrypt loop in the background. Reads from plaintextStream,
 * writes ciphertext to ciphertextStream. On success, closes ciphertextStream. On failure, aborts it.
 */
export function encryptDocumentStream(
    plaintextStream: ReadableStream<Uint8Array>,
    ciphertextStream: WritableStream<Uint8Array>,
    userKeyList: UserOrGroupPublicKey[],
    groupKeyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair,
    iv: Uint8Array
): Future<SDKError, {userAccessKeys: EncryptedAccessKey[]; groupAccessKeys: EncryptedAccessKey[]}> {
    return Recrypt.generateDocumentKey()
        .flatMap(([documentKeyPlaintext, documentSymmetricKey]) => {
            return Future.gather2(
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, userKeyList, signingKeys),
                Recrypt.encryptPlaintextToList(documentKeyPlaintext, groupKeyList, signingKeys)
            ).map(([userAccessKeys, groupAccessKeys]) => {
                // Fire-and-forget: the stream loop runs in the background.
                // Success/failure is communicated through the stream itself.
                StreamingEncryptor.create(documentSymmetricKey, iv).then((encryptor) =>
                    runStreamLoop(encryptor, plaintextStream, ciphertextStream)
                );
                return {userAccessKeys, groupAccessKeys};
            });
        })
        .errorMap((error) => {
            // Key generation or PRE encryption failed — abort the output stream so the caller sees an error
            ciphertextStream.abort(error).catch(noop);
            return new SDKError(error, ErrorCodes.DOCUMENT_STREAM_ENCRYPT_FAILURE);
        });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

/**
 * Generic stream processing loop that drives any StreamProcessor (encrypt or decrypt).
 * Reads chunks from inputStream, processes via processor.processChunk(), writes results
 * to outputStream, then calls processor.finalize() for the final bytes.
 * On success, closes outputStream. On error, aborts outputStream and cancels inputStream.
 */
async function runStreamLoop(
    processor: StreamProcessor,
    inputStream: ReadableStream<Uint8Array>,
    outputStream: WritableStream<Uint8Array>
): Promise<void> {
    const reader = inputStream.getReader();
    const writer = outputStream.getWriter();
    try {
        let done = false;
        while (!done) {
            const result = await reader.read();
            done = result.done;
            if (!done) {
                const output = await processor.processChunk(result.value!);
                if (output.length > 0) {
                    await writer.write(output);
                }
            }
        }
        const finalBytes = await processor.finalize();
        if (finalBytes.length > 0) {
            await writer.write(finalBytes);
        }
        await writer.close();
    } catch (e) {
        await writer.abort(e).catch(noop);
        reader.cancel().catch(noop);
    }
}

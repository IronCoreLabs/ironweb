import * as Recrypt from "./crypto/recrypt";
import * as AES from "./crypto/aes";
import {StreamingDecryptor} from "./crypto/aes/StreamingAes";
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
                runStreamDecryptLoop(decryptor, encryptedStream, plaintextStream)
            );
        })
        .errorMap((error) => {
            // PRE key decryption failed — abort the output stream so the caller sees an error
            plaintextStream.abort(error).catch(noop);
            return new SDKError(error, ErrorCodes.DOCUMENT_STREAM_DECRYPT_FAILURE);
        });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

async function runStreamDecryptLoop(
    decryptor: StreamingDecryptor,
    encryptedStream: ReadableStream<Uint8Array>,
    plaintextStream: WritableStream<Uint8Array>
): Promise<void> {
    const reader = encryptedStream.getReader();
    const writer = plaintextStream.getWriter();
    try {
        let done = false;
        while (!done) {
            const result = await reader.read();
            done = result.done;
            if (!done) {
                const plaintext = await decryptor.processChunk(result.value!);
                if (plaintext.length > 0) {
                    await writer.write(plaintext);
                }
            }
        }
        const finalPlaintext = await decryptor.finalize();
        if (finalPlaintext.length > 0) {
            await writer.write(finalPlaintext);
        }
        await writer.close();
    } catch (e) {
        await writer.abort(e).catch(noop);
        reader.cancel().catch(noop);
    }
}

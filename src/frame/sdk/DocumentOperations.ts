import * as WorkerMediator from "../WorkerMediator";
import * as WMT from "../../WorkerMessageTypes";

/**
 * Decrypt a document given the document container and the private key needed to decrypt
 * @param {EncryptedDocument<Uint8Array>} document     Container of the encrypted document. Contains encrypted document, symmetric key, and nonce necessary for decryption
 * @param {EncryptedSymmetricKey}         symmetricKey Encrypted symmetric key for this document
 * @param {Uint8Array}                    myPrivateKey The private key of the current user decrypting the document
 */
export function decryptDocument(document: EncryptedDocument, symmetricKey: TransformedEncryptedMessage, myPrivateKey: Uint8Array) {
    const payload: WMT.DecryptDocumentWorkerRequest = {
        type: "DOCUMENT_DECRYPT",
        message: {
            document,
            encryptedSymmetricKey: symmetricKey,
            privateKey: myPrivateKey,
        },
    };

    return WorkerMediator.sendMessage<WMT.DecryptDocumentWorkerResponse>(payload, [document.content]).map(({message}) => message.decryptedDocument);
}

/**
 * Encrypts the given bytes and returns a package of the encrypted data, encrypted symmetric key, and nonce.
 * @param {Uint8Array}             document     Data to encrypt
 * @param {UserOrGroupPublicKey[]} userKeyList  List of user public keys to encrypt new document to
 * @param {UserOrGroupPublicKey[]} groupKeyList List of group public keys to encrypt new document to
 * @param {SigningKeyPair}         signingKeys  Newly generated signing keys generated for the users device
 */
export function encryptNewDocumentToList(
    document: Uint8Array,
    userKeyList: UserOrGroupPublicKey[],
    groupKeyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair
) {
    const payload: WMT.EncryptDocumentWorkerRequest = {
        type: "DOCUMENT_ENCRYPT",
        message: {document, userKeyList, groupKeyList, signingKeys},
    };

    return WorkerMediator.sendMessage<WMT.EncryptDocumentWorkerResponse>(payload, [document]).map(({message}) => message);
}

/**
 * Encrypt a new document using the same symmetric key. Takes existing document data in order to decrypt the symmetric key, the generates a new document nonce
 * and re-encrypts.
 * @param {Uint8Array}                  newDocumentData              New data to encrypt
 * @param {TransformedEncryptedMessage} existingDocumentSymmetricKey Existing document symmetric key
 * @param {Uint8Array}                  myPrivateKey                 Users private key to decrypt existing document
 */
export function reEncryptDocument(newDocumentData: Uint8Array, existingDocumentSymmetricKey: TransformedEncryptedMessage, myPrivateKey: Uint8Array) {
    const payload: WMT.ReencryptDocumentWorkerRequest = {
        type: "DOCUMENT_REENCRYPT",
        message: {
            document: newDocumentData,
            privateKey: myPrivateKey,
            existingDocumentSymmetricKey,
        },
    };
    return WorkerMediator.sendMessage<WMT.ReencryptDocumentWorkerResponse>(payload, [newDocumentData]).map(({message}) => message.encryptedDocument);
}

/**
 * Grant access to a document by taking the document metadata and list of public keys for users/groups to grant access to, decrypt the document symmetric key, and then reencrypt it to the user/group
 * public keys.
 * @param {TransformedEncryptedMessage} symmetricKey   Symmetric key for document to grant access
 * @param {UserOrGroupPublicKey[]}      userKeyList    List of user public keys with which to grant access
 * @param {UserOrGroupPublicKey[]}      groupKeyList   List of group public keys with which to grant access
 * @param {Uint8Array}                  userPrivateKey Current users private encryption key
 * @param {SigningKeyPair}              signingKeys    Current users signing keys
 */
export function encryptDocumentToKeys(
    symmetricKey: TransformedEncryptedMessage,
    userKeyList: UserOrGroupPublicKey[],
    groupKeyList: UserOrGroupPublicKey[],
    myPrivateKey: Uint8Array,
    signingKeys: SigningKeyPair
) {
    const payload: WMT.DocumentEncryptToKeysWorkerRequest = {
        type: "DOCUMENT_ENCRYPT_TO_KEYS",
        message: {
            symmetricKey,
            userKeyList,
            groupKeyList,
            privateKey: myPrivateKey,
            signingKeys,
        },
    };

    return WorkerMediator.sendMessage<WMT.DocumentEncryptToKeysWorkerResponse>(payload).map(({message}) => message);
}

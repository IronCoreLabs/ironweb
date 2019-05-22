import * as FrameMediator from "../FrameMediator";
import * as MT from "../../FrameMessageTypes";
import * as ShimUtils from "../ShimUtils";
import * as Base64 from "base64-js";
import {ErrorCodes, VERSION_HEADER_LENGTH, HEADER_META_LENGTH_LENGTH} from "../../Constants";
import SDKError from "../../lib/SDKError";
import {DocumentAccessList, DocumentCreateOptions, Base64Bytes, EncryptedDocumentResponse} from "../../../ironweb";
import {utf8} from "./CodecSDK";

const MAX_DOCUMENT_SIZE = 1024 * 2 * 1000; //2MB

/**
 * Takes the document encrypt options object and normalizes it to a complete object with proper default values.
 * @param  {DocumentCreateOptions} options Options user passed in for document create operation
 * @return {DocumentCreateOptions}         Document create options object with properly filled out fields
 */
function calculateDocumentCreateOptionsDefault(options?: DocumentCreateOptions) {
    //Generate a random ID for the document if the user didn't provide one
    const randomBytes = (window.msCrypto || window.crypto).getRandomValues(new Uint8Array(16));
    const hexID = Array.prototype.map.call(randomBytes, (byte: number) => `00${byte.toString(16)}`.slice(-2)).join("");
    if (!options) {
        return {documentID: hexID, documentName: "", accessList: {users: [], groups: []}, encodeResultAsBase64: true};
    }
    return {
        documentID: options.documentID || hexID,
        documentName: options.documentName || "",
        accessList: {
            users: options.accessList && options.accessList.users ? options.accessList.users : [],
            groups: options.accessList && options.accessList.groups ? options.accessList.groups : [],
        },
        encodeResultAsBase64: options.encodeResultAsBase64 !== undefined ? options.encodeResultAsBase64 : true,
    };
}

/**
 * Returns the list of documents that the current user has access to decrypt. Only document metadata is returned, not any document content.
 * This list will include documents the user authored as well as documents that were granted access to the current user, either by another user or a group.
 */
export function list() {
    ShimUtils.checkSDKInitialized();
    return FrameMediator.sendMessage<MT.DocumentListResponse>({type: "DOCUMENT_LIST"})
        .map(({message}) => message)
        .toPromise();
}

/**
 * Get metadata about a document regardless of where the document content is stored. Returns a Promise which will be resolved with the document metadata.
 * @param {string} documentID ID of the document metadata to retrieve
 */
export function getMetadata(documentID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentMetaGetRequest = {
        type: "DOCUMENT_META_GET",
        message: {documentID},
    };
    return FrameMediator.sendMessage<MT.DocumentMetaGetResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Attempt to parse the document ID from an encrypted document header. Returns the document ID as a string or null if the provided encrypted
 * document doesn't have an embedded ID.
 * @param {Base64Bytes} documentData Encrypted document in base64 form
 */
export function getDocumentIDFromBytes(documentData: Base64Bytes): Promise<string | null> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateEncryptedDocument(documentData);

    const documentBytes = Base64.toByteArray(documentData);
    //Version 1 document, we don't have the document ID as it's not encoded in the header
    if (documentBytes[0] === 1) {
        return Promise.resolve(null);
    }
    //Check to see if the document is a version we don't support and reject if so
    if (documentBytes[0] !== 2) {
        return Promise.reject(
            new SDKError(new Error("Provided encrypted document doesn't appear to be valid. Invalid version."), ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE)
        );
    }
    const headerLength = new DataView(documentBytes.buffer).getUint16(VERSION_HEADER_LENGTH, false);
    const headerContent = documentBytes.slice(
        VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH,
        VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH + headerLength
    );
    try {
        const headerObject: DocumentHeader = JSON.parse(utf8.fromBytes(headerContent));
        return Promise.resolve(headerObject._did_);
    } catch {
        return Promise.reject(new SDKError(new Error("Unable to parse document header. Header value is corrupted."), ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE));
    }
}

/**
 * Retrieve and decrypt a document from the document store. Returns a Promise which will be resolved once the document has been retrieved and decrypted.
 * @param {string} documentID ID of the document to retrieve
 */
export function decryptFromStore(documentID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentStoreDecryptRequest = {
        type: "DOCUMENT_STORE_DECRYPT",
        message: {
            documentID,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreDecryptResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Decrypt the provided document given the ID of the document and its data. Returns a Promise which will be resolved once the document has been successfully decrypted.
 * @param {string}      documentID   Unique ID of document to decrypt
 * @param {Base64Bytes | Uint8Array} documentData Document data to decrypt
 */
export function decrypt(documentID: string, documentData: Base64Bytes | Uint8Array) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateEncryptedDocument(documentData);
    const payload: MT.DocumentDecryptRequest = {
        type: "DOCUMENT_DECRYPT",
        message: {
            documentID,
            documentData: typeof documentData === "string" ? Base64.toByteArray(documentData) : documentData,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentDecryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Creates a new encrypted document within the store. Returns a Promise which will be resolved once the data has been fully encrypted and saved.
 * @param {Uint8Array}            documentData Data to save for document
 * @param {DocumentCreateOptions} options      Document create options. Includes:
 *                                               documentID: string - Optional ID to use for the document. Document ID will be stored unencrypted and must be unique per segment
 *                                               documentName: string - Optional name to provide to document. Document name will be stored unencrypted.
 *                                               accessList: object - Optional object which allows document to be shared with others upon creation. There is no need to add the
 *                                               document creators ID to this list as that will happen automatically. Contains the following keys:
 *                                                   users: Array - List of user IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   groups: Array - List of group IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                               encodeResultAsBase64: boolean - since this function doesn't return the data directly, this flag is disregarded.
 */
export function encryptToStore(documentData: Uint8Array, options?: DocumentCreateOptions) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateDocumentData(documentData);
    if (documentData.length > MAX_DOCUMENT_SIZE) {
        return Promise.reject(
            new SDKError(
                new Error(`Document of length ${documentData.length} exceeds maximum allowed byte size of ${MAX_DOCUMENT_SIZE}`),
                ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED
            )
        );
    }
    const encryptOptions = calculateDocumentCreateOptionsDefault(options);
    if (encryptOptions.documentID) {
        ShimUtils.validateID(encryptOptions.documentID);
    }
    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
    const payload: MT.DocumentStoreEncryptRequest = {
        type: "DOCUMENT_STORE_ENCRYPT",
        message: {
            documentID: encryptOptions.documentID,
            documentData,
            documentName: encryptOptions.documentName,
            userGrants,
            groupGrants,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreEncryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Encrypt the provided document. Returns a Promise which will be resolved once the content has been encrypted.
 * @param {string}                documentData Contents of document to encrypt
 * @param {DocumentCreateOptions} options      Document create options. Includes:
 *                                               documentID: string - Optional ID to use for the document. Document ID will be stored unencrypted and must be unique per segment
 *                                               documentName: string - Optional name to provide to document. Document name will be stored unencrypted.
 *                                               accessList: object - Optional object which allows document to be shared with others upon creation. Contains the following keys:
 *                                                   users: Array - List of user IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   groups: Array - List of group IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                               encodeResultAsBase64: boolean - optional flag determining whether data is returned as a Base64 string or Uint8Array.
 */
export function encrypt(documentData: Uint8Array, options?: DocumentCreateOptions): Promise<EncryptedDocumentResponse> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateDocumentData(documentData);
    const encryptOptions = calculateDocumentCreateOptionsDefault(options);
    if (encryptOptions.documentID) {
        ShimUtils.validateID(encryptOptions.documentID);
    }
    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
    const payload: MT.DocumentEncryptRequest = {
        type: "DOCUMENT_ENCRYPT",
        message: {
            documentData,
            documentID: encryptOptions.documentID,
            documentName: encryptOptions.documentName,
            userGrants,
            groupGrants,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentEncryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => ({
            ...message,
            document: encryptOptions.encodeResultAsBase64 ? Base64.fromByteArray(message.document) : message.document,
        }))
        .toPromise();
}

/**
 * Update an existing documents data in the store. Returns a Promise which will be resolved once the document has been successfully updated in the store.
 * @param {string}     documentID      ID of document to update. Promise will reject if document does not exist
 * @param {Uint8Array} newDocumentData New content to encrypt and save for document
 */
export function updateEncryptedDataInStore(documentID: string, newDocumentData: Uint8Array) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateDocumentData(newDocumentData);

    if (newDocumentData.length > MAX_DOCUMENT_SIZE) {
        return Promise.reject(
            new SDKError(
                new Error(`Document of length ${newDocumentData.length} exceeds maximum allowed byte size of ${MAX_DOCUMENT_SIZE}`),
                ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED
            )
        );
    }

    const payload: MT.DocumentStoreUpdateDataRequest = {
        type: "DOCUMENT_STORE_UPDATE_DATA",
        message: {
            documentID,
            documentData: newDocumentData,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreUpdateDataResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Update and re-encrypt a document that already exists. Returns a Promise which will be resolved once the new data has been encrypted.
 * @param {string}     documentID      Unique ID of document to update
 * @param {Uint8Array} newDocumentData New content to encrypt for document
 */
export function updateEncryptedData(documentID: string, newDocumentData: Uint8Array): Promise<EncryptedDocumentResponse> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateDocumentData(newDocumentData);
    const payload: MT.DocumentUpdateDataRequest = {
        type: "DOCUMENT_UPDATE_DATA",
        message: {
            documentID,
            documentData: newDocumentData,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentUpdateDataResponse>(payload, [payload.message.documentData])
        .map(({message}) => ({
            ...message,
            document: Base64.fromByteArray(message.document),
        }))
        .toPromise();
}

/**
 * Update a document name to a new value. Can also be used to clear the name field for an existing document by passing in null or an empty string for the name parameter.
 * @param {string}      documentID Unique ID of the document to update
 * @param {string|null} name       Name to update. Send in null/empty string to clear a documents name field.
 */
export function updateName(documentID: string, name: string | null) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentUpdateNameRequest = {
        type: "DOCUMENT_UPDATE_NAME",
        message: {
            documentID,
            name: name === "" ? null : name,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentUpdateNameResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Provides access to the provided list of users and groups to the provided document ID. Returns a Promise which will be resolved
 * once access to the document has been granted to all users/groups provided.
 * @param {string}             documentID Unique ID of document to grant access
 * @param {DocumentAccessList} accessList List of IDs (user IDs, group IDs) with which to grant document access
 */
export function grantAccess(documentID: string, grantList: DocumentAccessList) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateAccessList(grantList);

    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(grantList);
    const payload: MT.DocumentGrantRequest = {
        type: "DOCUMENT_GRANT",
        message: {
            documentID,
            userGrants,
            groupGrants,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentGrantResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Revoke access to a document from the provided list of user and/or group IDs. There are limitations on who is able to revoke document access. Document
 * authors can revoke access from any other user or group. Other users can revoke access that they created to other users or groups.
 * @param {string}             documentID Unique ID of document to revoke access
 * @param {DocumentAccessList} revokeList List of IDs (user IDs and/or groupIDs) from which to revoke access
 */
export function revokeAccess(documentID: string, revokeList: DocumentAccessList) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateAccessList(revokeList);

    const [userRevocations, groupRevocations] = ShimUtils.dedupeAccessLists(revokeList);
    const payload: MT.DocumentRevokeRequest = {
        type: "DOCUMENT_REVOKE",
        message: {
            documentID,
            userRevocations,
            groupRevocations,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentRevokeResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

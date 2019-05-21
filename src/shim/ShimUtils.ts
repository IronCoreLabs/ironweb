import {DocumentAccessList, Base64Bytes} from "../../ironweb";
import {CryptoConstants, ALLOWED_ID_CHAR_REGEX} from "../Constants";
import {byteLength} from "base64-js";
const SECRET_KEY_LOCAL_STORAGE_VERSION = "1";
let hasInitializedSDK = false;

/**
 * Generate parent window storage key that we'll use to store/retrieve the users symmetric key to decrypt their device/signing keys
 */
function generateParentStorageKey() {
    return `${SECRET_KEY_LOCAL_STORAGE_VERSION}-icldassk`;
}

/**
 * Mark SDK initialization as complete to allow SDK methods to be run
 */
export function setSDKInitialized() {
    hasInitializedSDK = true;
}

/**
 * Set init complete flag to false. Used when the current user is deauthorized.
 */
export function clearSDKInitialized() {
    hasInitializedSDK = false;
}

/**
 * Throws an exception if the SDK is currently not initialized. Used to gate access to SDK methods which require init to be run before use
 */
export function checkSDKInitialized() {
    if (!hasInitializedSDK) {
        throw new Error(
            'SDK "initialize()" method has not yet been called or completed execution. SDK methods cannot be used until initialization is complete.'
        );
    }
}

/**
 * Set symmetric key for parent window in local storage, if provided
 * @param {string} symmetricKey Symmetric key to decrypt users local device/signing keys
 */
export function storeParentWindowSymmetricKey(symmetricKey?: string) {
    if (symmetricKey) {
        try {
            localStorage.setItem(generateParentStorageKey(), symmetricKey);
        } catch (e) {
            // This catch case does not need to return any error information because keys will persist within one session but users will have to reenter their password upon triggering of a new browser session.
        }
    }
}

/**
 * Retrieve users symmetric key to decrypt users local device/signing keys
 */
export function getParentWindowSymmetricKey() {
    try {
        return localStorage.getItem(generateParentStorageKey()) || undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * Clear out users local symmetric key for decrypting local device/signing keys
 */
export function clearParentWindowSymmetricKey() {
    try {
        localStorage.removeItem(generateParentStorageKey());
    } catch (e) {
        // This catch case does not need to return any error information because failuer to remove information from local storage will not cause any failure in SDK functionality.
    }
}

/**
 * Dedupe string values in an array. Currently expects array of strings which are case-insensitive
 * @param {string[]} list             List of strings to dedupe
 * @param {boolean}  clearEmptyValues Whether we should also filter out all falsy values from the array
 */
export function dedupeArray(list: string[], clearEmptyValues: boolean = false) {
    const seenList: {[key: string]: boolean} = {};

    return list.filter((item) => {
        if (seenList[item] || (clearEmptyValues && !item.length)) {
            return false;
        }
        seenList[item] = true;
        return true;
    });
}

/**
 * Validate that the provided document ID is a string and has a length
 */
export function validateID(id: string) {
    if (typeof id !== "string" || !id.length) {
        throw new Error(`Invalid ID provided. Expected a non-zero length string but got ${id}`);
    }
    if (!ALLOWED_ID_CHAR_REGEX.test(id)) {
        throw new Error(`Invalid ID provided. Provided value includes invalid characters: '${id}'.`);
    }
}

/**
 * Validate that the provided raw document data is a proper byte array
 */
export function validateDocumentData(data: Uint8Array) {
    if (!(data instanceof Uint8Array) || !data.length) {
        throw new Error(`Invalid document data format provided. Expected a Uint8Array.`);
    }
}

/**
 * Validate that the provided encrypted document is in the proper form, which should be Base64 encoded bytes or a Uint8Array of the document content and the AES IV prepended.
 * Therefore validate the length is at least 1 more than the IV length.
 */
export function validateEncryptedDocument(documentData: Base64Bytes | Uint8Array) {
    let encryptedByteLength: number;
    try {
        //This will throw if the documentData isn't valid base64 or Uint8
        encryptedByteLength = typeof documentData === "string" ? byteLength(documentData) : documentData.byteLength;
        if (typeof documentData !== "string" && documentData.constructor.name !== "Uint8Array") {
            throw new Error("Invalid encrypted document content.");
        }
    } catch (_) {
        throw new Error("Invalid encrypted document content. Content length wasn't a multiple of 4 or non-Uint8 bytes were provided.");
    }
    if (encryptedByteLength < CryptoConstants.IV_LENGTH + 1) {
        throw new Error(`Invalid encrypted document content. Length of content does not meet minimum requirements.`);
    }
}

/**
 * Validate that the provided list of access IDs is valid
 */
export function validateAccessList(accessList: DocumentAccessList) {
    const isUserListSet = accessList && Array.isArray(accessList.users) && accessList.users.length;
    const isGroupListSet = accessList && Array.isArray(accessList.groups) && accessList.groups.length;

    if (!isUserListSet && !isGroupListSet) {
        throw new Error("You must provide a list of users or groups with which to change document access.");
    }
}

/**
 * Validate a list of IDs. Only used for validating group member edit at this point
 */
export function validateIDList(userList: string[]) {
    if (!Array.isArray(userList) || !userList.length) {
        throw new Error("You must provide a list of users to perform this operation.");
    }
}

/**
 * Take a document access/revoke list and normalize/dedupe the arrays providing back validated defaults for both
 * @param {DocumentAccessList} accessList Input to SDK of access list
 */
export function dedupeAccessLists(accessList: DocumentAccessList) {
    let userAccess: string[] = [];
    let groupAccess: string[] = [];
    if (accessList.users && accessList.users.length) {
        userAccess = dedupeArray(accessList.users.map(({id}) => id), true);
    }
    if (accessList.groups && accessList.groups.length) {
        groupAccess = dedupeArray(accessList.groups.map(({id}) => id), true);
    }
    return [userAccess, groupAccess];
}

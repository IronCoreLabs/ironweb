import Future from "futurejs";
import {BlindSearchIndex} from "../../../ironweb";
import {CryptoConstants, ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import * as WMT from "../../WorkerMessageTypes";
import {encodeBytesAsHex} from "../FrameUtils";
import * as WorkerMediator from "../WorkerMediator";
import {decryptWithProvidedEdeks, encrypt} from "./DocumentAdvancedApi";

//In-memory storage for the decrypted salts used for multiple search indexes. Each search index decrypted salt
//is stored in this cache with a random string key after the index is initialized so that the salt can be used
//for subsequent tokenize calls.
const searchIndexCache: {[documentId: string]: Uint8Array} = {};

/**
 * Create a new blind search index that is encrypted to the provided group. Creates a new random salt and document ID and performs
 * an unmanaged encryption of that to return the document ID, edeks, and document ciphertext.
 */
export const createBlindSearchIndex = (groupId: string): Future<SDKError, BlindSearchIndex> => {
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(CryptoConstants.SALT_LENGTH + 16));
    const salt = randomBytes.slice(0, CryptoConstants.SALT_LENGTH);
    const randomHexDocId = encodeBytesAsHex(randomBytes.slice(CryptoConstants.SALT_LENGTH));
    return encrypt(randomHexDocId, salt, [], [groupId], false)
        .map((unmanagedDoc) => ({
            searchIndexEncryptedSalt: unmanagedDoc.document,
            searchIndexEdeks: unmanagedDoc.edeks,
        }))
        .errorMap((e) => new SDKError(e.rawError, ErrorCodes.SEARCH_CREATE_INDEX_FAILURE));
};

/**
 * Initialize an existing blind index search. Decrypts the provided unmanaged document salt and stores the result in memory
 * keyed by the document ID of the blind index.
 */
export const initializeBlindSearchIndex = (encryptedSalt: Uint8Array, searchIndexEdeks: Uint8Array): Future<SDKError, string> => {
    const searchIndexId = encodeBytesAsHex(window.crypto.getRandomValues(new Uint8Array(8)));
    return decryptWithProvidedEdeks(encryptedSalt, searchIndexEdeks)
        .map((index) => {
            searchIndexCache[searchIndexId] = index.data;
            return searchIndexId;
        })
        .errorMap((e) => new SDKError(e.rawError, ErrorCodes.SEARCH_INIT_INDEX_FAILURE));
};

/**
 * Tokenize the provided search data using the provided searchIndexId's decrypted salt and optional partition ID.
 */
export const tokenizeData = (searchIndexId: string, data: string, partitionId?: string): Future<SDKError, Uint32Array> => {
    if (!searchIndexCache[searchIndexId]) {
        return Future.reject(new SDKError(new Error("This search index has not yet been initialized."), ErrorCodes.SEARCH_TOKENIZE_DATA_FAILURE));
    }
    const payload: WMT.SearchTokenizeDataRequest = {
        type: "SEARCH_TOKENIZE_DATA",
        message: {
            value: data,
            partitionId,
            salt: searchIndexCache[searchIndexId],
        },
    };
    return WorkerMediator.sendMessage<WMT.SearchTokenizeStringResponse>(payload).map(({message}) => message);
};

/**
 * Tokenize the provided search query using the provided searchIndexId's decrypted salt and optional partition ID.
 */
export const tokenizeQuery = (searchIndexId: string, query: string, partitionId?: string): Future<SDKError, Uint32Array> => {
    if (!searchIndexCache[searchIndexId]) {
        return Future.reject(new SDKError(new Error("This search index has not yet been initialized."), ErrorCodes.SEARCH_TOKENIZE_QUERY_FAILURE));
    }
    const payload: WMT.SearchTokenizeQueryRequest = {
        type: "SEARCH_TOKENIZE_QUERY",
        message: {
            value: query,
            partitionId,
            salt: searchIndexCache[searchIndexId],
        },
    };
    return WorkerMediator.sendMessage<WMT.SearchTokenizeStringResponse>(payload).map(({message}) => message);
};

/**
 * Pass provided string to WebWorker for transliteration
 */
export const transliterateString = (string: string) => {
    const payload: WMT.SearchTransliterateString = {
        type: "SEARCH_TRANSLITERATE_STRING",
        message: string,
    };
    return WorkerMediator.sendMessage<WMT.SearchTransliterateStringResponse>(payload).map(({message}) => message);
};

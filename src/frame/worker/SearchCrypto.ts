import Future from "futurejs";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import loadRecrypt from "./crypto/recrypt";

/**
 * Tokenize the provided data with padding and map to the proper error code on failure.
 */
export const tokenizeData = (data: string, salt: Uint8Array, partitionId?: string): Future<SDKError, Uint32Array> =>
    loadRecrypt()
        .map((recrypt) => recrypt.tokenizeData(data, salt, partitionId))
        .errorMap((e) => new SDKError(e, ErrorCodes.SEARCH_TOKENIZE_DATA_FAILURE));

/**
 * Tokenize the provided query and map to the proper error code on failure.
 */
export const tokenizeQuery = (query: string, salt: Uint8Array, partitionId?: string): Future<SDKError, Uint32Array> =>
    loadRecrypt()
        .map((recrypt) => recrypt.tokenizeQuery(query, salt, partitionId))
        .errorMap((e) => new SDKError(e, ErrorCodes.SEARCH_TOKENIZE_DATA_FAILURE));

/**
 * Load Recrypt and then transliterate the provided string.
 */
export const transliterateString = (data: string): Future<SDKError, string> =>
    loadRecrypt()
        .errorMap((e) => new SDKError(e, ErrorCodes.WEBASSEMBLY_SUPPORT_FAILURE))
        .map((recrypt) => recrypt.transliterateString(data));

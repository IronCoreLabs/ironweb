import * as Recrypt from "./crypto/recrypt";

/**
 * Tokenize the provided data with padding.
 */
export const tokenizeData = (data: string, salt: Uint8Array, partitionId?: string): Uint32Array => Recrypt.tokenizeData(data, salt, partitionId);

/**
 * Tokenize the provided query and map to the proper error code on failure.
 */
export const tokenizeQuery = (query: string, salt: Uint8Array, partitionId?: string): Uint32Array => Recrypt.tokenizeQuery(query, salt, partitionId);

/**
 * Load Recrypt and then transliterate the provided string.
 */
export const transliterateString = (data: string): string => Recrypt.transliterateString(data);

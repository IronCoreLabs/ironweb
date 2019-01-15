import {encode, decode} from "@stablelib/utf8";
import {fromByteArray, toByteArray} from "base64-js";

export const utf8 = {
    /**
     * Convert a byte array into a UTF-8 string sequence. This operation will throw an exception if the bytes provided are not valid UTF-8.
     * @param {Uint8Array} bytes Array of bytes to convert into UTF-8
     */
    fromBytes(bytes: Uint8Array) {
        return decode(bytes);
    },

    /**
     * Convert a valid UTF-8 string into an array of bytes. This operation will throw an exception if the string provided is not valid UTF-8.
     * @param {string} utf8String UTF-8 string to convert into bytes
     */
    toBytes(utf8String: string) {
        return encode(utf8String);
    },
};

export const base64 = {
    /**
     * Convert a byte array into a Base64 encoded string.
     * @param {Uint8Array} bytes Array of bytes to convert into Base64
     */
    fromBytes(bytes: Uint8Array) {
        return fromByteArray(bytes);
    },

    /**
     * Convert a valid Base64 string into an array of bytes. This operation will throw an exception if the string provided is not valid Base64.
     * @param {string} base64String Base64 string to convert into bytes
     */
    toBytes(base64String: string) {
        return toByteArray(base64String);
    },
};

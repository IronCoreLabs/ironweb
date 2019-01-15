import * as UTF8 from "@stablelib/utf8";
import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import {fromByteArray, toByteArray} from "base64-js";

/**
 * Convert a string into a ArrayBuffer, specifically a Uint8Array
 * @param  {string}     value String value to convert
 * @return {Uint8Array}       Byte array of data
 */
export function utf8StringToArrayBuffer(value: string) {
    return UTF8.encode(value);
}

/**
 * Convert a byte array of UTF8 characters into a string
 * @param {Uint8Array} data Byte array to convert
 */
export function arrayBufferToUtf8String(data: Uint8Array) {
    return UTF8.decode(data);
}

/**
 * Convert a public key bytes into public key base64 string
 * @param {PublicKey<Uint8Array>} publicKey Public key to transform
 */
export function publicKeyToBase64(publicKey: PublicKey<Uint8Array>) {
    return {
        x: fromByteArray(publicKey.x),
        y: fromByteArray(publicKey.y),
    };
}

/**
 * Convert a public key base64 string into bytes
 * @param {PublicKey<Base64String>} publicKey Public key to transform
 */
export function publicKeyToBytes(publicKey: PublicKey<Base64String>) {
    return {
        x: toByteArray(publicKey.x),
        y: toByteArray(publicKey.y),
    };
}

/**
 * Convert TransformKeys in byte array form to base64 form.
 * @param {TransformKey} transformKey Transform Key to convert to base64 strings
 */
export function transformKeyToBase64(transformKey: TransformKey) {
    return {
        ephemeralPublicKey: publicKeyToBase64(transformKey.ephemeralPublicKey),
        toPublicKey: publicKeyToBase64(transformKey.toPublicKey),
        encryptedTempKey: fromByteArray(transformKey.encryptedTempKey),
        hashedTempKey: fromByteArray(transformKey.hashedTempKey),
        publicSigningKey: fromByteArray(transformKey.publicSigningKey),
        signature: fromByteArray(transformKey.signature),
    };
}

/**
 * Takes any number of Uint8Arrays and concats them together into a single Uint8Array
 * @param  {...Uint8Array} buffers Buffers to concat
 * @return {Uint8Array}            Concatenated buffer
 */
export function concatArrayBuffers(...buffers: Uint8Array[]) {
    const length = buffers.reduce((count, buffer) => count + buffer.length, 0);

    let currentPosition = 0;
    return buffers.reduce((newBuffer, buffer) => {
        newBuffer.set(buffer, currentPosition);
        currentPosition += buffer.length;
        return newBuffer;
    }, new Uint8Array(length));
}

/**
 * Polyfill since some environments (notably Phantom) don't support ArrayBuffer.slice
 * @param {Uint8Array} buffer Buffer to slice
 * @param {number}     start  Slice start index
 * @param {number}     end    Slice optional end index
 */
export function sliceArrayBuffer(buffer: Uint8Array, start: number, end?: number) {
    if (typeof buffer.slice === "function") {
        return buffer.slice(start, end);
    }
    return new Uint8Array(Array.prototype.slice.call(buffer, start, end));
}

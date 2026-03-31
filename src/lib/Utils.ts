import * as UTF8 from "@stablelib/utf8";
import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import {fromByteArray, toByteArray} from "base64-js";
import Future from "futurejs";
import {CryptoConstants, ErrorCodes, VERSION_HEADER_LENGTH, HEADER_META_LENGTH_LENGTH} from "../Constants";
import SDKError from "./SDKError";

/**
 * Convert a string into a ArrayBuffer, specifically a Uint8Array
 */
export function utf8StringToArrayBuffer(value: string): Uint8Array {
    return UTF8.encode(value);
}

/**
 * Convert a byte array of UTF8 characters into a string
 */
export function arrayBufferToUtf8String(data: Uint8Array): string {
    return UTF8.decode(data);
}

/**
 * Convert a public key bytes into public key base64 string
 */
export function publicKeyToBase64(publicKey: PublicKey<Uint8Array>): PublicKey<Base64String> {
    return {
        x: fromByteArray(publicKey.x),
        y: fromByteArray(publicKey.y),
    };
}

/**
 * Convert a public key base64 string into bytes
 */
export function publicKeyToBytes(publicKey: PublicKey<Base64String>): PublicKey<Uint8Array> {
    return {
        x: toByteArray(publicKey.x),
        y: toByteArray(publicKey.y),
    };
}

/**
 * Convert TransformKeys in byte array form to base64 form.
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
 */
export function concatArrayBuffers(...buffers: Uint8Array[]): Uint8Array {
    const length = buffers.reduce((count, buffer) => count + buffer.length, 0);

    let currentPosition = 0;
    return buffers.reduce((newBuffer, buffer) => {
        newBuffer.set(buffer, currentPosition);
        currentPosition += buffer.length;
        return newBuffer;
    }, new Uint8Array(length));
}

/**
 * Convert a transfer list of Uint8Arrays and Transferables into a Transferable[].
 * Uint8Arrays are unwrapped to their underlying ArrayBuffer; other items pass through.
 */
export function toTransferables(items: (Uint8Array | Transferable)[]): Transferable[] {
    return items.map((item) => (item instanceof Uint8Array ? item.buffer : item)) as Transferable[];
}

/**
 * Polyfill since some environments (notably Phantom) don't support ArrayBuffer.slice
 */
export function sliceArrayBuffer(buffer: Uint8Array, start: number, end?: number): Uint8Array {
    if (typeof buffer.slice === "function") {
        return buffer.slice(start, end);
    }
    return new Uint8Array(Array.prototype.slice.call(buffer, start, end));
}

export interface ParsedDocumentHeader {
    documentID: string | null;
    iv: Uint8Array;
    contentOffset: number;
}

/**
 * Parse the IronCore document header from encrypted document bytes.
 * Extracts the document ID (if v2), IV, and the byte offset where ciphertext begins.
 */
export function parseDocumentHeader(data: Uint8Array): Future<SDKError, ParsedDocumentHeader> {
    return Future.tryF(() => {
        const version = data[0];
        let documentID: string | null = null;
        let headerTotalLength: number;

        if (version === 1) {
            headerTotalLength = VERSION_HEADER_LENGTH;
        } else if (version === 2) {
            const headerJsonLength = new DataView(data.buffer, data.byteOffset).getUint16(VERSION_HEADER_LENGTH, false);
            headerTotalLength = VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH + headerJsonLength;
            const headerContent = data.slice(VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH, headerTotalLength);
            const headerObject: DocumentHeader = JSON.parse(UTF8.decode(headerContent));
            documentID = headerObject._did_;
        } else {
            throw new Error("Provided encrypted document doesn't appear to be valid. Invalid version.");
        }

        const contentOffset = headerTotalLength + CryptoConstants.IV_LENGTH;
        const iv = data.slice(headerTotalLength, contentOffset);

        return {documentID, iv, contentOffset};
    }).errorMap((error) => new SDKError(error, ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE));
}

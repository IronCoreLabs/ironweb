import {encode} from "@stablelib/utf8";
import {fromByteArray, toByteArray} from "base64-js";
import Future from "futurejs";
import {CryptoConstants, DOCUMENT_ENCRYPTION_DETAILS_VERSION_NUMBER, HEADER_META_LENGTH_LENGTH, VERSION_HEADER_LENGTH} from "../Constants";
import {concatArrayBuffers, sliceArrayBuffer} from "../lib/Utils";

const ENCRYPTED_DEVICE_KEY_LOCAL_STORAGE_VERSION = "1";

/**
 * Generate frame local storage key that we'll use to store/retrieve the users device/signing private keys and nonce
 * @param {string} userID    Users provided ID
 * @param {number} segmentID ID of segment to which user belongs
 */
function generateFrameStorageKey(userID: string, segmentID: number) {
    return `${ENCRYPTED_DEVICE_KEY_LOCAL_STORAGE_VERSION}-${segmentID}:${userID}-icldaspkn`;
}

/**
 * Given a device and signing private key, combine them together, stringify, and set them in local storage
 * @param {string}                 userID            Users provided ID
 * @param {number}                 segmentID         ID of segment to which user belongs
 * @param {PrivateKey<Uint8Array>} devicePrivateKey  Users device private key
 * @param {PrivateKey<Uint8Array>} signingPrivateKey Users signing private key
 */
export function storeDeviceAndSigningKeys(
    userID: string,
    segmentID: number,
    devicePrivateKey: PrivateKey<Uint8Array>,
    signingPrivateKey: PrivateKey<Uint8Array>,
    nonce: Uint8Array
) {
    try {
        localStorage.setItem(
            generateFrameStorageKey(userID, segmentID),
            JSON.stringify({
                deviceKey: fromByteArray(devicePrivateKey),
                signingKey: fromByteArray(signingPrivateKey),
                nonce: fromByteArray(nonce),
            })
        );
    } catch (e) {
        // This catch case does not need to return any error information because keys will persist within one session but users will have to reenter their password upon triggering of a new browser session.
    }
}

/**
 * Clear out keys from local storage
 * @param {string} userID    Users provided ID
 * @param {number} segmentID Segment ID user is a part of
 */
export function clearDeviceAndSigningKeys(userID: string, segmentID: number) {
    try {
        localStorage.removeItem(generateFrameStorageKey(userID, segmentID));
    } catch (e) {
        // This catch case does not need to return any error information because failure to remove information from local storage will not cause any failure in SDK functionality.
    }
}

/**
 * Attempt to read out the signing and device keys from local storage. Will return with null if keys don't exists or can't be parsed
 * @param {string} userID    Users provided ID
 * @param {number} segmentID ID of segment to which user belongs
 */
export function getDeviceAndSigningKeys(
    userID: string,
    segmentID: number
): Future<Error, {encryptedDeviceKey: Uint8Array; encryptedSigningKey: Uint8Array; nonce: Uint8Array}> {
    let keys: any;
    try {
        keys = JSON.parse(localStorage.getItem(generateFrameStorageKey(userID, segmentID)) as any);
        if (!keys || typeof keys !== "object" || !keys.deviceKey || !keys.signingKey || !keys.deviceKey.length || !keys.signingKey.length) {
            throw new Error("Invalid local keys");
        }
        return Future.of({
            encryptedDeviceKey: toByteArray(keys.deviceKey),
            encryptedSigningKey: toByteArray(keys.signingKey),
            nonce: toByteArray(keys.nonce),
        });
    } catch (e) {
        clearDeviceAndSigningKeys(userID, segmentID);
        return Future.reject(e);
    }
}

/**
 * Convert an encrypted document package (in either byte or base64 string form) to bytes fields. Splits out the version and IV
 * from the actual encrypted content and returns all three portions.
 * @param {Uint8Array} document Document to break apart into fields
 */
export function documentToByteParts(document: Uint8Array | string): EncryptedDocument {
    const encryptedDocumentBytes = document instanceof Uint8Array ? document : toByteArray(document);
    const version = sliceArrayBuffer(encryptedDocumentBytes, 0, VERSION_HEADER_LENGTH);
    if (version[0] === 1) {
        return {
            iv: sliceArrayBuffer(encryptedDocumentBytes, VERSION_HEADER_LENGTH, CryptoConstants.IV_LENGTH + VERSION_HEADER_LENGTH),
            content: sliceArrayBuffer(encryptedDocumentBytes, CryptoConstants.IV_LENGTH + VERSION_HEADER_LENGTH),
        };
    }
    //Get the header byte length (represented as two bytes) out as big endian so we can get the length of the JSON encoded header
    const headerLength = new DataView(encryptedDocumentBytes.buffer).getUint16(encryptedDocumentBytes.byteOffset + VERSION_HEADER_LENGTH, false);
    const fullLeadingBytesLength = VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH + headerLength;

    return {
        iv: sliceArrayBuffer(encryptedDocumentBytes, fullLeadingBytesLength, fullLeadingBytesLength + CryptoConstants.IV_LENGTH),
        content: sliceArrayBuffer(encryptedDocumentBytes, fullLeadingBytesLength + CryptoConstants.IV_LENGTH),
    };
}

/**
 * Return a single byte Buffer which represents the document encryption version details. This byte will
 * be prepended to the front of all encrypted documents.
 */
export function generateDocumentHeaderBytes(documentID: string, segmentID: number) {
    const headerMeta = JSON.stringify({
        _did_: documentID,
        _sid_: segmentID,
    } as DocumentHeader);
    const headerDataView = new DataView(new ArrayBuffer(HEADER_META_LENGTH_LENGTH));
    headerDataView.setUint16(0, headerMeta.length, false);

    return concatArrayBuffers(
        //First byte is the version of the document
        new Uint8Array([DOCUMENT_ENCRYPTION_DETAILS_VERSION_NUMBER]),
        //Next two bytes are the length of the remaining JSON encoded header
        new Uint8Array(headerDataView.buffer),
        //Last N bytes are JSON encoded as utf8 bytes
        encode(headerMeta)
    );
}

/**
 * Convert an encrypted document package to a single Uint8Array of bytes. Concats bytes together to form a single stream of bytes in the
 * expected order.
 * @param {EncryptedDocument} document Document to convert
 */
export function combineDocumentParts(documentID: string, segmentID: number, document: EncryptedDocument) {
    return concatArrayBuffers(generateDocumentHeaderBytes(documentID, segmentID), document.iv, document.content);
}

/**
 * Convert an encrypted document package (version, IV, data) from bytes into a single base64 string with the bytes in the
 * expected order.
 */
export function encryptedDocumentToBase64(documentID: string, segmentID: number, document: EncryptedDocument) {
    return fromByteArray(combineDocumentParts(documentID, segmentID, document));
}

/**
 * Encode the provided bytes as hex
 */
export const encodeBytesAsHex = (byteSource: Uint8Array): string => Array.from(byteSource, (byte) => `00${byte.toString(16)}`.slice(-2)).join("");

import {CryptoConstants} from "../../../../Constants";
const {IV_LENGTH, AES_SYMMETRIC_KEY_LENGTH, NATIVE_DECRYPT_FAILURE_ERROR} = CryptoConstants;
import {sliceArrayBuffer} from "../../../../lib/Utils";
import Future from "futurejs";
import * as NativeAes from "./NativeAes";
import * as PolyfillAes from "./PolyfillAes";
import {generateRandomBytes} from "../CryptoUtils";

/**
 * Decrypt the user and device keys using the provided passcode derived key
 * @param {Uint8Array}        encryptedPrivateUserKey Users encrypted data encryption key
 * @param {Uint8Array}        encryptedPrivateDeviceKey Users encrypted device key
 * @param {DerivedKeyResults} derivedKey                 Derived key content from passcode. Contains derived key and salt that was used during derivation
 */
export function decryptUserKey(encryptedPrivateUserKey: Uint8Array, derivedKey: DerivedKeyResults) {
    if (derivedKey.key instanceof Uint8Array) {
        return PolyfillAes.decryptUserKey(encryptedPrivateUserKey, derivedKey.key);
    }
    return NativeAes.decryptUserKey(encryptedPrivateUserKey, derivedKey.key);
}

/**
 * Encrypt the provided keys using the provided derived key parts.
 * @param {Uint8Array}        decryptedPrivateUserKey   Users decrypted private user key
 * @param {Uint8Array}        decryptedPrivateDeviceKey Users decrypted private device key
 * @param {DerivedKeyResults} derivedKey                Passcode-derived key
 */
export function encryptUserKey(decryptedPrivateUserKey: Uint8Array, derivedKey: DerivedKeyResults) {
    return generateRandomBytes(IV_LENGTH).flatMap((iv) => {
        if (derivedKey.key instanceof Uint8Array) {
            return PolyfillAes.encryptUserKey(decryptedPrivateUserKey, derivedKey.key, derivedKey.salt, iv);
        }
        return NativeAes.encryptUserKey(decryptedPrivateUserKey, derivedKey.key, derivedKey.salt, iv);
    });
}

/**
 * Encrypt the provided document with the provided symmetric key. Will generate a nonce/IV and return as part of response.
 * @param {Uint8Array} decryptedDocument    Document to encrypt
 * @param {Uint8Array} documentSymmetricKey Symmetric key to use for encryption
 */
export function encryptDocument(decryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array): Future<Error, EncryptedDocument> {
    return generateRandomBytes(IV_LENGTH).flatMap((iv) => {
            return NativeAes.encryptDocument(decryptedDocument, documentSymmetricKey, iv).handleWith(() =>
                PolyfillAes.encryptDocument(decryptedDocument, documentSymmetricKey, iv)
            );
    });
}

/**
 * Decrypt the provided document with the provided symmetric key and nonce/IV.
 * @param {Uint8Array} encryptedDocument    Document to decrypt
 * @param {Uint8Array} documentSymmetricKey Symmetric key to use to decrypt
 * @param {Uint8Array} dataNonce            Nonce/IV to use to decrypt
 */
export function decryptDocument(encryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array, dataNonce: Uint8Array) {
        return NativeAes.decryptDocument(encryptedDocument, documentSymmetricKey, dataNonce).handleWith((error) => {
            //Don't attempt to invoke polyfill if decryption failed because the key was wrong. In that case the polyfill
            //will obviously fail as well and we'll just waste cycles trying to decrypt.
            if (error.name === NATIVE_DECRYPT_FAILURE_ERROR) {
                //We have to cast to any because handleWith says we should be able to handle this, but in this case, we don't want to
                return Future.reject(new Error("Decryption of document content failed.")) as any;
            }
            return PolyfillAes.decryptDocument(encryptedDocument, documentSymmetricKey, dataNonce);
        })
}

/**
 * Encrypt the users private device and signing keys. Generates a random symmetric key and IV to encrypt the two keys.
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 */
export function encryptDeviceAndSigningKeys(devicePrivateKey: Uint8Array, signingPrivateKey: Uint8Array): Future<Error, EncryptedLocalKeys> {
    return generateRandomBytes(IV_LENGTH + AES_SYMMETRIC_KEY_LENGTH)
        .map((symmetricKeyAndIVBytes) => ({
            symmetricKey: sliceArrayBuffer(symmetricKeyAndIVBytes, 0, AES_SYMMETRIC_KEY_LENGTH),
            iv: sliceArrayBuffer(symmetricKeyAndIVBytes, AES_SYMMETRIC_KEY_LENGTH),
        }))
        .flatMap(({symmetricKey, iv}) => {
            return NativeAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, iv).handleWith(() =>
                PolyfillAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, iv)
            )
        });
}

/**
 * Decrypt the users private device and signing keys using the provided symmetric key and IV that were used to encrypt the keys.
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 * @param {Uint8Array} symmetricKey      Symmetric key to use for encryption
 * @param {Uint8Array} iv                IV/nonce to use for encryption
 */
export function decryptDeviceAndSigningKeys(devicePrivateKey: Uint8Array, signingPrivateKey: Uint8Array, symmetricKey: Uint8Array, iv: Uint8Array) {
    return NativeAes.decryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, iv).handleWith(() =>
        PolyfillAes.decryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, iv)
    )
}

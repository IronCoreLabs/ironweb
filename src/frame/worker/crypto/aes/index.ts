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
    });
}

/**
 * Generate a random symmetric key and two separate IVs from a single block of random bytes.
 */
export function generateKeyAndIvs(): Future<Error, {symmetricKey: Uint8Array; deviceIv: Uint8Array; signingIv: Uint8Array}> {
    return generateRandomBytes(IV_LENGTH * 2 + AES_SYMMETRIC_KEY_LENGTH).map((bytes) => ({
        symmetricKey: sliceArrayBuffer(bytes, 0, AES_SYMMETRIC_KEY_LENGTH),
        deviceIv: sliceArrayBuffer(bytes, AES_SYMMETRIC_KEY_LENGTH, AES_SYMMETRIC_KEY_LENGTH + IV_LENGTH),
        signingIv: sliceArrayBuffer(bytes, AES_SYMMETRIC_KEY_LENGTH + IV_LENGTH),
    }));
}

/**
 * Encrypt the users private device and signing keys. Generates a random symmetric key and two separate IVs
 * (one for each key) to encrypt them securely. Using separate IVs is critical for AES-GCM security.
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 */
export function encryptDeviceAndSigningKeys(devicePrivateKey: Uint8Array, signingPrivateKey: Uint8Array): Future<Error, EncryptedLocalKeys> {
    return generateKeyAndIvs().flatMap(({symmetricKey, deviceIv, signingIv}) => {
            return NativeAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, deviceIv, signingIv).handleWith(() =>
                PolyfillAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, deviceIv, signingIv)
            );
        });
}

/**
 * Decrypt the users private device and signing keys using the provided symmetric key and IVs that were used to encrypt the keys.
 * @param {Uint8Array} encryptedDeviceKey  Users encrypted device private key
 * @param {Uint8Array} encryptedSigningKey Users encrypted signing private key
 * @param {Uint8Array} symmetricKey        Symmetric key to use for decryption
 * @param {Uint8Array} deviceIv            IV used for device key encryption
 * @param {Uint8Array} signingIv           IV used for signing key encryption
 */
export function decryptDeviceAndSigningKeys(
    encryptedDeviceKey: Uint8Array,
    encryptedSigningKey: Uint8Array,
    symmetricKey: Uint8Array,
    deviceIv: Uint8Array,
    signingIv: Uint8Array
) {
    return NativeAes.decryptDeviceAndSigningKeys(encryptedDeviceKey, encryptedSigningKey, symmetricKey, deviceIv, signingIv).handleWith(() =>
        PolyfillAes.decryptDeviceAndSigningKeys(encryptedDeviceKey, encryptedSigningKey, symmetricKey, deviceIv, signingIv)
    );
}

/**
 * Re-encrypt the users private device and signing keys with the existing symmetric key but new IVs.
 * Used to migrate from old single-IV format to the secure two-IV format.
 * @param {Uint8Array} devicePrivateKey  Users decrypted device private key
 * @param {Uint8Array} signingPrivateKey Users decrypted signing private key
 * @param {Uint8Array} symmetricKey      Existing symmetric key to reuse
 */
export function reEncryptDeviceAndSigningKeys(
    devicePrivateKey: Uint8Array,
    signingPrivateKey: Uint8Array,
    symmetricKey: Uint8Array
): Future<Error, EncryptedLocalKeys> {
    return generateRandomBytes(IV_LENGTH * 2)
        .map((bytes) => ({
            deviceIv: sliceArrayBuffer(bytes, 0, IV_LENGTH),
            signingIv: sliceArrayBuffer(bytes, IV_LENGTH),
        }))
        .flatMap(({deviceIv, signingIv}) => {
            return NativeAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, deviceIv, signingIv).handleWith(() =>
                PolyfillAes.encryptDeviceAndSigningKeys(devicePrivateKey, signingPrivateKey, symmetricKey, deviceIv, signingIv)
            );
        });
}

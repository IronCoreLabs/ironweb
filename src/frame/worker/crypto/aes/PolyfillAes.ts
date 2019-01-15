import * as sjcl from "sjcl";
import Future from "futurejs";
import {concatArrayBuffers, sliceArrayBuffer} from "../../../../lib/Utils";
import {CryptoConstants} from "../../../../Constants";
import {fromByteArray, toByteArray} from "base64-js";
const {IV_LENGTH, SALT_LENGTH} = CryptoConstants;

/**
 * Encrypt the provided data via AES using the provided passcode-derived key and IV. Returns a future which will
 * be resolved with the encrypted data as bytes.
 * @param {Uint8Array} decryptedData Decrypted byte data to encrypt
 * @param {Uint8Array} derivedKey    Passcode derived key bytes
 * @param {Uint8Array} iv            IV to use during decryption
 */
function aesEncrypt(decryptedData: Uint8Array, derivedKey: Uint8Array, iv: Uint8Array) {
    return Future.tryF(() => {
        const derivedKeyBits = sjcl.codec.base64.toBits(fromByteArray(derivedKey));
        const decryptedDataBits = sjcl.codec.base64.toBits(fromByteArray(decryptedData));
        const ivBits = sjcl.codec.base64.toBits(fromByteArray(iv));

        const encryptedDataBits = sjcl.mode.gcm.encrypt(new sjcl.cipher.aes(derivedKeyBits), decryptedDataBits, ivBits);

        return toByteArray(sjcl.codec.base64.fromBits(encryptedDataBits));
    });
}

/**
 * Decrypt the provided data via AES using the provided passcode-derived key and IV. Returns a future which will either be
 * resolved with the decrypted data or rejected with an error that the passcode was wrong
 * @param {Uint8Array} encryptedData Data to decrypt
 * @param {Uint8Array} derivedKey    Passcode derived key bytes
 * @param {Uint8Array} iv            IV to use during decryption
 */
function aesDecrypt(encryptedData: Uint8Array, derivedKey: Uint8Array, iv: Uint8Array) {
    const derivedKeyBits = sjcl.codec.base64.toBits(fromByteArray(derivedKey));
    const encryptedDataBits = sjcl.codec.base64.toBits(fromByteArray(encryptedData));
    const ivBits = sjcl.codec.base64.toBits(fromByteArray(iv));

    return Future.tryF(() => {
        const decryptedDataBits = sjcl.mode.gcm.decrypt(new sjcl.cipher.aes(derivedKeyBits), encryptedDataBits, ivBits);
        return toByteArray(sjcl.codec.base64.fromBits(decryptedDataBits));
    });
}

/**
 * Encrypted the provided user and device private keys using the provided passcode derived key and salt
 * @param  {Uint8Array}               userPrivateKey  Users private master key
 * @param  {Uint8Array}               deviceSecretKey Users private device key
 * @param  {Uint8Array}               derivedKey      Passcode derived key
 * @param  {Uint8Array}               salt            Salt used to generate derived key
 * @param  {Uint8Array}               iv              IV to use for AES encryption
 */
export function encryptUserKey(userPrivateKey: Uint8Array, derivedKey: Uint8Array, salt: Uint8Array, iv: Uint8Array) {
    return aesEncrypt(userPrivateKey, derivedKey, iv).map((encryptedKey: Uint8Array) => concatArrayBuffers(salt, iv, encryptedKey));
}

/**
 * Given a users encrypted private key and passcode, decrypt the private key
 * @param {string}   userPrivateKey Users encrypted private key
 * @param {string}   derivedKey     Passcode derived key
 */
export function decryptUserKey(userPrivateKey: Uint8Array, derivedKey: Uint8Array) {
    const userKeyIV = sliceArrayBuffer(userPrivateKey, SALT_LENGTH, IV_LENGTH + SALT_LENGTH);
    const userPrivateKeyBytes = sliceArrayBuffer(userPrivateKey, SALT_LENGTH + IV_LENGTH);

    return aesDecrypt(userPrivateKeyBytes, derivedKey, userKeyIV);
}

/**
 * Encrypt the provided document with the provided symmetric key and IV
 * @param {Uint8Array} decryptedDocument    Document to encrypt
 * @param {Uint8Array} documentSymmetricKey Symmetric key to use to encrypt
 * @param {Uint8Array} iv                   IV to use during encryption
 */
export function encryptDocument(decryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array, iv: Uint8Array) {
    return aesEncrypt(decryptedDocument, documentSymmetricKey, iv).map((content) => ({iv, content}));
}

/**
 * Decrypt the provided document with the provided symmetric key and IV
 * @param {Uint8Array} encryptedDocument    Document to decrypt
 * @param {Uint8Array} documentSymmetricKey Symmetric key to decrypt document
 * @param {Uint8Array} iv                   IV to decrypt document
 */
export function decryptDocument(encryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array, iv: Uint8Array) {
    return aesDecrypt(encryptedDocument, documentSymmetricKey, iv);
}

/**
 * Encrypt the users private device and signing keys using the provided symmetric key and IV
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 * @param {Uint8Array} symmetricKey      Symmetric key to use for encryption
 * @param {Uint8Array} iv                IV to use for encryption
 */
export function encryptDeviceAndSigningKeys(
    devicePrivateKey: Uint8Array,
    signingPrivateKey: Uint8Array,
    symmetricKey: Uint8Array,
    iv: Uint8Array
): Future<Error, EncryptedLocalKeys> {
    return Future.gather2(encryptDocument(devicePrivateKey, symmetricKey, iv), encryptDocument(signingPrivateKey, symmetricKey, iv)).map(
        ([encryptedDeviceKey, encryptedSigningKey]) => ({
            iv,
            symmetricKey,
            encryptedDeviceKey: encryptedDeviceKey.content,
            encryptedSigningKey: encryptedSigningKey.content,
        })
    );
}

/**
 * Decrypt the users private device and signing keys using the provided symmetric key and IV
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 * @param {Uint8Array} symmetricKey      Symmetric key to use for encryption
 * @param {Uint8Array} iv                IV to use for encryption
 */
export function decryptDeviceAndSigningKeys(devicePrivateKey: Uint8Array, signingPrivateKey: Uint8Array, symmetricKey: Uint8Array, iv: Uint8Array) {
    return Future.gather2(decryptDocument(devicePrivateKey, symmetricKey, iv), decryptDocument(signingPrivateKey, symmetricKey, iv)).map(
        ([deviceKey, signingKey]) => ({deviceKey, signingKey})
    );
}

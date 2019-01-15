import Future from "futurejs";
import {concatArrayBuffers, sliceArrayBuffer} from "../../../../lib/Utils";
import {CryptoConstants} from "../../../../Constants";
const {IV_LENGTH, SALT_LENGTH} = CryptoConstants;
import {getCryptoSubtleApi} from "../CryptoUtils";

/**
 * Import the provided document AES key bytes into a web CryptoKey
 */
function importAesKey(aesKey: Uint8Array | CryptoKey) {
    if (aesKey instanceof Uint8Array) {
        return Future.tryP(() => getCryptoSubtleApi().importKey("raw", aesKey, "AES-GCM", false, ["encrypt", "decrypt"]));
    }
    return Future.of(aesKey);
}

/**
 * Encrypts the provided data with the derivedKey and IV
 * @param {Uint8Array} data       Data to encrypt
 * @param {CryptoKey}  derivedKey Web CryptoKey used to encrypt datda
 * @param {Uint8Array} iv         IV to use
 */
function aesEncrypt(data: Uint8Array, derivedKey: CryptoKey, iv: Uint8Array) {
    return Future.tryP(() => {
        return getCryptoSubtleApi().encrypt(
            {
                name: "AES-GCM",
                iv,
                tagLength: 128,
            },
            derivedKey,
            data
        );
    });
}

/**
 * Decrypts the provided data with the derived key and IV
 * @param {Uint8Array} encryptedData Data to decrypt
 * @param {CryptoKey}  key           Web CryptoKey used to encrypt data
 * @param {Uint8Array} iv            IV to use
 */
function aesDecrypt(encryptedData: Uint8Array, key: CryptoKey, iv: Uint8Array) {
    return Future.tryP(() => {
        return getCryptoSubtleApi().decrypt(
            {
                name: "AES-GCM",
                iv,
                tagLength: 128,
            },
            key,
            encryptedData
        );
    });
}

/**
 * Given the users private key, passcode derived key, and salt, encrypt the key and return it as a concated byte
 * array of salt, IV and encrypted key
 * @param {Uint8Array} userPrivateKey Users decrypted user key
 * @param {CryptoKey}  derivedKey     Users passcode-derived key
 * @param {Uint8Array} salt           Salt that was used to derive passcode key
 */
export function encryptUserKey(userPrivateKey: Uint8Array, derivedKey: CryptoKey, salt: Uint8Array, iv: Uint8Array) {
    return aesEncrypt(userPrivateKey, derivedKey, iv).map((encryptedKey) => concatArrayBuffers(salt, iv, new Uint8Array(encryptedKey)));
}

/**
 * Given a users encrypted private key and derived passcode key, decrypt the private key
 * @param {string}   userPrivateKey Users encrypted private key
 * @param {Function} derivedKey     Users passcode-derived key
 */
export function decryptUserKey(userPrivateKey: Uint8Array, derivedKey: CryptoKey) {
    const userKeyIV = sliceArrayBuffer(userPrivateKey, SALT_LENGTH, IV_LENGTH + SALT_LENGTH);
    const userPrivateKeyBytes = sliceArrayBuffer(userPrivateKey, SALT_LENGTH + IV_LENGTH);

    return aesDecrypt(userPrivateKeyBytes, derivedKey, userKeyIV).map((decryptedPrivateKey) => new Uint8Array(decryptedPrivateKey));
}

/**
 * Encrypt the provided document with the provided symmetric key and IV
 * @param {Uint8Array}           decryptedDocument    Document to encrypt
 * @param {Uint8Array|CryptoKey} documentSymmetricKey Symmetric key to use to encrypt
 * @param {Uint8Array}           iv                   IV to use during encryption
 */
export function encryptDocument(decryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array | CryptoKey, iv: Uint8Array) {
    return importAesKey(documentSymmetricKey)
        .flatMap((cryptoKey) => aesEncrypt(decryptedDocument, cryptoKey, iv))
        .map((encryptedData) => ({
            iv,
            content: new Uint8Array(encryptedData),
        }));
}

/**
 * Decrypt the provided document with the provided symmetric key and IV
 * @param {Uint8Array}           encryptedDocument    Document to decrypt
 * @param {Uint8Array|CryptoKey} documentSymmetricKey Symmetric key to decrypt document
 * @param {Uint8Array}           iv                   IV to decrypt document
 */
export function decryptDocument(encryptedDocument: Uint8Array, documentSymmetricKey: Uint8Array | CryptoKey, iv: Uint8Array) {
    return importAesKey(documentSymmetricKey)
        .flatMap((cryptoKey) => aesDecrypt(encryptedDocument, cryptoKey, iv))
        .map((decryptedData) => new Uint8Array(decryptedData));
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
    return importAesKey(symmetricKey)
        .flatMap((cryptoKey) => {
            return Future.gather2(encryptDocument(devicePrivateKey, cryptoKey, iv), encryptDocument(signingPrivateKey, cryptoKey, iv));
        })
        .map(([encryptedDeviceKey, encryptedSigningKey]) => ({
            iv,
            symmetricKey,
            encryptedDeviceKey: encryptedDeviceKey.content,
            encryptedSigningKey: encryptedSigningKey.content,
        }));
}

/**
 * Decrypt the users private device and signing keys using the provided symmetric key and IV
 * @param {Uint8Array} devicePrivateKey  Users device private key
 * @param {Uint8Array} signingPrivateKey Users signing private key
 * @param {Uint8Array} symmetricKey      Symmetric key to use for encryption
 * @param {Uint8Array} iv                IV to use for encryption
 */
export function decryptDeviceAndSigningKeys(devicePrivateKey: Uint8Array, signingPrivateKey: Uint8Array, symmetricKey: Uint8Array, iv: Uint8Array) {
    return importAesKey(symmetricKey)
        .flatMap((cryptoKey) => {
            return Future.gather2(decryptDocument(devicePrivateKey, cryptoKey, iv), decryptDocument(signingPrivateKey, cryptoKey, iv));
        })
        .map(([deviceKey, signingKey]) => ({deviceKey, signingKey}));
}

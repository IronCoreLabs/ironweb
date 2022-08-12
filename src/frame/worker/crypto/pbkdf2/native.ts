import Future from "futurejs";
import {getCryptoSubtleApi} from "../CryptoUtils";
import {CryptoConstants} from "../../../../Constants";
const {PBKDF2_ITERATIONS} = CryptoConstants;

/**
 * Import the provided passcode bytes into a web CryptoKey
 * @param {Uint8Array} passcode Bytes of passcode to convert to key
 */
function importPasscodeKey(passcode: Uint8Array) {
    return Future.tryP(() => getCryptoSubtleApi().importKey("raw", passcode, "PBKDF2", false, ["deriveKey"]));
}

/**
 * Create a derived AES key from the imported passcode CryptoKey. Uses PBKDF2 with the provided salt to convert the imported CryptoKey
 * @param {CryptoKey}  key  Imported key from passcode
 * @param {Uint8Array} salt Salt to use during key derivation
 */
function deriveKey(key: CryptoKey, salt: Uint8Array) {
    return Future.tryP(() => {
        return getCryptoSubtleApi().deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: PBKDF2_ITERATIONS,
                hash: {name: "SHA-256"},
            },
            key,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        );
    });
}

/**
 * Given a passcode, derive a key from it that can be used to encrypt the users private key
 * @param  {Uint8Array} passcode Users passcode that has been converted into bytes
 * @param  {Uint8Array} salt     Salt to use for key derivation
 * @return {Future}              A future that can be used to consume the derived key
 */
export function generatePasscodeDerivedKey(passcode: Uint8Array, salt: Uint8Array) {
    return importPasscodeKey(passcode).flatMap((importedKey) => deriveKey(importedKey, salt));
}

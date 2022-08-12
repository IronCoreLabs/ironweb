import {codec, hash, misc, BitArray} from "sjcl";
import {fromByteArray, toByteArray} from "base64-js";
import Future from "futurejs";
import {CryptoConstants} from "../../../../Constants";
import {generateRandomBytes} from "../CryptoUtils";

/**
 * SHA256 hashing method that is provided to SJCL
 */
function hmacSHA256(this: {encrypt: () => BitArray}, key: sjcl.BitArray) {
    const hasher = new misc.hmac(key, hash.sha256);
    /* eslint-disable prefer-spread */
    this.encrypt = (...data: BitArray[]) => hasher.encrypt.apply(hasher, data as [BitArray]);
    /* eslint-disable prefer-spread */
}

/**
 * Use SJCL to generate a PBKDF2 derived key from the provided passcode and salt
 */
export function generatePasswordDerivedKey(password: string, saltUsedDuringPriorDerivation?: Uint8Array) {
    const saltGeneration = saltUsedDuringPriorDerivation ? Future.of(saltUsedDuringPriorDerivation) : generateRandomBytes(CryptoConstants.SALT_LENGTH);

    return saltGeneration.map((salt) => {
        const saltAsBits = codec.base64.toBits(fromByteArray(salt));
        const keyAsBits = misc.pbkdf2(password, saltAsBits, CryptoConstants.PBKDF2_ITERATIONS, 256, hmacSHA256 as any);
        return {
            key: toByteArray(codec.base64.fromBits(keyAsBits)),
            salt,
        };
    });
}

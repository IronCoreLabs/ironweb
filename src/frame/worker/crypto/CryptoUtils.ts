import Future from "futurejs";

const nativeCrypto: Crypto = (self as any).crypto;

/**
 * Wrapper around the possibly prefixed crypto subtle API to use.
 */
export function getCryptoSubtleApi(): SubtleCrypto {
    return nativeCrypto && nativeCrypto.subtle;
}

/**
 * Generate random bytes, wrapped in a Future. 
 * @param {number} size Number of bytes to generate
 */
export function generateRandomBytes(size: number): Future<Error, Uint8Array> {
        return Future.of(nativeCrypto.getRandomValues(new Uint8Array(size)))
}

import * as TestUtils from "./TestUtils";

/**
 * Karma/Jasmine (or any other unit tests framework probably) can't support WebAssembly. So we mock out our Recrypt binding dependency and
 * replace it with this mock which just returns empty values for most things. This mock is put in place within the karam.conf.js file ~ line 60.
 */
export class Api256 {
    generateKeyPair() {
        return {
            privateKey: new Uint8Array(32),
            publicKey: {
                x: new Uint8Array(32),
                y: new Uint8Array(32),
            },
        };
    }

    generateEd25519KeyPair() {
        return TestUtils.getSigningKeyPair();
    }

    computeEd25519PublicKey() {
        return new Uint8Array(32);
    }

    generatePlaintext() {
        return new Uint8Array(384);
    }

    deriveSymmetricKey() {
        return this.hash256();
    }

    hash256() {
        return new Uint8Array(32);
    }

    computePublicKey() {
        return {
            x: new Uint8Array(32),
            y: new Uint8Array(32),
        };
    }

    generateTransformKey() {
        return TestUtils.getTransformKey();
    }

    encrypt() {
        return TestUtils.getEncryptedSymmetricKey();
    }

    decrypt() {
        return new Uint8Array(55);
    }

    ed25519Sign() {
        return new Uint8Array(64);
    }

    schnorrSign() {
        return new Uint8Array(64);
    }
}
export function transformKeyToBytes256() {
    return new Uint8Array(672);
}
export function pbkdf2SHA256() {
    return new Uint8Array(32);
}

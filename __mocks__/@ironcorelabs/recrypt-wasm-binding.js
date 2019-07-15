/**
 * Jest/Jasmine (or any other unit tests framework probably) can't support WebAssembly. So we mock out our Recrypt binding dependency and
 * replace it with this mock which just returns empty values for most things. This mock is automatically consumed by Jest given its location
 */
exports.Api256 = class Api256 {
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
        return {
            privateKey: new Uint8Array(64),
            publicKey: new Uint8Array(32),
        };
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
        return {
            ephemeralPublicKey: {
                x: new Uint8Array(32),
                y: new Uint8Array(32),
            },
            toPublicKey: {
                x: new Uint8Array(32),
                y: new Uint8Array(32),
            },
            encryptedTempKey: new Uint8Array(384),
            hashedTempKey: new Uint8Array(128),
            publicSigningKey: new Uint8Array(32),
            signature: new Uint8Array(64),
        };
    }

    encrypt() {
        return {
            encryptedMessage:
                "A07omAmqXrgQafLY3OW4H0oZXysTYtTyf+tY67SKu1UUnvBeHceh8Nn5CqTFu4kxTChQ2ep8+OcnSDEMP6VVf47SQ6O2ZkBpVENes+aHtY5s12hHOag9raaZp6AfMmcJBw70jt5pWDBUid253Ky16lt3p7RoMK1um5hPFcYZr412PsMSY92wdNmhdByLgkXVLqFnQTC5mVsr207xkadqI3LU8YP2a990TBJSxsorSY6bIy+HADcoVLQW/XkU5T+0Fb09coQnAhSLnBDP8NdnylNws9pIIYhyHAwEIxifAMltUD/Jq9luxoKA1bZThe0/ZZZGnX3COZEkvtrYIp/xLHG/xRkBr7eSxSkTR8xIZTFywz5kFxLQYhxnTzR5VmsoK5vTKqKBVmHmU1LyOktbUhV+HNYNP8BiUhQypBLGvyNMhwPEvsTRtc50Qa0kMwxhWSPrKnqPWUFzB1jML+p8TlBHECTIsOjCTLpDQMgth2vfsMA2Uv9gHfu982L3zX7F",
            ephemeralPublicKey: {
                x: "H3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKU=",
                y: "Alm3/nVs6d/mmoBZ28EL3NEKUCB66GsCRBmxRZjjT9U=",
            },
            authHash:
                "H3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUPH3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUPH3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUPH3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUP",
            publicSigningKey: "H3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKU=",
            signature: "H3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUPH3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKUP",
        };
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
};
exports.transformKeyToBytes256 = () => new Uint8Array(672);
exports.pbkdf2SHA256 = () => new Uint8Array(32);

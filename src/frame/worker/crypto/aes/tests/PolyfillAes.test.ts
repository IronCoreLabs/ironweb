import * as PolyfillAes from "../PolyfillAes";

describe("PolyfillAes", () => {
    describe("encryptUserKey", () => {
        it("encrypts users private key", (done) => {
            const key = new Uint8Array(32);
            const derivedKey = new Uint8Array(32);
            const salt = new Uint8Array(32);
            const iv = new Uint8Array(12);
            PolyfillAes.encryptUserKey(key, derivedKey, salt, iv).engage(
                () => done("encrypting users keys should not reject"),
                (encryptedKey: any) => {
                    expect(encryptedKey).toEqual(expect.any(Uint8Array));
                    expect(encryptedKey.length).toEqual(92);

                    done();
                }
            );
        });
    });

    describe("decryptUserKey", () => {
        it("returns decrypted key on success", (done) => {
            const userKey = new Uint8Array([98]);
            const derivedKey = new Uint8Array(32);
            const iv = new Uint8Array(12);

            PolyfillAes.encryptUserKey(userKey, derivedKey, new Uint8Array(32), iv)
                .flatMap((encryptedKey) => {
                    return PolyfillAes.decryptUserKey(encryptedKey, derivedKey);
                })
                .engage(
                    () => done("decrypting keys should not fail"),
                    (decryptedKey) => {
                        expect(decryptedKey).toEqual(userKey);
                        done();
                    }
                );
        });
    });

    describe("encryptDocument", () => {
        it("encrypts document and maps result to expected document output", () => {
            const providedIV = new Uint8Array(12);
            PolyfillAes.encryptDocument(new Uint8Array([93]), new Uint8Array(32), providedIV).engage(
                () => {
                    throw new Error("AES decryption should not fail");
                },
                (encryptedData) => {
                    const {iv, content} = encryptedData;
                    expect(iv).toEqual(providedIV);
                    expect(content).toEqual(new Uint8Array([147, 214, 118, 139, 13, 65, 92, 111, 244, 176, 10, 156, 245, 229, 15, 57, 6]));
                }
            );
        });
    });

    describe("decryptDocument", () => {
        it("decrypts document and returns byte array results", () => {
            PolyfillAes.decryptDocument(
                new Uint8Array([147, 214, 118, 139, 13, 65, 92, 111, 244, 176, 10, 156, 245, 229, 15, 57, 6]),
                new Uint8Array(32),
                new Uint8Array(12)
            ).engage(
                () => {
                    throw new Error("AES decryption should not fail");
                },
                (encryptedData) => {
                    expect(encryptedData).toEqual(new Uint8Array([93]));
                }
            );
        });
    });

    describe("encryptDeviceAndSigningKeys", () => {
        it("encrypts the two keys with the provided sym key and iv", (done) => {
            const deviceKey = new Uint8Array([35, 80]);
            const signingKey = new Uint8Array([73, 33, 89]);
            const symKey = new Uint8Array(32);
            const providedIV = new Uint8Array(12);

            PolyfillAes.encryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, providedIV).engage(
                () => done("AES encryption of keys should not fail"),
                (encryptedKeys) => {
                    expect(encryptedKeys).toEqual({
                        iv: providedIV,
                        symmetricKey: symKey,
                        encryptedDeviceKey: new Uint8Array([237, 247, 80, 81, 206, 50, 195, 202, 27, 37, 46, 249, 68, 150, 15, 37, 65, 182]),
                        encryptedSigningKey: new Uint8Array([135, 134, 25, 146, 165, 113, 127, 5, 215, 159, 166, 161, 122, 200, 192, 117, 146, 202, 178]),
                    });
                    done();
                }
            );
        });
    });

    describe("decryptDeviceAndSigningKeys", () => {
        it("decypts the provided keys", (done) => {
            const deviceKey = new Uint8Array([237, 247, 80, 81, 206, 50, 195, 202, 27, 37, 46, 249, 68, 150, 15, 37, 65, 182]);
            const signingKey = new Uint8Array([135, 134, 25, 146, 165, 113, 127, 5, 215, 159, 166, 161, 122, 200, 192, 117, 146, 202, 178]);
            const symKey = new Uint8Array(32);
            const iv = new Uint8Array(12);

            PolyfillAes.decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, iv).engage(
                () => done("AES decryption of keys should not fail"),
                (encryptedKeys) => {
                    expect(encryptedKeys).toEqual({
                        deviceKey: new Uint8Array([35, 80]),
                        signingKey: new Uint8Array([73, 33, 89]),
                    });
                    done();
                }
            );
        });
    });
});

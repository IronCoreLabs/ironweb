import * as NativeAes from "../NativeAes";

describe("NativeAes", () => {
    const crypto = window.crypto as any;
    const wcImportKey = crypto.subtle.importKey;
    const wcDeriveKey = crypto.subtle.deriveKey;
    const wcEncrypt = crypto.subtle.encrypt;
    const wcDecrypt = crypto.subtle.decrypt;

    beforeEach(() => {
        crypto.subtle.importKey = jasmine.createSpy("nativeImportKey").and.returnValue(Promise.resolve("CryptoKey"));
        crypto.subtle.deriveKey = jasmine.createSpy("nativeDeriveKey").and.returnValue(Promise.resolve("derivedKey"));
        crypto.subtle.encrypt = jasmine.createSpy("nativeEncrypt").and.returnValue(Promise.resolve(new Uint8Array([93, 82, 72])));
        crypto.subtle.decrypt = jasmine.createSpy("nativeDecrypt").and.returnValue(Promise.resolve(new Uint8Array([87, 70, 62])));
    });

    afterEach(() => {
        crypto.subtle.importKey = wcImportKey;
        crypto.subtle.deriveKey = wcDeriveKey;
        crypto.subtle.encrypt = wcEncrypt;
        crypto.subtle.decrypt = wcDecrypt;
    });

    describe("encryptUserKey", () => {
        it("should call native encrypt API", (done) => {
            const userKey = new Uint8Array([35, 23]);
            const salt = new Uint8Array(32);
            const iv = new Uint8Array(12);

            NativeAes.encryptUserKey(userKey, "derivedKey" as any, salt, iv).engage(
                (e) => fail(e),
                (userPrivateKey: any) => {
                    expect(userPrivateKey.length).toEqual(47);
                    //Last bytes should be result from mock encrypt result we returned above
                    expect(userPrivateKey[44]).toEqual(93);
                    expect(userPrivateKey[45]).toEqual(82);
                    expect(userPrivateKey[46]).toEqual(72);

                    expect(crypto.subtle.encrypt).toHaveBeenCalledWith(jasmine.any(Object), "derivedKey", userKey);
                    done();
                }
            );
        });
    });

    describe("decryptUserKey", () => {
        it("should call native decrypt API to decrypt data", (done) => {
            const userKey = new Uint8Array(47);

            NativeAes.decryptUserKey(userKey, "derivedKey" as any).engage(
                () => fail("decrypting key pair should not fail"),
                (decryptedKey: any) => {
                    expect(decryptedKey.length).toEqual(3);
                    //Bytes should be result from mock encrypt result we returned above
                    expect(decryptedKey[0]).toEqual(87);
                    expect(decryptedKey[1]).toEqual(70);
                    expect(decryptedKey[2]).toEqual(62);

                    expect(crypto.subtle.decrypt).toHaveBeenCalledWith(jasmine.any(Object), "derivedKey", jasmine.any(Uint8Array));

                    done();
                }
            );
        });
    });

    describe("encryptDocument", () => {
        it("should import key and encrypt data and map output to encrypted document", (done) => {
            const doc = new Uint8Array(40);
            const providedIV = new Uint8Array(12);

            NativeAes.encryptDocument(doc, new Uint8Array(32), providedIV).engage(
                () => fail("AES encryption should not fail"),
                (encryptedDocumentResult) => {
                    const {iv, content} = encryptedDocumentResult;
                    expect(iv).toEqual(providedIV);
                    expect(content).toEqual(new Uint8Array([93, 82, 72]));

                    expect(crypto.subtle.importKey).toHaveBeenCalled();
                    expect(crypto.subtle.encrypt).toHaveBeenCalledWith(jasmine.any(Object), "CryptoKey", doc);

                    done();
                }
            );
        });
    });

    describe("decryptDocument", () => {
        it("should import key and encrypt data and map output to byte array", (done) => {
            const doc = new Uint8Array(40);
            const iv = new Uint8Array(12);

            NativeAes.decryptDocument(doc, new Uint8Array(32), iv).engage(
                () => fail("AES decryption should not fail"),
                (decryptedDocument) => {
                    expect(decryptedDocument).toEqual(new Uint8Array([87, 70, 62]));
                    expect(crypto.subtle.importKey).toHaveBeenCalled();
                    expect(crypto.subtle.decrypt).toHaveBeenCalledWith(jasmine.any(Object), "CryptoKey", doc);
                    done();
                }
            );
        });
    });

    describe("encryptDeviceAndSigningKeys", () => {
        it("encrypts the two keys with the provided sym key and iv", (done) => {
            const deviceKey = new Uint8Array(6);
            const signingKey = new Uint8Array(10);
            const symKey = new Uint8Array(32);
            const iv = new Uint8Array(12);

            NativeAes.encryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, iv).engage(
                () => fail("AES encryption of keys should not fail"),
                (encryptedKeys) => {
                    expect(encryptedKeys).toEqual({
                        iv,
                        symmetricKey: symKey,
                        encryptedDeviceKey: new Uint8Array([93, 82, 72]),
                        encryptedSigningKey: new Uint8Array([93, 82, 72]),
                    });
                    done();
                }
            );
        });
    });

    describe("decryptDeviceAndSigningKeys", () => {
        it("decypts the provided keys", (done) => {
            const deviceKey = new Uint8Array(8);
            const signingKey = new Uint8Array(10);
            const symKey = new Uint8Array(32);
            const iv = new Uint8Array(12);

            NativeAes.decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, iv).engage(
                () => fail("AES decryption of keys should not fail"),
                (encryptedKeys) => {
                    expect(encryptedKeys).toEqual({
                        deviceKey: new Uint8Array([87, 70, 62]),
                        signingKey: new Uint8Array([87, 70, 62]),
                    });
                    done();
                }
            );
        });
    });
});

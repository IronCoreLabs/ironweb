import {decryptUserKey, encryptUserKey, encryptDocument, decryptDocument, encryptDeviceAndSigningKeys, decryptDeviceAndSigningKeys} from "../index";
import * as NativeAes from "../NativeAes";
import * as PolyfillAes from "../PolyfillAes";
import Future from "futurejs";
import {CryptoConstants} from "../../../../../Constants";

describe("AES", () => {
    describe("decryptPrivateKeys", () => {
        it("uses native API if provided derived key is not a byte array", (done) => {
            jest.spyOn(NativeAes, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted keys"));
            jest.spyOn(PolyfillAes, "decryptUserKey");

            decryptUserKey(new Uint8Array([]), {key: "CryptoKey", salt: new Uint8Array(32)} as any).engage(
                () => fail("should not fail to decrypt keys when using native API"),
                (keys: any) => {
                    expect(keys).toEqual("decrypted keys");
                    expect(PolyfillAes.decryptUserKey).not.toHaveBeenCalled();
                    done();
                }
            );
        });

        it("uses polyfill if derived key is a byte array", (done) => {
            jest.spyOn(NativeAes, "decryptUserKey");
            jest.spyOn(PolyfillAes, "decryptUserKey").mockReturnValue(Future.of<any>("polyfill decrypted keys"));

            decryptUserKey(new Uint8Array([]), {key: new Uint8Array(32), salt: new Uint8Array(32)}).engage(
                () => fail("should not fail to decrypt keys when using polyfill API"),
                (keys: any) => {
                    expect(keys).toEqual("polyfill decrypted keys");
                    expect(NativeAes.decryptUserKey).not.toHaveBeenCalled();
                    done();
                }
            );
        });
    });

    describe("encryptUserKey", () => {
        it("uses native API if provided derived key is not a byte array", (done) => {
            jest.spyOn(NativeAes, "encryptUserKey").mockReturnValue(Future.of<any>("encrypted keys"));
            jest.spyOn(PolyfillAes, "encryptUserKey");

            encryptUserKey(new Uint8Array([]), {key: "CryptoKey", salt: new Uint8Array(32)} as any).engage(
                () => fail("should not fail to encrypt keys when using native API"),
                (keys: any) => {
                    expect(keys).toEqual("encrypted keys");
                    expect(PolyfillAes.encryptUserKey).not.toHaveBeenCalled();
                    done();
                }
            );
        });

        it("uses polyfill if derived key is a byte array", (done) => {
            jest.spyOn(NativeAes, "encryptUserKey");
            jest.spyOn(PolyfillAes, "encryptUserKey").mockReturnValue(Future.of<any>("polyfill encrypted keys"));

            encryptUserKey(new Uint8Array([]), {key: new Uint8Array(32), salt: new Uint8Array(32)}).engage(
                () => fail("should not fail to encrypt keys when using polyfill API"),
                (keys: any) => {
                    expect(keys).toEqual("polyfill encrypted keys");
                    expect(NativeAes.encryptUserKey).not.toHaveBeenCalled();
                    done();
                }
            );
        });
    });

    describe("encryptDocument", () => {
        it("uses native API if available", () => {
            jest.spyOn(NativeAes, "encryptDocument").mockReturnValue(Future.of<any>({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(NativeAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, expect.any(Uint8Array));
                }
            );
        });

        it("uses polyfill API if native is not available", () => {
            jest.spyOn(PolyfillAes, "encryptDocument").mockReturnValue(Future.of<any>({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, expect.any(Uint8Array));
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            jest.spyOn(NativeAes, "encryptDocument").mockReturnValue(Future.reject(new Error("forced failure")));
            jest.spyOn(PolyfillAes, "encryptDocument").mockReturnValue(Future.of<any>({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, expect.any(Uint8Array));
                    expect(NativeAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, expect.any(Uint8Array));
                }
            );
        });
    });

    describe("decryptDocument", () => {
        it("uses native API if available", () => {
            jest.spyOn(NativeAes, "decryptDocument").mockReturnValue(Future.of<any>({foo: "bar"}));

            const doc = new Uint8Array(40);
            const symKey = new Uint8Array(32);
            const nonce = new Uint8Array(12);

            decryptDocument(doc, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            jest.spyOn(PolyfillAes, "decryptDocument").mockReturnValue(Future.of<any>({foo: "bar"}));
            jest.spyOn(NativeAes, "decryptDocument").mockReturnValue(Future.reject(new Error("forced failure")));

            const doc = new Uint8Array(40);
            const symKey = new Uint8Array(32);
            const nonce = new Uint8Array(12);

            decryptDocument(doc, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                    expect(NativeAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                }
            );
        });

        it("doesnt try polyfill if native fails because decryption failed", () => {
            jest.spyOn(PolyfillAes, "decryptDocument");
            const incorrectKeyError = new Error("");
            incorrectKeyError.name = CryptoConstants.NATIVE_DECRYPT_FAILURE_ERROR;
            jest.spyOn(NativeAes, "decryptDocument").mockReturnValue(Future.reject(incorrectKeyError));

            const doc = new Uint8Array(40);
            const symKey = new Uint8Array(32);
            const nonce = new Uint8Array(12);

            decryptDocument(doc, symKey, nonce).engage(
                (e) => {
                    expect(PolyfillAes.decryptDocument).not.toHaveBeenCalled();
                    expect(NativeAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                    expect(e.message).toEqual("Decryption of document content failed.");
                },
                () => fail("should fail when native decryption fails because of incorrect key")
            );
        });
    });

    describe("encryptDeviceAndSigningKeys", () => {
        it("uses native API if available", () => {
            jest.spyOn(NativeAes, "encryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, expect.any(Uint8Array), expect.any(Uint8Array));
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            jest.spyOn(PolyfillAes, "encryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({foo: "bar"}));
            jest.spyOn(NativeAes, "encryptDeviceAndSigningKeys").mockReturnValue(Future.reject(new Error("forced failure")));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, expect.any(Uint8Array), expect.any(Uint8Array));
                    expect(NativeAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, expect.any(Uint8Array), expect.any(Uint8Array));
                }
            );
        });
    });

    describe("decryptDeviceAndSigningKeys", () => {
        it("uses native API if available", () => {
            jest.spyOn(NativeAes, "decryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);
            const symKey = new Uint8Array(30);
            const nonce = new Uint8Array(12);

            decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, symKey, nonce);
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            jest.spyOn(PolyfillAes, "decryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({foo: "bar"}));
            jest.spyOn(NativeAes, "decryptDeviceAndSigningKeys").mockReturnValue(Future.reject(new Error("forced failure")));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);
            const symKey = new Uint8Array(30);
            const nonce = new Uint8Array(12);

            decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, symKey, nonce);
                    expect(NativeAes.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, symKey, nonce);
                }
            );
        });
    });
});

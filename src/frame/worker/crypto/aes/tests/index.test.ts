import {decryptUserKey, encryptUserKey, encryptDocument, decryptDocument, encryptDeviceAndSigningKeys, decryptDeviceAndSigningKeys} from "../index";
import * as NativeAes from "../NativeAes";
import * as CryptoUtils from "../../CryptoUtils";
import * as PolyfillAes from "../PolyfillAes";
import Future from "futurejs";
import {CryptoConstants} from "../../../../../Constants";

describe("AES", () => {
    describe("decryptPrivateKeys", () => {
        it("uses native API if provided derived key is not a byte array", (done) => {
            spyOn(NativeAes, "decryptUserKey").and.returnValue(Future.of("decrypted keys"));
            spyOn(PolyfillAes, "decryptUserKey");

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
            spyOn(NativeAes, "decryptUserKey");
            spyOn(PolyfillAes, "decryptUserKey").and.returnValue(Future.of("polyfill decrypted keys"));

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
            spyOn(NativeAes, "encryptUserKey").and.returnValue(Future.of("encrypted keys"));
            spyOn(PolyfillAes, "encryptUserKey");

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
            spyOn(NativeAes, "encryptUserKey");
            spyOn(PolyfillAes, "encryptUserKey").and.returnValue(Future.of("polyfill encrypted keys"));

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
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(NativeAes, "encryptDocument").and.returnValue(Future.of({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(NativeAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, jasmine.any(Uint8Array));
                }
            );
        });

        it("uses polyfill API if native is not available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(false);
            spyOn(PolyfillAes, "encryptDocument").and.returnValue(Future.of({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, jasmine.any(Uint8Array));
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(NativeAes, "encryptDocument").and.returnValue(Future.reject(new Error("forced failure")));
            spyOn(PolyfillAes, "encryptDocument").and.returnValue(Future.of({foo: "bar"}));

            const document = new Uint8Array(40);
            const docSymKey = new Uint8Array(32);

            encryptDocument(document, docSymKey).engage(
                () => fail("document encryption should not fail"),
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, jasmine.any(Uint8Array));
                    expect(NativeAes.encryptDocument).toHaveBeenCalledWith(document, docSymKey, jasmine.any(Uint8Array));
                }
            );
        });
    });

    describe("decryptDocument", () => {
        it("uses native API if available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(NativeAes, "decryptDocument").and.returnValue(Future.of({foo: "bar"}));

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

        it("uses polyfill API if native is not available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(false);
            spyOn(PolyfillAes, "decryptDocument").and.returnValue(Future.of({foo: "bar"}));

            const doc = new Uint8Array(40);
            const symKey = new Uint8Array(32);
            const nonce = new Uint8Array(12);

            decryptDocument(doc, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(PolyfillAes, "decryptDocument").and.returnValue(Future.of({foo: "bar"}));
            spyOn(NativeAes, "decryptDocument").and.returnValue(Future.reject(new Error("forced failure")));

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
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(PolyfillAes, "decryptDocument");
            const incorrectKeyError = new Error("");
            incorrectKeyError.name = CryptoConstants.NATIVE_DECRYPT_FAILURE_ERROR;
            spyOn(NativeAes, "decryptDocument").and.returnValue(Future.reject(incorrectKeyError));

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
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(NativeAes, "encryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, jasmine.any(Uint8Array), jasmine.any(Uint8Array));
                }
            );
        });

        it("uses polyfill API if native is not available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(false);
            spyOn(PolyfillAes, "encryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(
                        deviceKey,
                        signingKey,
                        jasmine.any(Uint8Array),
                        jasmine.any(Uint8Array)
                    );
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(PolyfillAes, "encryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));
            spyOn(NativeAes, "encryptDeviceAndSigningKeys").and.returnValue(Future.reject(new Error("forced failure")));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(
                        deviceKey,
                        signingKey,
                        jasmine.any(Uint8Array),
                        jasmine.any(Uint8Array)
                    );
                    expect(NativeAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, jasmine.any(Uint8Array), jasmine.any(Uint8Array));
                }
            );
        });
    });

    describe("decryptDeviceAndSigningKeys", () => {
        it("uses native API if available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(NativeAes, "decryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));

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

        it("uses polyfill API if native is not available", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(false);
            spyOn(PolyfillAes, "decryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);
            const symKey = new Uint8Array(30);
            const nonce = new Uint8Array(12);

            decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, nonce).engage(
                () => fail("document decryption should not fail"),
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(PolyfillAes.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, symKey, nonce);
                }
            );
        });

        it("falls back to polyfill API if native fails", () => {
            spyOn(CryptoUtils, "isNativeCryptoSupported").and.returnValue(true);
            spyOn(PolyfillAes, "decryptDeviceAndSigningKeys").and.returnValue(Future.of({foo: "bar"}));
            spyOn(NativeAes, "decryptDeviceAndSigningKeys").and.returnValue(Future.reject(new Error("forced failure")));

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

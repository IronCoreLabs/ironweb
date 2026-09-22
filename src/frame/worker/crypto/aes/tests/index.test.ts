import {decryptUserKey, encryptUserKey, encryptDocument, decryptDocument, encryptDeviceAndSigningKeys, decryptDeviceAndSigningKeys, generateKeyAndIvs} from "../index";
import * as NativeAes from "../NativeAes";
import * as CryptoUtils from "../../CryptoUtils";
import Future from "futurejs";
import {CryptoConstants} from "../../../../../Constants";

describe("AES", () => {
    describe("decryptUserKey", () => {
        it("decrypts with the derived CryptoKey", (done) => {
            jest.spyOn(NativeAes, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted keys"));

            decryptUserKey(new Uint8Array([]), {key: "CryptoKey", salt: new Uint8Array(32)} as any).engage(
                () => done("should not fail to decrypt keys"),
                (keys: any) => {
                    expect(keys).toEqual("decrypted keys");
                    expect(NativeAes.decryptUserKey).toHaveBeenCalledWith(new Uint8Array([]), "CryptoKey");
                    done();
                }
            );
        });
    });

    describe("encryptUserKey", () => {
        it("encrypts with the derived CryptoKey and a fresh IV", (done) => {
            jest.spyOn(NativeAes, "encryptUserKey").mockReturnValue(Future.of<any>("encrypted keys"));
            const salt = new Uint8Array(32);

            encryptUserKey(new Uint8Array([]), {key: "CryptoKey", salt} as any).engage(
                () => done("should not fail to encrypt keys"),
                (keys: any) => {
                    expect(keys).toEqual("encrypted keys");
                    expect(NativeAes.encryptUserKey).toHaveBeenCalledWith(new Uint8Array([]), "CryptoKey", salt, expect.any(Uint8Array));
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
                () => {
                    throw new Error("document encryption should not fail");
                },
                (doc: any) => {
                    expect(doc).toEqual({foo: "bar"});
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
                () => {
                    throw new Error("document decryption should not fail");
                },
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                }
            );
        });

        it("passes through non-decryption errors", () => {
            const error = new Error("forced failure");
            jest.spyOn(NativeAes, "decryptDocument").mockReturnValue(Future.reject(error));

            decryptDocument(new Uint8Array(40), new Uint8Array(32), new Uint8Array(12)).engage(
                (e) => {
                    expect(e).toBe(error);
                },
                () => {
                    throw new Error("should fail when native decryption fails");
                }
            );
        });

        it("maps native decryption failure to a document error", () => {
            const incorrectKeyError = new Error("");
            incorrectKeyError.name = CryptoConstants.NATIVE_DECRYPT_FAILURE_ERROR;
            jest.spyOn(NativeAes, "decryptDocument").mockReturnValue(Future.reject(incorrectKeyError));

            const doc = new Uint8Array(40);
            const symKey = new Uint8Array(32);
            const nonce = new Uint8Array(12);

            decryptDocument(doc, symKey, nonce).engage(
                (e) => {
                    expect(NativeAes.decryptDocument).toHaveBeenCalledWith(doc, symKey, nonce);
                    expect(e.message).toEqual("Decryption of document content failed.");
                },
                () => {
                    throw new Error("should fail when native decryption fails because of incorrect key");
                }
            );
        });
    });

    describe("encryptDeviceAndSigningKeys", () => {
        it("uses native API if available", () => {
            jest.spyOn(NativeAes, "encryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({foo: "bar"}));

            const deviceKey = new Uint8Array(40);
            const signingKey = new Uint8Array(32);

            encryptDeviceAndSigningKeys(deviceKey, signingKey).engage(
                () => {
                    throw new Error("document decryption should not fail");
                },
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(
                        deviceKey,
                        signingKey,
                        expect.any(Uint8Array),
                        expect.any(Uint8Array),
                        expect.any(Uint8Array)
                    );
                }
            );
        });
    });

    describe("generateKeyAndIvs", () => {
        it("slices random bytes into symmetricKey [0..32), deviceIv [32..44), signingIv [44..56)", (done) => {
            // Create a 56-byte sequence where each byte equals its index
            const mockBytes = new Uint8Array(CryptoConstants.AES_SYMMETRIC_KEY_LENGTH + CryptoConstants.IV_LENGTH * 2);
            for (let i = 0; i < mockBytes.length; i++) {
                mockBytes[i] = i;
            }
            jest.spyOn(CryptoUtils, "generateRandomBytes").mockReturnValue(Future.of(mockBytes));

            generateKeyAndIvs().engage(
                (e) => done(e),
                ({symmetricKey, deviceIv, signingIv}) => {
                    const {AES_SYMMETRIC_KEY_LENGTH: KEY, IV_LENGTH: IV} = CryptoConstants;
                    expect(symmetricKey).toEqual(mockBytes.slice(0, KEY));
                    expect(deviceIv).toEqual(mockBytes.slice(KEY, KEY + IV));
                    expect(signingIv).toEqual(mockBytes.slice(KEY + IV, KEY + IV * 2));
                    done();
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
            const deviceIv = new Uint8Array(12);
            const signingIv = new Uint8Array(12);

            decryptDeviceAndSigningKeys(deviceKey, signingKey, symKey, deviceIv, signingIv).engage(
                () => {
                    throw new Error("document decryption should not fail");
                },
                (decryptedDoc: any) => {
                    expect(decryptedDoc).toEqual({foo: "bar"});
                    expect(NativeAes.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKey, signingKey, symKey, deviceIv, signingIv);
                }
            );
        });
    });
});

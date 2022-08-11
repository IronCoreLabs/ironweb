import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import * as TestUtils from "../../../tests/TestUtils";
import * as AES from "../crypto/aes";
import * as Recrypt from "../crypto/recrypt";
import * as UserCrypto from "../UserCrypto";

describe("UserCrypto", () => {
    describe("RotatePrivateKey", () => {
        it("rotate the current private key and encrypt it then return it and the augmentation factor of that raotation", () => {
            const encryptedPrivateUserKey = new Uint8Array(32);
            const privateKey = new Uint8Array(32);

            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derivedKey"));
            jest.spyOn(Recrypt, "rotateUsersPrivateKeyWithRetry").mockReturnValue(Future.of<any>({newPrivateKey: "boo", augmentationFactor: "or-treat"}));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.of<any>("trick"));
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.of<any>(privateKey));

            UserCrypto.rotatePrivateKey("passcode", encryptedPrivateUserKey).engage(
                (e) => {
                    throw e;
                },
                (userKeyRotationResult: any) => {
                    expect(userKeyRotationResult).toEqual({
                        newEncryptedPrivateUserKey: "trick",
                        augmentationFactor: "or-treat",
                    });
                    expect(Recrypt.rotateUsersPrivateKeyWithRetry).toHaveBeenCalledWith(privateKey);
                    expect(AES.encryptUserKey).toHaveBeenCalledWith("boo", "derivedKey");
                }
            );
        });
    });

    describe("generateDeviceAndSigningKeys", () => {
        it("decrypts document key and then decrypts document", () => {
            const signingKeys = {
                publicKey: new Uint8Array([]),
                privateKey: new Uint8Array([]),
            };
            const publicUserKey = TestUtils.getEmptyPublicKey();
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const privateUserKey = new Uint8Array(32);

            jest.spyOn(Recrypt, "generateKeyPair").mockReturnValue(Future.of<any>(deviceKeys));
            jest.spyOn(Recrypt, "generateSigningKeyPair").mockReturnValue(Future.of<any>(signingKeys));
            jest.spyOn(Recrypt, "generateTransformKey").mockReturnValue(Future.of<any>("transformKey"));
            jest.spyOn(Recrypt, "generateDeviceAddSignature").mockReturnValue(Future.of<any>("device signature"));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derivedKey"));
            jest.spyOn(AES, "encryptDeviceAndSigningKeys").mockReturnValue(
                Future.of<any>({deviceKey: "encryptedDeviceKey", signingKey: "encryptedSigningKey"})
            );
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted keys"));

            UserCrypto.generateDeviceAndSigningKeys("validJWT", "passcode", new Uint8Array(32), privateUserKey, publicUserKey).engage(
                (e) => {
                    throw e;
                },
                (deviceAndSigningKeys: any) => {
                    expect(deviceAndSigningKeys).toEqual({
                        userKeys: {
                            deviceKeys,
                            transformKey: "transformKey",
                            signingKeys,
                        },
                        encryptedDeviceAndSigningKeys: {
                            deviceKey: "encryptedDeviceKey",
                            signingKey: "encryptedSigningKey",
                        },
                        deviceSignature: "device signature",
                    });
                    expect(AES.decryptUserKey).toHaveBeenCalledWith(privateUserKey, "derivedKey");
                    expect(Recrypt.generateTransformKey).toHaveBeenCalledWith("decrypted keys", deviceKeys.publicKey, signingKeys);
                    expect(AES.encryptDeviceAndSigningKeys).toHaveBeenCalledWith(deviceKeys.privateKey, signingKeys.privateKey);
                    expect(Recrypt.generateDeviceAddSignature).toHaveBeenCalledWith(
                        "validJWT",
                        {publicKey: publicUserKey, privateKey: "decrypted keys"},
                        "transformKey"
                    );
                }
            );
        });

        it("maps user key decrypt error to SDK error with proper error code", () => {
            jest.spyOn(Recrypt, "generateKeyPair").mockReturnValue(Future.of<any>(TestUtils.getEmptyKeyPair()));
            jest.spyOn(Recrypt, "generateSigningKeyPair").mockReturnValue(Future.of<any>(TestUtils.getSigningKeyPair()));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derivedKey"));
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.reject(new Error("could not do a decrypt")));

            const userPublic = TestUtils.getEmptyPublicKey();

            UserCrypto.generateDeviceAndSigningKeys("validJWT", "passcode", new Uint8Array(32), new Uint8Array(32), userPublic).engage(
                (error) => {
                    expect(error.message).toBeString();
                    expect(error.code).toEqual(ErrorCodes.USER_PASSCODE_INCORRECT);
                },
                () => fail("Success handler should not be called with functions fail")
            );
        });

        it("maps Recrypt operation failure to expected SDK error code", () => {
            jest.spyOn(Recrypt, "generateKeyPair").mockReturnValue(Future.reject(new Error("recrypt key gen failure")));
            jest.spyOn(Recrypt, "generateSigningKeyPair").mockReturnValue(Future.of<any>(TestUtils.getSigningKeyPair()));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derivedKey"));
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted keys"));

            const userPublic = TestUtils.getEmptyPublicKey();

            UserCrypto.generateDeviceAndSigningKeys("validJWT", "passcode", new Uint8Array(32), new Uint8Array(32), userPublic).engage(
                (error) => {
                    expect(error.message).toEqual("recrypt key gen failure");
                    expect(error.code).toEqual(ErrorCodes.USER_DEVICE_KEY_GENERATION_FAILURE);
                },
                () => fail("Success handler should not be called with functions fail")
            );
        });
    });

    describe("generateNewUserKeys", () => {
        it("generates document key and then encrypts key and document", () => {
            const userKeyPair = TestUtils.getEmptyKeyPair();

            jest.spyOn(Recrypt, "generateKeyPair").mockReturnValue(Future.of<any>(userKeyPair));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived key"));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.of<any>("epk"));

            UserCrypto.generateNewUserKeys("passcode").engage(
                (e) => {
                    throw e;
                },
                (userKeys) => {
                    expect(userKeys as any).toEqual({
                        ...userKeyPair,
                        encryptedPrivateKey: "epk",
                    });

                    expect(Recrypt.generateKeyPair).toHaveBeenCalledWith();
                    expect(Recrypt.generatePasswordDerivedKey).toHaveBeenCalledWith("passcode");
                    expect(AES.encryptUserKey).toHaveBeenCalledWith(expect.any(Uint8Array), "derived key");
                }
            );
        });

        it("converts errors into sdk error with expected error code", () => {
            jest.spyOn(Recrypt, "generateKeyPair").mockReturnValue(Future.reject(new Error("recrypt new user key pair failure")));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived key"));

            UserCrypto.generateNewUserKeys("passcode").engage(
                (error) => {
                    expect(error.message).toEqual("recrypt new user key pair failure");
                    expect(error.code).toEqual(ErrorCodes.USER_MASTER_KEY_GENERATION_FAILURE);
                },
                () => fail("Should not invoke success when operation fails")
            );
        });
    });

    describe("generateNewUserAndDeviceKeys", () => {
        it("generates document key and then encrypts key and document", () => {
            const userKeyPair = TestUtils.getEmptyKeyPair();
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = {
                publicKey: new Uint8Array([]),
                privateKey: new Uint8Array([]),
            };

            jest.spyOn(Recrypt, "generateNewUserKeySet").mockReturnValue(Future.of<any>({deviceKeys, userKeys: userKeyPair, signingKeys}));
            jest.spyOn(Recrypt, "generateTransformKey").mockReturnValue(Future.of<any>("transformKey"));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived key"));
            jest.spyOn(AES, "encryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>("encryptedDeviceAndSigningKeys"));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.of<any>("epk"));

            UserCrypto.generateNewUserAndDeviceKeys("passcode").engage(
                (e) => {
                    throw e;
                },
                ({userKeys, encryptedDeviceAndSigningKeys}) => {
                    expect(encryptedDeviceAndSigningKeys as any).toEqual("encryptedDeviceAndSigningKeys");
                    expect(userKeys as any).toEqual({
                        userKeys: {
                            ...userKeyPair,
                            encryptedPrivateKey: "epk",
                        },
                        deviceKeys,
                        signingKeys,
                        transformKey: "transformKey",
                    });

                    expect(Recrypt.generateNewUserKeySet).toHaveBeenCalledWith();
                    expect(Recrypt.generatePasswordDerivedKey).toHaveBeenCalledWith("passcode");
                    expect(AES.encryptUserKey).toHaveBeenCalledWith(expect.any(Uint8Array), "derived key");
                }
            );
        });

        it("converts errors into sdk error with expected error code", () => {
            jest.spyOn(Recrypt, "generateNewUserKeySet").mockReturnValue(Future.reject(new Error("recrypt new user key set failure")));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived key"));

            UserCrypto.generateNewUserAndDeviceKeys("passcode").engage(
                (error) => {
                    expect(error.message).toEqual("recrypt new user key set failure");
                    expect(error.code).toEqual(ErrorCodes.USER_MASTER_KEY_GENERATION_FAILURE);
                },
                () => fail("Should not invoke success when operation fails")
            );
        });
    });

    describe("decryptDeviceAndSigningKeys", () => {
        it("decrypts users signing keys and derives their public keys from the resulting private keys", () => {
            const encryptedDeviceKey = new Uint8Array(33);
            const encryptedSigningKey = new Uint8Array(64);
            const deviceKey = new Uint8Array(22);
            const signingKey = new Uint8Array(53);
            const nonce = new Uint8Array(12);
            const symKey = new Uint8Array(30);

            const devicePublicKey = new Uint8Array(22);
            const signingPublicKey = new Uint8Array(23);
            jest.spyOn(Recrypt, "derivePublicKey").mockReturnValue(Future.of<any>(devicePublicKey));
            jest.spyOn(Recrypt, "getPublicSigningKeyFromPrivate").mockReturnValue(Future.of<any>(signingPublicKey));
            jest.spyOn(AES, "decryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>({deviceKey, signingKey}));

            UserCrypto.decryptDeviceAndSigningKeys(encryptedDeviceKey, encryptedSigningKey, symKey, nonce).engage(
                (e) => {
                    throw e;
                },
                (keys: any) => {
                    expect(keys).toEqual({
                        deviceKeys: {
                            publicKey: devicePublicKey,
                            privateKey: deviceKey,
                        },
                        signingKeys: {
                            publicKey: signingPublicKey,
                            privateKey: signingKey,
                        },
                    });
                    expect(AES.decryptDeviceAndSigningKeys).toHaveBeenCalledWith(encryptedDeviceKey, encryptedSigningKey, symKey, nonce);
                }
            );
        });

        it("converts errors into sdk error with expected error code", () => {
            const encryptedDeviceKey = new Uint8Array(33);
            const encryptedSigningKey = new Uint8Array(64);
            const nonce = new Uint8Array(12);
            const symKey = new Uint8Array(30);

            jest.spyOn(AES, "decryptDeviceAndSigningKeys").mockReturnValue(Future.reject(new Error("decrypt key failure")));

            UserCrypto.decryptDeviceAndSigningKeys(encryptedDeviceKey, encryptedSigningKey, symKey, nonce).engage(
                (error) => {
                    expect(error.message).toEqual("decrypt key failure");
                    expect(error.code).toEqual(ErrorCodes.USER_DEVICE_KEY_DECRYPTION_FAILURE);
                },
                () => fail("Should not invoke success when operation fails")
            );
        });
    });

    describe("changeUsersPasscode", () => {
        it("derives current passcode key, decrypts master private key, derives updated user key, and reencrypts master private key", (done) => {
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted private key"));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.of<any>("encrypted private key"));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived fixed key"));

            UserCrypto.changeUsersPasscode("current", "new", new Uint8Array([33])).engage(
                (e) => fail(e.message),
                (encryptedKey: any) => {
                    expect(encryptedKey).toEqual({
                        encryptedPrivateUserKey: "encrypted private key",
                    });
                    expect(AES.decryptUserKey).toHaveBeenCalledWith(expect.any(Uint8Array), "derived fixed key");
                    expect(AES.encryptUserKey).toHaveBeenCalledWith("decrypted private key", "derived fixed key");
                    expect(Recrypt.generatePasswordDerivedKey).toHaveBeenCalledWith("current", new Uint8Array([33]));
                    expect(Recrypt.generatePasswordDerivedKey).toHaveBeenCalledWith("new");

                    done();
                }
            );
        });

        it("fails with expected error code when current passcode is incorrect", (done) => {
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.reject(new Error("could not do a decrypt")));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.of<any>("encrypted private key"));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived fixed key"));

            UserCrypto.changeUsersPasscode("current", "new", new Uint8Array([33])).engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.USER_PASSCODE_INCORRECT);
                    expect(AES.encryptUserKey).not.toHaveBeenCalled();
                    done();
                },
                () => fail("Future should not resolve when decryption fails")
            );
        });

        it("maps error code correctly when generating new user key fails ", (done) => {
            jest.spyOn(AES, "decryptUserKey").mockReturnValue(Future.of<any>("decrypted private key"));
            jest.spyOn(AES, "encryptUserKey").mockReturnValue(Future.reject(new Error("could not encrypt key")));
            jest.spyOn(Recrypt, "generatePasswordDerivedKey").mockReturnValue(Future.of<any>("derived fixed key"));

            UserCrypto.changeUsersPasscode("current", "new", new Uint8Array([33])).engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.USER_PASSCODE_CHANGE_FAILURE);
                    expect(AES.encryptUserKey).toHaveBeenCalled();
                    done();
                },
                () => fail("Future should not resolve when decryption fails")
            );
        });
    });

    describe("signRequestPayload", () => {
        it("signs the provided payload and returns the signature", () => {
            jest.spyOn(Recrypt, "createRequestSignature").mockReturnValue({
                userContextHeader: "comma,list,stuff",
                requestHeaderSignature: "sig1",
                authHeaderSignature: "sig2",
            });

            const result = UserCrypto.signRequestPayload(1, "user-10", TestUtils.getSigningKeyPair(), "GET", "/path/to/resource", "body");

            expect(result).toEqual({
                userContextHeader: "comma,list,stuff",
                requestHeaderSignature: "sig1",
                authHeaderSignature: "sig2",
            });
            expect(Recrypt.createRequestSignature).toHaveBeenCalledWith(1, "user-10", TestUtils.getSigningKeyPair(), "GET", "/path/to/resource", "body");
        });
    });
});

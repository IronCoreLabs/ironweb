import * as MockRecrypt from "@ironcorelabs/recrypt-wasm-binding";
import {toByteArray} from "base64-js";
import Future from "futurejs";
import * as TestUtils from "../../../../../tests/TestUtils";
import * as CryptoUtils from "../../CryptoUtils";
import * as nativePBKDF2 from "../../pbkdf2/native";
import * as Recrypt from "../RecryptWasm";

describe("RecryptWasm", () => {
    beforeAll(() => {
        Recrypt.instantiateApi();
    });

    describe("rotateUsersPrivateKeyWithRetry", () => {
        const userPrivateKey = new Uint8Array([22, 33, 44]);
        it("should result in an error when mocked generateKeyPair returns Uint8Array of zeros for augmentationFactor", () => {
            jest.spyOn(Recrypt.getApi(), "generateKeyPair");
            Recrypt.rotateUsersPrivateKeyWithRetry(userPrivateKey).engage(
                (error) => {
                    expect(error.message).toEqual("Key rotation failed.");
                    expect(Recrypt.getApi().generateKeyPair).toHaveBeenCalledTimes(2);
                },
                () => fail("Should not success when operation fails")
            );
        });

        it("should result in an error when subtraction result is zero", () => {
            jest.spyOn(Recrypt.getApi(), "generateKeyPair").mockReturnValue({privateKey: new Uint8Array([12, 23, 34])} as any);
            jest.spyOn(MockRecrypt, "subtractPrivateKeys").mockReturnValue(new Uint8Array(32));
            Recrypt.rotateUsersPrivateKeyWithRetry(userPrivateKey).engage(
                (error) => {
                    expect(error.message).toEqual("Key rotation failed.");
                },
                () => fail("Should fail when private key subtraction results in zeroed private key")
            );

            expect(MockRecrypt.subtractPrivateKeys).toHaveBeenCalledTimes(2);
        });

        it("should success when valid augmentation factor is produced and the result of the subtraction does not result in zero", () => {
            jest.spyOn(Recrypt.getApi(), "generateKeyPair").mockReturnValue({privateKey: new Uint8Array([12, 23, 34])} as any);
            jest.spyOn(MockRecrypt, "subtractPrivateKeys").mockReturnValue(new Uint8Array([11, 22, 33]));
            Recrypt.rotateUsersPrivateKeyWithRetry(userPrivateKey).engage(
                (e) => fail(e),
                ({newPrivateKey, augmentationFactor}) => {
                    expect(Recrypt.getApi().generateKeyPair).toHaveBeenCalledTimes(1);
                    expect(MockRecrypt.subtractPrivateKeys).toHaveBeenCalledTimes(1);
                    expect(newPrivateKey).toEqual(new Uint8Array([11, 22, 33]));
                    expect(augmentationFactor).toEqual(new Uint8Array([12, 23, 34]));
                }
            );
        });
    });

    describe("rotateGroupPrivateKeyWithRetry", () => {
        const groupPrivateKey = new Uint8Array([22, 33, 44]);
        it("should result in an error when mocked generateKeyPair returns Uint8Array of zeros for new privateKey", () => {
            jest.spyOn(Recrypt.getApi(), "generatePlaintext").mockReturnValue(new Uint8Array(32));
            Recrypt.rotateGroupPrivateKeyWithRetry(groupPrivateKey).engage(
                () => {
                    expect(Recrypt.getApi().generatePlaintext).toHaveBeenCalledTimes(2);
                },
                () => fail("Should not success when operation fails")
            );
        });

        it("should result in an error when subtracting existing private key from the new private key", () => {
            jest.spyOn(Recrypt.getApi(), "generatePlaintext").mockReturnValue(new Uint8Array([12, 23, 34]) as any);
            jest.spyOn(MockRecrypt, "subtractPrivateKeys").mockReturnValue(new Uint8Array(32));
            Recrypt.rotateGroupPrivateKeyWithRetry(groupPrivateKey).engage(
                () => {
                    expect(Recrypt.getApi().generatePlaintext).toHaveBeenCalledTimes(2);
                    expect(MockRecrypt.subtractPrivateKeys).toHaveBeenCalledTimes(2);
                },
                () => fail("Should fail when private key subtraction results in zeroed private key")
            );
        });

        it("should success when valid augmentation factor is produced", () => {
            jest.spyOn(Recrypt.getApi(), "generatePlaintext").mockReturnValue(new Uint8Array([12, 23, 34]) as any);
            jest.spyOn(MockRecrypt, "subtractPrivateKeys").mockReturnValue(new Uint8Array([11, 22, 33]));
            jest.spyOn(Recrypt.getApi(), "hash256").mockReturnValue(new Uint8Array([44, 55, 34]));
            Recrypt.rotateGroupPrivateKeyWithRetry(groupPrivateKey).engage(
                (e) => fail(e),
                ({plaintext, augmentationFactor}) => {
                    expect(Recrypt.getApi().generatePlaintext).toHaveBeenCalledTimes(1);
                    expect(MockRecrypt.subtractPrivateKeys).toHaveBeenCalledTimes(1);
                    expect(plaintext).toEqual(new Uint8Array([12, 23, 34]));
                    expect(augmentationFactor).toEqual(new Uint8Array([11, 22, 33]));
                }
            );
        });
    });

    describe("generatePasswordDerivedKey", () => {
        it("should generate random bytes and use WebCrypto pbkdf2", () => {
            spyOn(nativePBKDF2, "generatePasscodeDerivedKey").and.returnValue(Future.of("derivedKey"));
            spyOn(CryptoUtils, "getCryptoSubtleApi").and.returnValue(true);

            Recrypt.generatePasswordDerivedKey("password", new Uint8Array(32)).engage(
                (e) => e,
                (result: any) => {
                    expect(result.salt).toEqual(new Uint8Array(32));
                    expect(result.key).toEqual("derivedKey");
                }
            );
        });
    });

    describe("generateKeyPair", () => {
        it("should generate a set of Recrypt keys", () => {
            Recrypt.generateKeyPair().engage(
                (e) => fail(e),
                ({publicKey, privateKey}) => {
                    expect(publicKey.x.length).toEqual(32);
                    expect(publicKey.y.length).toEqual(32);
                    expect(publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(privateKey).toEqual(expect.any(Uint8Array));
                    expect(privateKey.length).toEqual(32);
                }
            );
        });
    });

    describe("generateSigningKeyPair", () => {
        it("generates a set of ed25519 keys", () => {
            Recrypt.generateSigningKeyPair().engage(
                (e) => fail(e),
                ({publicKey, privateKey}) => {
                    expect(publicKey).toEqual(expect.any(Uint8Array));
                    expect(publicKey.length).toEqual(32);
                    expect(privateKey).toEqual(expect.any(Uint8Array));
                    expect(privateKey.length).toEqual(64);
                }
            );
        });
    });

    describe("getPublicSigningKeyFromPrivate", () => {
        it("returns expected public key from private", () => {
            Recrypt.generateSigningKeyPair()
                .flatMap((signingKeys) => {
                    return Recrypt.getPublicSigningKeyFromPrivate(signingKeys.privateKey).map((publicKey) => {
                        expect(publicKey).toEqual(signingKeys.publicKey);
                    });
                })
                .engage(
                    (e) => fail(e.message),
                    () => null
                );
        });
    });

    describe("generateNewUserKeySet", () => {
        it("generates both user and device keys", () => {
            Recrypt.generateNewUserKeySet().engage(
                (e) => fail(e),
                (keys: any) => {
                    expect(Object.keys(keys)).toBeArrayOfSize(3);
                    expect(keys.userKeys.publicKey.x.length).toEqual(32);
                    expect(keys.userKeys.publicKey.y.length).toEqual(32);
                    expect(keys.userKeys.publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.privateKey).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.privateKey.length).toEqual(32);

                    expect(keys.deviceKeys.publicKey.x.length).toEqual(32);
                    expect(keys.deviceKeys.publicKey.y.length).toEqual(32);
                    expect(keys.deviceKeys.publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.privateKey).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.privateKey.length).toEqual(32);

                    expect(keys.signingKeys.publicKey.length).toEqual(32);
                    expect(keys.signingKeys.privateKey.length).toEqual(64);
                }
            );
        });
    });

    describe("generateGroupKeyPair", () => {
        it("generates new public, private, and plaintext fields", () => {
            Recrypt.generateGroupKeyPair().engage(
                (e) => fail(e),
                (keys) => {
                    expect(keys.publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(keys.publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(keys.privateKey).toEqual(expect.any(Uint8Array));
                    expect(keys.plaintext).toEqual(expect.any(Uint8Array));

                    expect(keys.publicKey.x.length).toEqual(32);
                    expect(keys.publicKey.y.length).toEqual(32);

                    expect(keys.privateKey.length).toEqual(32);
                    expect(keys.plaintext.length).toEqual(384);
                }
            );
        });
    });

    describe("derivePublicKey", () => {
        it("generates a public key that corresponds to private key", () => {
            let publicKey: any;
            Recrypt.generateKeyPair()
                .flatMap((keys) => {
                    publicKey = keys.publicKey;
                    return Recrypt.derivePublicKey(keys.privateKey);
                })
                .engage(
                    (e) => fail(e),
                    (derivedPublicKey) => {
                        expect(derivedPublicKey).toEqual(publicKey);
                    }
                );
        });
    });

    describe("generateTransformKey", () => {
        it("returns a new transform key from public/private key", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            Recrypt.generateKeyPair()
                .flatMap((keys) => Recrypt.generateTransformKey(keys.privateKey, keys.publicKey, signingKeys))
                .engage(
                    (e) => fail(e),
                    (transformKey) => {
                        expect(transformKey).toBeObject();

                        expect(transformKey.encryptedTempKey).toEqual(expect.any(Uint8Array));
                        expect(transformKey.encryptedTempKey.length).toEqual(384);

                        expect(transformKey.hashedTempKey).toEqual(expect.any(Uint8Array));
                        expect(transformKey.hashedTempKey.length).toEqual(128);

                        expect(transformKey.ephemeralPublicKey.x).toEqual(expect.any(Uint8Array));
                        expect(transformKey.ephemeralPublicKey.y).toEqual(expect.any(Uint8Array));
                        expect(transformKey.ephemeralPublicKey.x.length).toEqual(32);
                        expect(transformKey.ephemeralPublicKey.y.length).toEqual(32);

                        expect(transformKey.toPublicKey.x).toEqual(expect.any(Uint8Array));
                        expect(transformKey.toPublicKey.y).toEqual(expect.any(Uint8Array));
                        expect(transformKey.toPublicKey.x.length).toEqual(32);
                        expect(transformKey.toPublicKey.y.length).toEqual(32);

                        expect(transformKey.publicSigningKey).toEqual(signingKeys.publicKey);

                        expect(transformKey.signature).toEqual(expect.any(Uint8Array));
                        expect(transformKey.signature.length).toEqual(64);
                    }
                );
        });
    });

    describe("generateTransformKeyToList", () => {
        it("returns an empty array when no keys passed in", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            Recrypt.generateTransformKeyToList(new Uint8Array(32), [], signingKeys).engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual([]);
                }
            );
        });

        it("generates a tranform key for each key in provided list", () => {
            const key1 = {
                masterPublicKey: {
                    x: "iofzenON27PeYqmCcCTxxZxKWsH1DBWpb04Brsa6GDo=",
                    y: "O918eBCWdImkkA7jIcHk3dPhf08TudRmgODFgdXJzHk=",
                },
                id: "user-1",
            };
            const key2 = {
                masterPublicKey: {
                    x: "Ft3BGLPh8FvTsuHGUt+lOYQ5kVPJXeEgP/OHq+T0ijM=",
                    y: "RLsEaIquAnODxB5O6j6I64uDZ0OZsfnbaimovIOLiH0=",
                },
                id: "user-2",
            };
            const signingKeys = TestUtils.getSigningKeyPair();

            Recrypt.generateTransformKeyToList(new Uint8Array(32), [key1, key2], signingKeys).engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toBeArrayOfSize(2);

                    const [ts1, ts2] = result;

                    expect(ts1.id).toEqual("user-1");
                    expect(ts1.publicKey).toEqual(key1.masterPublicKey);

                    expect(ts2.id).toEqual("user-2");
                    expect(ts2.publicKey).toEqual(key2.masterPublicKey);

                    expect(ts1.transformKey.publicSigningKey).toEqual(signingKeys.publicKey);
                    expect(ts2.transformKey.signature).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.encryptedTempKey).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.hashedTempKey).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.ephemeralPublicKey.x).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.ephemeralPublicKey.y).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.toPublicKey.x).toEqual(expect.any(Uint8Array));
                    expect(ts1.transformKey.toPublicKey.y).toEqual(expect.any(Uint8Array));

                    expect(ts1.transformKey.publicSigningKey).toEqual(signingKeys.publicKey);
                    expect(ts2.transformKey.signature).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.encryptedTempKey).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.hashedTempKey).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.ephemeralPublicKey.x).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.ephemeralPublicKey.y).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.toPublicKey.x).toEqual(expect.any(Uint8Array));
                    expect(ts2.transformKey.toPublicKey.y).toEqual(expect.any(Uint8Array));
                }
            );
        });
    });

    describe("generateDocumentKey", () => {
        it("generates document symmetric key", () => {
            Recrypt.generateDocumentKey().engage(
                (e) => fail(e),
                (key: any) => {
                    expect(key).toBeArrayOfSize(2);
                    expect(key[0]).toEqual(expect.any(Uint8Array));
                    expect(key[0].length).toEqual(384);
                    expect(key[1]).toEqual(expect.any(Uint8Array));
                    expect(key[1].length).toEqual(32);
                }
            );
        });
    });

    describe("encryptDocumentKey", () => {
        it("encrypts provided document key", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            const publicKey = {
                x: toByteArray("iofzenON27PeYqmCcCTxxZxKWsH1DBWpb04Brsa6GDo="),
                y: toByteArray("O918eBCWdImkkA7jIcHk3dPhf08TudRmgODFgdXJzHk="),
            };
            Recrypt.encryptPlaintext(new Uint8Array(384), publicKey, signingKeys).engage(
                (e) => fail(e.message),
                (encryptedKey) => {
                    expect(encryptedKey.ephemeralPublicKey.x).toEqual(expect.any(String));
                    expect(encryptedKey.ephemeralPublicKey.y).toEqual(expect.any(String));
                    expect(encryptedKey.encryptedMessage).toEqual(expect.any(String));
                    expect(encryptedKey.publicSigningKey).toEqual(expect.any(String));
                    expect(encryptedKey.signature).toEqual(expect.any(String));
                }
            );
        });
    });

    describe("encryptPlaintextToList", () => {
        it("encrypts plaintext to all in list and returns expected response", () => {
            const user1 = {
                id: "user1",
                masterPublicKey: {
                    x: "iofzenON27PeYqmCcCTxxZxKWsH1DBWpb04Brsa6GDo=",
                    y: "O918eBCWdImkkA7jIcHk3dPhf08TudRmgODFgdXJzHk=",
                },
            };

            const user2 = {
                id: "user2",
                masterPublicKey: {
                    x: "Ft3BGLPh8FvTsuHGUt+lOYQ5kVPJXeEgP/OHq+T0ijM=",
                    y: "RLsEaIquAnODxB5O6j6I64uDZ0OZsfnbaimovIOLiH0=",
                },
            };
            const signingKeys = TestUtils.getSigningKeyPair();

            Recrypt.encryptPlaintextToList(new Uint8Array(384), [user1, user2], signingKeys).engage(
                (e) => fail(e.message),
                (encryptedKeys) => {
                    expect(encryptedKeys).toBeArrayOfSize(2);

                    expect(encryptedKeys[0].publicKey).toEqual(user1.masterPublicKey);
                    expect(encryptedKeys[0].encryptedPlaintext).toContainAllKeys([
                        "encryptedMessage",
                        "ephemeralPublicKey",
                        "authHash",
                        "signature",
                        "publicSigningKey",
                    ]);
                    expect(encryptedKeys[0].encryptedPlaintext.ephemeralPublicKey).toContainAllKeys(["x", "y"]);
                    expect(encryptedKeys[0].id).toEqual("user1");

                    expect(encryptedKeys[1].publicKey).toEqual(user2.masterPublicKey);
                    expect(encryptedKeys[1].encryptedPlaintext).toContainAllKeys([
                        "encryptedMessage",
                        "ephemeralPublicKey",
                        "authHash",
                        "signature",
                        "publicSigningKey",
                    ]);
                    expect(encryptedKeys[1].encryptedPlaintext.ephemeralPublicKey).toContainAllKeys(["x", "y"]);
                    expect(encryptedKeys[1].id).toEqual("user2");
                }
            );
        });

        it("returns empty list when no keys provided", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            Recrypt.encryptPlaintextToList(new Uint8Array(384), [], signingKeys).engage(
                (e) => fail(e.message),
                (encryptedKeys) => {
                    expect(encryptedKeys).toBeArrayOfSize(0);
                }
            );
        });
    });

    describe("decryptPlaintext", () => {
        it("decrypts provided plaintext", () => {
            const encryptedValue = TestUtils.getTransformedSymmetricKey();
            const privateKey = new Uint8Array(32);
            Recrypt.decryptPlaintext(encryptedValue, privateKey).engage(
                (e) => fail(e.message),
                ([decryptedPlaintext, symKey]) => {
                    expect(decryptedPlaintext).toEqual(expect.any(Uint8Array));
                    expect(decryptedPlaintext.length).toEqual(55); //Comes from RecryptMock.ts file

                    expect(symKey).toEqual(expect.any(Uint8Array));
                    expect(symKey.length).toEqual(32);
                }
            );
        });
    });

    describe("createRequestSignature", () => {
        it("returns comma list of items and calculates two signatures", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(Recrypt.getApi(), "ed25519Sign").mockReturnValue(new Uint8Array(64));
            spyOn(Date, "now").and.returnValue(123456);
            const signatureDetails = Recrypt.createRequestSignature(1, "user-10", signingKeys, "get", "/path/to/resource", "bodyparts");
            expect(signatureDetails.userContextHeader).toEqual("123456,1,user-10,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
            expect(signatureDetails.authHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
            expect(signatureDetails.requestHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");

            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61]));
            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61, 71, 69, 84, 47, 112, 97, 116, 104, 47, 116, 111, 47, 114, 101, 115, 111, 117, 114, 99, 101, 98, 111, 100, 121, 112, 97, 114, 116, 115]));
        });

        it("uses an empty byte array when body is empty", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(Recrypt.getApi(), "ed25519Sign").mockReturnValue(new Uint8Array(64));
            spyOn(Date, "now").and.returnValue(123456);
            const signatureDetails = Recrypt.createRequestSignature(1, "user-10", signingKeys, "POST", "/path/to/resource", null);
            expect(signatureDetails.userContextHeader).toEqual("123456,1,user-10,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
            expect(signatureDetails.authHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
            expect(signatureDetails.requestHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");

            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61]));
            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61, 80, 79, 83, 84, 47, 112, 97, 116, 104, 47, 116, 111, 47, 114, 101, 115, 111, 117, 114, 99, 101]));
        });

        it("uses existing Uint8Array when body is set as one", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(Recrypt.getApi(), "ed25519Sign").mockReturnValue(new Uint8Array(64));
            spyOn(Date, "now").and.returnValue(123456);
            const signatureDetails = Recrypt.createRequestSignature(1, "user-10", signingKeys, "GET", "/path/to/resource", new Uint8Array([9, 9, 9, 9]));
            expect(signatureDetails.userContextHeader).toEqual("123456,1,user-10,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
            expect(signatureDetails.authHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
            expect(signatureDetails.requestHeaderSignature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");

            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61]));
            //prettier-ignore
            expect(Recrypt.getApi().ed25519Sign).toHaveBeenCalledWith(signingKeys.privateKey, new Uint8Array([49, 50, 51, 52, 53, 54, 44, 49, 44, 117, 115, 101, 114, 45, 49, 48, 44, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 61, 71, 69, 84, 47, 112, 97, 116, 104, 47, 116, 111, 47, 114, 101, 115, 111, 117, 114, 99, 101, 9, 9, 9, 9]));
        });
    });

    describe("generateDeviceAddSignature", () => {
        it("generates the expected signature", (done) => {
            const fixedTS = 1234567890123;
            spyOn(Date, "now").and.returnValue(fixedTS);

            Recrypt.generateDeviceAddSignature("jwt", TestUtils.getEmptyKeyPair(), TestUtils.getTransformKey()).engage(
                (e) => fail(e.message),
                (signature) => {
                    expect(signature.ts).toEqual(fixedTS);
                    expect(signature.signature).toEqual(expect.any(Uint8Array));
                    done();
                }
            );
        });
    });

    describe("tokenizeQuery", () => {
        it("calls into Recrypt to tokenize query", () => {
            //Result comes from Recrypt mock
            expect(Recrypt.tokenizeQuery("query", new Uint8Array([99]), "partition")).toEqual(new Uint32Array([0, 1, 2]));
        });
    });

    describe("tokenizeData", () => {
        it("calls into Recrypt to tokenize query", () => {
            //Result comes from Recrypt mock
            expect(Recrypt.tokenizeData("query", new Uint8Array([99]), "partition")).toEqual(new Uint32Array([3, 4, 5, 6, 7, 8, 9, 10]));
        });
    });

    describe("transliterateString", () => {
        it("calls into Recrypt to transliterate string", () => {
            //Result comes from Recrypt mock
            expect(Recrypt.transliterateString("my string")).toEqual("my string-transliterated");
        });
    });
});

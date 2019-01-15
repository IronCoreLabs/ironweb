import {toByteArray} from "base64-js";
import Future from "futurejs";
import * as Recrypt from "../RecryptWasm";
import * as TestUtils from "../../../../../tests/TestUtils";
import * as CryptoUtils from "../../CryptoUtils";
import * as nativePBKDF2 from "../../pbkdf2/native";

describe("RecryptWasm", () => {
    beforeAll(() => {
        Recrypt.instantiateApi();
    });

    describe("generatePasswordDerivedKey", () => {
        it("should generate random bytes and use WebCrypto pbkdf2 when available", () => {
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

        it("should use previous salt and use Recrypt PBKDF2 when no WebCrypto", () => {
            spyOn(CryptoUtils, "generateRandomBytes").and.returnValue(Future.of("salt"));
            spyOn(CryptoUtils, "getCryptoSubtleApi").and.returnValue(false);

            Recrypt.generatePasswordDerivedKey("password").engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result.key).toEqual(new Uint8Array(32));
                    expect(result.salt).toEqual("salt");
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
                    expect(publicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(publicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(privateKey).toEqual(jasmine.any(Uint8Array));
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
                    expect(publicKey).toEqual(jasmine.any(Uint8Array));
                    expect(publicKey.length).toEqual(32);
                    expect(privateKey).toEqual(jasmine.any(Uint8Array));
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
                .engage((e) => fail(e.message), () => null);
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
                    expect(keys.userKeys.publicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(keys.userKeys.publicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(keys.userKeys.privateKey).toEqual(jasmine.any(Uint8Array));
                    expect(keys.userKeys.privateKey.length).toEqual(32);

                    expect(keys.deviceKeys.publicKey.x.length).toEqual(32);
                    expect(keys.deviceKeys.publicKey.y.length).toEqual(32);
                    expect(keys.deviceKeys.publicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(keys.deviceKeys.publicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(keys.deviceKeys.privateKey).toEqual(jasmine.any(Uint8Array));
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
                    expect(keys.publicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(keys.publicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(keys.privateKey).toEqual(jasmine.any(Uint8Array));
                    expect(keys.plaintext).toEqual(jasmine.any(Uint8Array));

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

                        expect(transformKey.encryptedTempKey).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.encryptedTempKey.length).toEqual(384);

                        expect(transformKey.hashedTempKey).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.hashedTempKey.length).toEqual(128);

                        expect(transformKey.ephemeralPublicKey.x).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.ephemeralPublicKey.y).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.ephemeralPublicKey.x.length).toEqual(32);
                        expect(transformKey.ephemeralPublicKey.y.length).toEqual(32);

                        expect(transformKey.toPublicKey.x).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.toPublicKey.y).toEqual(jasmine.any(Uint8Array));
                        expect(transformKey.toPublicKey.x.length).toEqual(32);
                        expect(transformKey.toPublicKey.y.length).toEqual(32);

                        expect(transformKey.publicSigningKey).toEqual(signingKeys.publicKey);

                        expect(transformKey.signature).toEqual(jasmine.any(Uint8Array));
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
                    expect(ts2.transformKey.signature).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.encryptedTempKey).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.hashedTempKey).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.ephemeralPublicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.ephemeralPublicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.toPublicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(ts1.transformKey.toPublicKey.y).toEqual(jasmine.any(Uint8Array));

                    expect(ts1.transformKey.publicSigningKey).toEqual(signingKeys.publicKey);
                    expect(ts2.transformKey.signature).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.encryptedTempKey).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.hashedTempKey).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.ephemeralPublicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.ephemeralPublicKey.y).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.toPublicKey.x).toEqual(jasmine.any(Uint8Array));
                    expect(ts2.transformKey.toPublicKey.y).toEqual(jasmine.any(Uint8Array));
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
                    expect(key[0]).toEqual(jasmine.any(Uint8Array));
                    expect(key[0].length).toEqual(384);
                    expect(key[1]).toEqual(jasmine.any(Uint8Array));
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
                    expect(encryptedKey.ephemeralPublicKey.x).toEqual(jasmine.any(String));
                    expect(encryptedKey.ephemeralPublicKey.y).toEqual(jasmine.any(String));
                    expect(encryptedKey.encryptedMessage).toEqual(jasmine.any(String));
                    expect(encryptedKey.publicSigningKey).toEqual(jasmine.any(String));
                    expect(encryptedKey.signature).toEqual(jasmine.any(String));
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
                    expect(encryptedKeys[0].encryptedPlaintext).toHaveNonEmptyString("encryptedMessage");
                    expect(encryptedKeys[0].encryptedPlaintext).toHaveNonEmptyString("publicSigningKey");
                    expect(encryptedKeys[0].encryptedPlaintext).toHaveNonEmptyString("signature");
                    expect(encryptedKeys[0].encryptedPlaintext).toHaveNonEmptyObject("ephemeralPublicKey");
                    expect(encryptedKeys[0].encryptedPlaintext.ephemeralPublicKey).toHaveNonEmptyString("x");
                    expect(encryptedKeys[0].encryptedPlaintext.ephemeralPublicKey).toHaveNonEmptyString("y");
                    expect(encryptedKeys[0].id).toEqual("user1");

                    expect(encryptedKeys[1].publicKey).toEqual(user2.masterPublicKey);
                    expect(encryptedKeys[1].encryptedPlaintext).toHaveNonEmptyString("encryptedMessage");
                    expect(encryptedKeys[1].encryptedPlaintext).toHaveNonEmptyString("publicSigningKey");
                    expect(encryptedKeys[1].encryptedPlaintext).toHaveNonEmptyString("signature");
                    expect(encryptedKeys[1].encryptedPlaintext).toHaveNonEmptyObject("ephemeralPublicKey");
                    expect(encryptedKeys[1].encryptedPlaintext.ephemeralPublicKey).toHaveNonEmptyString("x");
                    expect(encryptedKeys[1].encryptedPlaintext.ephemeralPublicKey).toHaveNonEmptyString("y");
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
                    expect(decryptedPlaintext).toEqual(jasmine.any(Uint8Array));
                    expect(decryptedPlaintext.length).toEqual(55); //Comes from RecryptMock.ts file

                    expect(symKey).toEqual(jasmine.any(Uint8Array));
                    expect(symKey.length).toEqual(32);
                }
            );
        });
    });

    describe("createRequestSignature", () => {
        it("returns signature details", () => {
            spyOn(Date, "now").and.returnValue(123456);
            const signatureDetails = Recrypt.createRequestSignature(1, "user-10", TestUtils.getSigningKeyPair(), 55);
            expect(signatureDetails.version).toEqual(55);
            expect(signatureDetails.message).toEqual(
                "eyJ0cyI6MTIzNDU2LCJzaWQiOjEsInVpZCI6InVzZXItMTAiLCJ4IjoiQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQT0ifQ=="
            );
            expect(signatureDetails.signature).toEqual("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
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
                    expect(signature.signature).toEqual(jasmine.any(Uint8Array));
                    done();
                }
            );
        });
    });
});

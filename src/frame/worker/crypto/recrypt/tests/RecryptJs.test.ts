import {generateKeyPair} from "@stablelib/ed25519";
import {toByteArray, fromByteArray} from "base64-js";
import * as Recrypt from "../RecryptJs";
import * as TestUtils from "../../../../../tests/TestUtils";
import * as polyfillPBKDF2 from "../../pbkdf2/polyfill";
import * as CryptoUtils from "../../CryptoUtils";
import Future from "futurejs";

describe("RecryptJs", () => {
    describe("generatePasswordDerivedKey", () => {
        it("should call polyfill pbkdf2 method", () => {
            spyOn(polyfillPBKDF2, "generatePasswordDerivedKey").and.returnValue("polyfill PBKDF2");
            expect(Recrypt.generatePasswordDerivedKey("password")).toEqual("polyfill PBKDF2" as any);
        });
    });

    describe("generateKeyPair", () => {
        it("should generate a set of Recrypt keys", () => {
            Recrypt.generateKeyPair().engage(
                (e) => fail(e),
                ({publicKey, privateKey}) => {
                    expect(publicKey.x.length).toBeWithin(32, 33);
                    expect(publicKey.y.length).toBeWithin(32, 33);
                    expect(publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(privateKey).toEqual(expect.any(Uint8Array));
                    expect(privateKey.length).toBeWithin(32, 33);
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
                .engage((e) => fail(e.message), () => null);
        });
    });

    describe("generateNewUserKeySet", () => {
        it("generates both user and device keys", () => {
            Recrypt.generateNewUserKeySet().engage(
                (e) => fail(e),
                (keys: any) => {
                    expect(Object.keys(keys)).toBeArrayOfSize(3);
                    expect(keys.userKeys.publicKey.x.length).toBeWithin(31, 33);
                    expect(keys.userKeys.publicKey.y.length).toBeWithin(31, 33);
                    expect(keys.userKeys.publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.privateKey).toEqual(expect.any(Uint8Array));
                    expect(keys.userKeys.privateKey.length).toBeWithin(31, 33);

                    expect(keys.deviceKeys.publicKey.x.length).toBeWithin(31, 33);
                    expect(keys.deviceKeys.publicKey.y.length).toBeWithin(31, 33);
                    expect(keys.deviceKeys.publicKey.x).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.publicKey.y).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.privateKey).toEqual(expect.any(Uint8Array));
                    expect(keys.deviceKeys.privateKey.length).toBeWithin(31, 33);

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

                    expect(keys.publicKey.x.length).toBeWithin(31, 33);
                    expect(keys.publicKey.y.length).toBeWithin(31, 33);

                    expect(keys.privateKey.length).toBeWithin(31, 33);
                    expect(keys.plaintext.length).toBeWithin(383, 385);
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
                        expect(transformKey.ephemeralPublicKey.x.length).toBeWithin(32, 33);
                        expect(transformKey.ephemeralPublicKey.y.length).toBeWithin(32, 33);

                        expect(transformKey.toPublicKey.x).toEqual(expect.any(Uint8Array));
                        expect(transformKey.toPublicKey.y).toEqual(expect.any(Uint8Array));
                        expect(transformKey.toPublicKey.x.length).toBeWithin(32, 33);
                        expect(transformKey.toPublicKey.y.length).toBeWithin(32, 33);

                        expect(transformKey.publicSigningKey).toEqual(signingKeys.publicKey);

                        expect(transformKey.signature).toEqual(expect.any(Uint8Array));
                        expect(transformKey.signature.length).toEqual(64);
                    }
                );
        });
    });

    describe("generateTransformKeyToList", () => {
        it("fails when invalid public key is sent in", (done) => {
            const key1 = {
                masterPublicKey: {
                    x: "AAAA",
                    y: "AA==",
                },
                id: "user-1",
            };
            const key2 = {
                masterPublicKey: {
                    x: "AAA=",
                    y: "AAAA",
                },
                id: "user-2",
            };
            const signingKeys = TestUtils.getSigningKeyPair();

            Recrypt.generateTransformKeyToList(new Uint8Array(32), [key1, key2], signingKeys).engage(
                (e) => {
                    expect(e.message).toBeString();
                    done();
                },
                () => fail("Transform should fail when public keys are not valid")
            );
        });

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
                    expect(key[0].length).toBeWithin(383, 385);
                    expect(key[1]).toEqual(expect.any(Uint8Array));
                    expect(key[1].length).toBeWithin(32, 33);
                }
            );
        });
    });

    describe("encryptDocumentKey", () => {
        it("fails when provided public key is invalid", (done) => {
            const signingKeys = TestUtils.getSigningKeyPair();
            const publicKey = {
                x: toByteArray("AAAA"),
                y: toByteArray("AA=="),
            };
            Recrypt.encryptPlaintext(new Uint8Array(384), publicKey, signingKeys).engage(
                (e) => {
                    expect(e.message).toBeString();
                    done();
                },
                () => fail("Method should reject when invalid public keys are provided")
            );
        });

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
        it("fails when provided public key is invalid", (done) => {
            const user1 = {
                id: "user1",
                masterPublicKey: {
                    x: "AAAA",
                    y: "AAA=",
                },
            };

            const user2 = {
                id: "user2",
                masterPublicKey: {
                    x: "AA==",
                    y: "AAAA",
                },
            };
            const signingKeys = TestUtils.getSigningKeyPair();

            Recrypt.encryptPlaintextToList(new Uint8Array(384), [user1, user2], signingKeys).engage(
                (e) => {
                    expect(e.message).toBeString();
                    done();
                },
                () => fail("Method should reject when invalid public keys are provided")
            );
        });

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
                        "publicSigningKey",
                        "signature",
                    ]);
                    expect(encryptedKeys[0].encryptedPlaintext.ephemeralPublicKey).toContainAllKeys(["x", "y"]);
                    expect(encryptedKeys[0].id).toEqual("user1");

                    expect(encryptedKeys[1].publicKey).toEqual(user2.masterPublicKey);
                    expect(encryptedKeys[1].encryptedPlaintext).toContainAllKeys([
                        "encryptedMessage",
                        "ephemeralPublicKey",
                        "authHash",
                        "publicSigningKey",
                        "signature",
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
            //Generate a real ed25519 keypair here because otherwise the zero-padding that'll happen with empty byte arrays will cause decryption to fail
            const {publicKey, secretKey} = generateKeyPair();
            const plaintext = new Uint8Array(384);
            Recrypt.generateNewUserKeySet()
                .flatMap((keys) =>
                    Recrypt.encryptPlaintext(plaintext, keys.userKeys.publicKey, {publicKey, privateKey: secretKey}).map((encryptedDoc) => ({
                        userPrivKey: keys.userKeys.privateKey,
                        encryptedDoc,
                    }))
                )
                .flatMap(({encryptedDoc, userPrivKey}) => {
                    const transformedEncryptedKey = {
                        ...encryptedDoc,
                        encryptedSymmetricKey: encryptedDoc.encryptedMessage,
                        transformBlocks: [],
                    };
                    return Recrypt.decryptPlaintext(transformedEncryptedKey, userPrivKey);
                })
                .engage(
                    (e) => fail(e),
                    ([plaintextResult, symmetricKey]) => {
                        expect(plaintextResult).toEqual(plaintext);
                        expect(symmetricKey).toEqual(expect.any(Uint8Array));
                        expect(symmetricKey.length).toBeWithin(32, 33);
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
            expect(signatureDetails.signature).toEqual("ak8bw9yCciX+hXczelhPK1xtxdyRjmwrhp4hHR38vf5WY8y3fV8DLgAbw0rllXLuFqvgMbYDiTpBcgTX/TsUAg==");
        });
    });

    describe("generateDeviceAddSignature", () => {
        it("generates the expected signature", (done) => {
            const fixedTS = 1234567890123;
            spyOn(Date, "now").and.returnValue(fixedTS);

            spyOn(CryptoUtils, "generateRandomBytes").and.callFake(() => {
                return Future.of(toByteArray("iofzenON27PeYqmCcCTxxZxKWsH1DBWpb04Brsa6GDo="));
            });

            const userKeys = {
                publicKey: {
                    x: toByteArray("iofzenON27PeYqmCcCTxxZxKWsH1DBWpb04Brsa6GDo="),
                    y: toByteArray("O918eBCWdImkkA7jIcHk3dPhf08TudRmgODFgdXJzHk="),
                },
                privateKey: toByteArray("VeGnAnn6ShDPTR9iHEy0hIX09EAIwqGo5GUZee7PqwU="),
            };
            const transformKey = {
                ephemeralPublicKey: {
                    x: toByteArray("Ft3BGLPh8FvTsuHGUt+lOYQ5kVPJXeEgP/OHq+T0ijM="),
                    y: toByteArray("RLsEaIquAnODxB5O6j6I64uDZ0OZsfnbaimovIOLiH0="),
                },
                toPublicKey: {
                    x: toByteArray("HAq+UwydnbKWinz8zN3G450habvUXGObpHj+eHRSpk8="),
                    y: toByteArray("cuiW6xby5ftFfFQbsbAk+K9UivIA665/JUkH4XJzL0o="),
                },
                encryptedTempKey: toByteArray(
                    "edPkkzVjPVQlKdCGQAtx2nVugbqy1sJ6MNufPyeIAb0HgF9LTiRO9LMOCs9wfY4etPR7R5bvc39nOcF9wiElijc6jbm8LuW4YUtNf4MnZEzlb1mV8yvG9w1da6gSBsZwIWc6H874m9+n2N3xHGsf6SnOzIcgC2L/nGP2rnzHCx8dVsNiXMROHcwULtpSzFnUgGOcQMiAL6dm6sIOCU/XClw6p78Ia8TN6XqjFmVMoSsJF18l5aJDgInhMW8acozVI6b/mLtx1jZoTn5QFnW0zGG/jcZgKHTqckpCM2bBm60X6QH6dZ+oWIeKv9ncI/tOA2w7EwkgP4wPJuAGf1cYrioEDCJmN81SxtiURPHK1VS85iUOBLv5N++C7Hu0KyHbLqxsfLoIjtwNIn8E2S1p+FJu6T0XywtC8xaW03i5X3QyDi46PTYWGA65DTZ+izylctaYwWSWODcsFZbEGVzBT4GJYgJb3fUGRBzWqpWyfS2p78MNpXNGAKc6xTt4uGyF"
                ),
                hashedTempKey: toByteArray(
                    "W00HUTpinwT6Fq/S22nLc07cemjf+1KOGxxe7WrtalROQsrT2WCURC1KZBwL3s3wZPpW6bSHzux7FUxtHYSNSjjo2xHyb+q5SNB3q16pU9GGKQMBlLvCwLgVBm/UvoAUaGlLplILlUEzkt4McWbWS38HxPfr2tjGYvEXnljA2A4="
                ),
                publicSigningKey: toByteArray("O2onvM62pC1io6jQKm8Nc2UyFXcd4kOmOsBIoYtZ2ik="),
                signature: toByteArray("509HLURLeCTBC8C4PLkHEHQT/WA8GNZjhKTdCqm4WSJtgEdLSG7Mvk86OYbqQYVjEZu6eg2w8dMWZkIUulLcCg=="),
            };

            Recrypt.generateDeviceAddSignature("jwt", userKeys, transformKey).engage(
                (e) => fail(e.message),
                (signature) => {
                    expect(signature.ts).toEqual(fixedTS);
                    expect(fromByteArray(signature.signature)).toEqual(
                        "c5MyGAzO2Gqi27OuBMYqXBXOdjsGp0lGfd5lKsxix95iLK4hdjwmfzI40746Sn293Xgy6ewW4y3Ll/DT1qdFRQ=="
                    );
                    done();
                }
            );
        });
    });
});

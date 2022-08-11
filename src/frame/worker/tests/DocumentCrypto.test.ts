import * as DocumentCrypto from "../DocumentCrypto";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as AES from "../crypto/aes";
import * as Recrypt from "../crypto/recrypt";
import {ErrorCodes} from "../../../Constants";

describe("DocumentCrypto", () => {
    describe("decryptDocument", () => {
        it("decrypts document key and then decrypts document", () => {
            const decryptedKey = new Uint8Array(22);
            const plaintext = new Uint8Array(384);
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>([plaintext, decryptedKey]));
            jest.spyOn(AES, "decryptDocument").mockReturnValue(Future.of<any>("decrypted document"));

            const testDoc = TestUtils.getEncryptedDocument();
            const symKey = TestUtils.getTransformedSymmetricKey();
            const privKey = new Uint8Array(32);
            DocumentCrypto.decryptDocument(testDoc, symKey, privKey).engage(
                (e) => {
                    throw e;
                },
                (decryptedData: any) => {
                    expect(decryptedData).toEqual("decrypted document");
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(symKey, privKey);
                    expect(AES.decryptDocument).toHaveBeenCalledWith(expect.any(Uint8Array), decryptedKey, expect.any(Uint8Array));
                }
            );
        });

        it("maps failures to SDK error with specific error code", () => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decryption failure")));

            DocumentCrypto.decryptDocument(TestUtils.getEncryptedDocument(), TestUtils.getTransformedSymmetricKey(), new Uint8Array(32)).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decryption failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_DECRYPT_FAILURE);
                },
                () => fail("success handler should not be invoked when operation fails")
            );
        });
    });

    describe("encryptDocument", () => {
        it("generates document key and then encrypts key and document to list of users", () => {
            const generatedKey = new Uint8Array(38);
            const generatedPlaintext = new Uint8Array(384);
            const data = new Uint8Array(91);
            const dataNonce = new Uint8Array(12);

            const encryptedUserKeyList = [
                {
                    publicKey: "firstPK",
                    encryptedSymmetricKey: "firstESK",
                },
            ];

            jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.of<any>([generatedPlaintext, generatedKey]));
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockImplementation((_: any, keyList: any) => {
                if (keyList.length) {
                    return Future.of<any>(encryptedUserKeyList);
                }
                return Future.of<any>([]);
            });
            jest.spyOn(AES, "encryptDocument").mockReturnValue(
                Future.of<any>({
                    data,
                    dataNonce,
                })
            );

            const docToEncrypt = new Uint8Array(35);
            const userPublicKeyList = [{id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
            const signingKeys = TestUtils.getSigningKeyPair();

            DocumentCrypto.encryptDocument(docToEncrypt, userPublicKeyList, [], signingKeys).engage(
                (e) => {
                    throw e;
                },
                (decryptedData: any) => {
                    expect(decryptedData).toEqual({
                        userAccessKeys: encryptedUserKeyList,
                        groupAccessKeys: [],
                        encryptedDocument: {data, dataNonce},
                    });
                    expect(Recrypt.generateDocumentKey).toHaveBeenCalledWith();
                    expect((Recrypt.encryptPlaintextToList as jasmine.Spy).calls.count()).toEqual(2);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, userPublicKeyList, signingKeys);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, [], signingKeys);
                    expect(AES.encryptDocument).toHaveBeenCalledWith(docToEncrypt, generatedKey);
                }
            );
        });

        it("generates document key and encrypts to list of groups when provided", () => {
            const generatedKey = new Uint8Array(38);
            const generatedPlaintext = new Uint8Array(384);
            const data = new Uint8Array(91);
            const dataNonce = new Uint8Array(12);

            const encryptedGroupKeyList = [
                {
                    publicKey: "firstPK",
                    encryptedSymmetricKey: "firstESK",
                },
            ];

            jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.of<any>([generatedPlaintext, generatedKey]));
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockImplementation((_: any, keyList: any) => {
                if (keyList.length) {
                    return Future.of<any>(encryptedGroupKeyList);
                }
                return Future.of<any>([]);
            });
            jest.spyOn(AES, "encryptDocument").mockReturnValue(
                Future.of<any>({
                    data,
                    dataNonce,
                })
            );

            const docToEncrypt = new Uint8Array(35);
            const groupPublicKeyList = [{id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
            const signingKeys = TestUtils.getSigningKeyPair();

            DocumentCrypto.encryptDocument(docToEncrypt, [], groupPublicKeyList, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (decryptedData: any) => {
                    expect(decryptedData).toEqual({
                        userAccessKeys: [],
                        groupAccessKeys: encryptedGroupKeyList,
                        encryptedDocument: {data, dataNonce},
                    });
                    expect(Recrypt.generateDocumentKey).toHaveBeenCalledWith();
                    expect((Recrypt.encryptPlaintextToList as jasmine.Spy).calls.count()).toEqual(2);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, groupPublicKeyList, signingKeys);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, [], signingKeys);
                    expect(AES.encryptDocument).toHaveBeenCalledWith(docToEncrypt, generatedKey);
                }
            );
        });

        it("generates document key and encrypts to both users and groups when provided", () => {
            const generatedKey = new Uint8Array(38);
            const generatedPlaintext = new Uint8Array(384);
            const data = new Uint8Array(91);
            const dataNonce = new Uint8Array(12);

            const encryptedUserKeyList = [{publicKey: "firstUserPK", encryptedSymmetricKey: "firstUserESK"}];
            const encryptedGroupKeyList = [
                {publicKey: "firstGroupPK", encryptedSymmetricKey: "firstGroupESK"},
                {publicKey: "secondGroupPK", encryptedSymmetricKey: "secoGroupESK"},
            ];

            jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.of<any>([generatedPlaintext, generatedKey]));
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockImplementation((_: any, keyList: any) => {
                if (keyList.length === 1) {
                    return Future.of<any>(encryptedUserKeyList);
                }
                return Future.of<any>(encryptedGroupKeyList);
            });
            jest.spyOn(AES, "encryptDocument").mockReturnValue(
                Future.of<any>({
                    data,
                    dataNonce,
                })
            );

            const docToEncrypt = new Uint8Array(35);
            const userPublicKeyList = [{id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
            const groupPublicKeyList = [
                {id: "group-13", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "group-39", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const signingKeys = TestUtils.getSigningKeyPair();

            DocumentCrypto.encryptDocument(docToEncrypt, userPublicKeyList, groupPublicKeyList, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (decryptedData: any) => {
                    expect(decryptedData).toEqual({
                        userAccessKeys: encryptedUserKeyList,
                        groupAccessKeys: encryptedGroupKeyList,
                        encryptedDocument: {data, dataNonce},
                    });
                    expect(Recrypt.generateDocumentKey).toHaveBeenCalledWith();
                    expect((Recrypt.encryptPlaintextToList as jasmine.Spy).calls.count()).toEqual(2);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, userPublicKeyList, signingKeys);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(generatedPlaintext, groupPublicKeyList, signingKeys);
                    expect(AES.encryptDocument).toHaveBeenCalledWith(docToEncrypt, generatedKey);
                }
            );
        });

        it("maps failures to SDK error with specific error code", () => {
            jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.reject(new Error("generate doc key failure")));

            DocumentCrypto.encryptDocument(new Uint8Array(35), [], [], TestUtils.getSigningKeyPair()).engage(
                (error) => {
                    expect(error.message).toEqual("generate doc key failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_ENCRYPT_FAILURE);
                },
                () => fail("success handler should not be invoked when operation fails")
            );
        });
    });

    describe("reEncryptDocument", () => {
        it("decrypts document key and then encrypts document", () => {
            const decryptKey = new Uint8Array(38);
            const plaintext = new Uint8Array(384);
            const decryptResult = {
                data: new Uint8Array(91),
                dataNonce: new Uint8Array(12),
            };

            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>([plaintext, decryptKey]));
            jest.spyOn(AES, "encryptDocument").mockReturnValue(Future.of<any>(decryptResult));

            const symKey = TestUtils.getTransformedSymmetricKey();
            const newData = new Uint8Array(35);
            const privKey = new Uint8Array(32);

            DocumentCrypto.reEncryptDocument(newData, symKey, privKey).engage(
                (e) => {
                    throw e;
                },
                (decryptedData: any) => {
                    expect(decryptedData).toEqual(decryptResult);
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(symKey, privKey);
                    expect(AES.encryptDocument).toHaveBeenCalledWith(newData, decryptKey);
                }
            );
        });

        it("maps failures to SDK error with specific error code", () => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decrypt failure")));
            DocumentCrypto.reEncryptDocument(new Uint8Array(35), TestUtils.getTransformedSymmetricKey(), new Uint8Array(32)).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decrypt failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_REENCRYPT_FAILURE);
                },
                () => fail("success handler should not be invoked when operation fails")
            );
        });
    });

    describe("encryptToKeys", () => {
        it("encrypts new list of symmetric keys and calls document grant endpoint", () => {
            const decryptPlaintext = new Uint8Array(384);
            const decryptKey = new Uint8Array(5);
            const EncryptedAccessKeyList = [
                {
                    publicKey: "firstPK",
                    encryptedSymmetricKey: "firstESK",
                },
                {
                    publicKey: "secondPK",
                    encryptedSymmetricKey: "secondESK",
                },
            ];

            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>([decryptPlaintext, decryptKey]));
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>(EncryptedAccessKeyList));

            const userList = [
                {id: "abc-123", masterPublicKey: {x: "", y: ""}},
                {id: "def-456", masterPublicKey: {x: "", y: ""}},
            ];
            const groupList = [{id: "group-353", masterPublicKey: {x: "", y: ""}}];
            const encryptedSymKey = TestUtils.getTransformedSymmetricKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            DocumentCrypto.encryptToKeys(TestUtils.getTransformedSymmetricKey(), userList, groupList, new Uint8Array(32), signingKeys).engage(
                (e) => fail(e.message),
                (resp: any) => {
                    expect(resp).toEqual({
                        userAccessKeys: EncryptedAccessKeyList,
                        groupAccessKeys: EncryptedAccessKeyList,
                    });
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(encryptedSymKey, new Uint8Array(32));
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(decryptPlaintext, userList, signingKeys);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(decryptPlaintext, groupList, signingKeys);
                }
            );
        });

        it("maps failures to SDK error with specific error code", () => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decrypt failure")));
            DocumentCrypto.encryptToKeys(TestUtils.getTransformedSymmetricKey(), [], [], new Uint8Array(32), TestUtils.getSigningKeyPair()).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decrypt failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_GRANT_ACCESS_FAILURE);
                },
                () => fail("success handler should not be invoked when operation fails")
            );
        });
    });
});

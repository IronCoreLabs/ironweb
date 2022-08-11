import * as DocumentOperations from "../DocumentOperations";
import Future from "futurejs";
import * as WorkerMediator from "../../WorkerMediator";
import * as TestUtils from "../../../tests/TestUtils";

describe("DocumentOperations", () => {
    describe("decryptDocument", () => {
        it("decrypts document key and then decrypts document", () => {
            jest.spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: {decryptedDocument: "decrypted doc"}}));

            const testDoc = TestUtils.getEncryptedDocument();
            const symKey = TestUtils.getTransformedSymmetricKey();
            const privKey = new Uint8Array(32);

            DocumentOperations.decryptDocument(testDoc, symKey, privKey).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("decrypted doc");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: expect.any(String),
                            message: {
                                document: testDoc,
                                encryptedSymmetricKey: symKey,
                                privateKey: privKey,
                            },
                        },
                        [testDoc.content]
                    );
                }
            );
        });
    });

    describe("encryptNewDocumentToList", () => {
        it("generates document key and then encrypts key and document", () => {
            const docToEncrypt = new Uint8Array(35);
            const userList = [
                {id: "user1", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user-3", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const groupList = [
                {id: "group3", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "group-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const signingKeys = TestUtils.getSigningKeyPair();

            jest.spyOn(WorkerMediator, "sendMessage").and.returnValue(
                Future.of({
                    message: {
                        encryptedSymmetricKey: "encryptedSymKey",
                        userKeyList: [{key: "user1key"}, {key: "user2key"}],
                        groupKeyList: [{key: "group1key"}, {key: "group2key"}],
                    },
                })
            );

            DocumentOperations.encryptNewDocumentToList(docToEncrypt, userList, groupList, signingKeys).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({
                        encryptedSymmetricKey: "encryptedSymKey",
                        userKeyList: [{key: "user1key"}, {key: "user2key"}],
                        groupKeyList: [{key: "group1key"}, {key: "group2key"}],
                    });
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: expect.any(String),
                            message: {
                                document: docToEncrypt,
                                userKeyList: userList,
                                groupKeyList: groupList,
                                signingKeys,
                            },
                        },
                        [docToEncrypt]
                    );
                }
            );
        });
    });

    describe("reEncryptDocument", () => {
        it("decrypts document key and then encrypts document", () => {
            const symKey = TestUtils.getTransformedSymmetricKey();
            const newData = new Uint8Array(35);
            const privKey = new Uint8Array(32);

            jest.spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: {encryptedDocument: "encrypted doc"}}));

            DocumentOperations.reEncryptDocument(newData, symKey, privKey).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("encrypted doc");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: expect.any(String),
                            message: {
                                document: newData,
                                existingDocumentSymmetricKey: symKey,
                                privateKey: privKey,
                            },
                        },
                        [newData]
                    );
                }
            );
        });
    });

    describe("encryptDocumentToKeys", () => {
        it("encrypts new list of symmetric keys and calls document grant endpoint", () => {
            const symKey = TestUtils.getTransformedSymmetricKey();
            const privKey = new Uint8Array(32);
            const userList = [
                {id: "abc-123", masterPublicKey: {x: "", y: ""}},
                {id: "def-456", masterPublicKey: {x: "", y: ""}},
            ];
            const groupList = [{id: "group-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();

            jest.spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "list of keys"}));

            DocumentOperations.encryptDocumentToKeys(symKey, userList, groupList, privKey, signingKeys).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("list of keys");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: expect.any(String),
                        message: {
                            userKeyList: userList,
                            groupKeyList: groupList,
                            symmetricKey: symKey,
                            privateKey: privKey,
                            signingKeys,
                        },
                    });
                }
            );
        });
    });
});

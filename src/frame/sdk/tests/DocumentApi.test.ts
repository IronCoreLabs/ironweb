import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import * as TestUtils from "../../../tests/TestUtils";
import ApiState from "../../ApiState";
import DocumentApiEndpoints from "../../endpoints/DocumentApiEndpoints";
import GroupApiEndpoints from "../../endpoints/GroupApiEndpoints";
import PolicyApiEndpoints from "../../endpoints/PolicyApiEndpoints";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import * as DocumentApi from "../DocumentApi";
import * as DocumentOperations from "../DocumentOperations";

describe("DocumentApi", () => {
    const privateDeviceKey = new Uint8Array([23]);
    const publicDeviceKey = TestUtils.getEmptyPublicKey();
    beforeEach(() => {
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys({publicKey: publicDeviceKey, privateKey: privateDeviceKey}, TestUtils.getSigningKeyPair());
    });

    describe("list", () => {
        it("retrieves list of documents from store", (done) => {
            const dataList = [
                {
                    id: "user-10",
                    name: "my doc 10",
                    association: {type: "owner"},
                    created: "1",
                    updated: "2",
                },
                {
                    id: "user-12",
                    name: null,
                    association: {type: "fromUser"},
                    created: "3",
                    updated: "4",
                },
            ];

            jest.spyOn(DocumentApiEndpoints, "callDocumentListApi").mockReturnValue(Future.of<any>({result: dataList}));

            DocumentApi.list().engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result) => {
                    expect(result).toEqual({
                        result: [
                            {documentID: "user-10", documentName: "my doc 10", association: "owner", created: "1", updated: "2"},
                            {documentID: "user-12", documentName: null, association: "fromUser", created: "3", updated: "4"},
                        ],
                    });
                    done();
                }
            );
        });
    });

    describe("getDocumentMeta", () => {
        it("returns document and maps results", (done) => {
            const docMeta = {
                id: "my-doc",
                name: "My Doc",
                association: {type: "owner"},
                visibleTo: [],
                created: "1",
                updated: "2",
            };

            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(Future.of<any>(docMeta));

            DocumentApi.getDocumentMeta("my-doc").engage(
                (e) => done(e),
                (result: any) => {
                    expect(result).toEqual({
                        documentID: "my-doc",
                        documentName: "My Doc",
                        association: "owner",
                        visibleTo: [],
                        created: "1",
                        updated: "2",
                    });
                    done();
                }
            );
        });
    });

    describe("decryptHostedDoc", () => {
        it("returns raw bytes if provided as option", (done) => {
            const existingDocument = TestUtils.getEncryptedDocumentResponse();

            jest.spyOn(DocumentApiEndpoints, "callDocumentGetApi").mockReturnValue(Future.of<any>(existingDocument));
            jest.spyOn(DocumentOperations, "decryptDocument").mockReturnValue(Future.of<any>(new Uint8Array([36, 89, 72])));

            DocumentApi.decryptHostedDoc("doc key").engage(
                (e) => done(e),
                ({data, documentID, documentName, visibleTo, association}) => {
                    expect(documentID).toEqual("docID");
                    expect(documentName).toEqual("my doc");
                    expect(association).toEqual("owner");
                    expect(visibleTo).toEqual({
                        users: [{id: "user-11"}, {id: "user-33"}],
                        groups: [{id: "group-34", name: "ICL"}],
                    });
                    expect(data.length).toEqual(3);
                    expect(data[0]).toEqual(36);
                    expect(data[1]).toEqual(89);
                    expect(data[2]).toEqual(72);

                    expect(DocumentApiEndpoints.callDocumentGetApi).toHaveBeenCalledWith("doc key");
                    done();
                }
            );
        });
    });

    describe("decryptLocalDoc", () => {
        it("rejects if provided encrypted document is not a supported version", () => {
            const doc = new Uint8Array([8, 23, 235, 2]);
            DocumentApi.decryptLocalDoc("docID", doc).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                },
                () => {
                    throw new Error("Should reject when provided document is an unsupported version");
                }
            );
        });

        it("returns doc in raw bytes when asked", () => {
            const eDoc = new Uint8Array([2, 35, 52, 13, 63, 23, 63, 34]);
            const decryptedBytes = new Uint8Array([36, 89, 72]);
            const docMeta = TestUtils.getEncryptedDocumentMetaResponse();

            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(Future.of<any>(docMeta));
            jest.spyOn(DocumentOperations, "decryptDocument").mockReturnValue(Future.of<any>(decryptedBytes));

            DocumentApi.decryptLocalDoc("docID", eDoc).engage(
                (e) => {
                    throw new Error(e.message);
                },
                ({data, documentID, documentName, visibleTo, association}) => {
                    expect(documentID).toEqual("docID");
                    expect(documentName).toEqual("my doc");
                    expect(association).toEqual("owner");
                    expect(visibleTo).toEqual({
                        users: [{id: "user-11"}, {id: "user-33"}],
                        groups: [{id: "group-34", name: "ICL"}],
                    });
                    expect(data).toEqual(decryptedBytes);
                }
            );
        });
    });

    describe("encryptToStore", () => {
        it("encrypts document and saves it to store for the current user", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar", name: "my doc", created: "1", updated: "2"}));

            DocumentApi.encryptToStore("doc key", new Uint8Array([88, 73, 92]), "", [], [], true).engage(
                (e) => {
                    throw new Error(e.message);
                },
                (data: any) => {
                    expect(data).toEqual({documentID: "bar", documentName: "my doc", created: "1", updated: "2"});
                    const currentUserRecord = {
                        id: "user-10",
                        masterPublicKey: {
                            x: TestUtils.userPublicXString,
                            y: TestUtils.userPublicYString,
                        },
                    };
                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        [currentUserRecord],
                        [],
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith(
                        "doc key",
                        "AgAdeyJfZGlkXyI6ImRvYyBrZXkiLCJfc2lkXyI6MX1ub25jZWJhc2U=",
                        [{id: "user-10", key: encryptedSymKey}],
                        [],
                        ""
                    );
                    done();
                }
            );
        });

        it("uses provided name in create options", (done) => {
            const docName = "my doc";
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar", name: docName, created: "1", updated: "2"}));
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );

            DocumentApi.encryptToStore("doc key", new Uint8Array([88, 73, 92]), docName, [], [], true).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({documentID: "bar", documentName: "my doc", created: "1", updated: "2"});
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith(
                        "doc key",
                        "AgAdeyJfZGlkXyI6ImRvYyBrZXkiLCJfc2lkXyI6MX1ub25jZWJhc2U=",
                        [{id: "user-10", key: encryptedSymKey}],
                        [],
                        "my doc"
                    );
                    done();
                }
            );
        });

        it("encrypts to list of users and groups provided one", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [
                        {id: "user-55", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                    ],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar", name: "my doc", created: "1", updated: "2"}));

            DocumentApi.encryptToStore("doc key", new Uint8Array([88, 73, 92]), "", ["user-55", "user-33"], ["user-33"], true).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({documentID: "bar", documentName: "my doc", created: "1", updated: "2"});
                    const userKeyList = [
                        {id: "user-55", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-10", masterPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString}},
                    ];
                    const groupKeyList = [{id: "group-20", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];

                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        userKeyList,
                        groupKeyList,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith(
                        "doc key",
                        "AgAdeyJfZGlkXyI6ImRvYyBrZXkiLCJfc2lkXyI6MX1ub25jZWJhc2U=",
                        [{id: "user-10", key: encryptedSymKey}],
                        [],
                        ""
                    );
                    done();
                }
            );
        });

        it("fails if any users or groups cannot be found", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );

            DocumentApi.encryptToStore("doc key", new Uint8Array([88, 73, 92]), "", ["user-55", "user-33"], ["group-20"], true).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.message).toContain("[user-55]");
                    done();
                },
                () => done("Create should not succeed if not all users or groups can be found")
            );
        });
    });

    describe("encryptLocalDocument", () => {
        it("encrypts document to current user and returns expected document package", () => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar"}));

            DocumentApi.encryptLocalDocument("mydocID", new Uint8Array([]), "", [], [], true).engage(
                (e) => {
                    throw new Error(e.message);
                },
                ({document, documentID, documentName}) => {
                    expect(documentID).toEqual("bar");
                    expect(documentName).toBeUndefined();
                    // prettier-ignore
                    expect(document).toEqual(new Uint8Array([2, 0, 29, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 109, 121, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 49, 125, 110, 111, 110, 99, 101, 98, 97, 115, 101]));
                    const currentUserRecord = {
                        id: "user-10",
                        masterPublicKey: {
                            x: TestUtils.userPublicXString,
                            y: TestUtils.userPublicYString,
                        },
                    };
                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([]),
                        [currentUserRecord],
                        [],
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith("mydocID", null, [{id: "user-10", key: encryptedSymKey}], [], "");
                }
            );
        });

        it("sets proper document name when provided", () => {
            const docName = "my doc";
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "mydocID", name: docName}));

            DocumentApi.encryptLocalDocument("mydocID", new Uint8Array([]), docName, [], [], true).engage(
                (e) => {
                    throw new Error(e.message);
                },
                ({document, documentID, documentName}) => {
                    expect(documentID).toEqual("mydocID");
                    expect(documentName).toEqual(docName);
                    // prettier-ignore
                    expect(document).toEqual(new Uint8Array([2, 0, 29, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 109, 121, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 49, 125, 110, 111, 110, 99, 101, 98, 97, 115, 101]));
                }
            );
        });

        it("encrypts to list of users and groups provided two", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [
                        {id: "user-55", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                    ],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", key: encryptedSymKey}],
                    groupAccessKeys: [],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar"}));

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", ["user-55", "user-33"], ["user-33"], true).engage(
                (e) => done(e),
                ({documentID, documentName, document}) => {
                    expect(documentID).toEqual("bar");
                    expect(documentName).toBeUndefined();
                    expect(document).toEqual(expect.any(Uint8Array));

                    const userKeyList = [
                        {id: "user-55", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-10", masterPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString}},
                    ];
                    const groupKeyList = [{id: "group-20", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];

                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        userKeyList,
                        groupKeyList,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith("doc key", null, [{id: "user-10", key: encryptedSymKey}], [], "");
                    done();
                }
            );
        });

        it("encrypts to list of users and groups provided, but not the calling user", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-33", key: encryptedSymKey}],
                    groupAccessKeys: [{id: "group-20", key: encryptedSymKey}],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar"}));

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", ["user-33"], ["group-20"], false).engage(
                (e) => done(e),
                ({documentID, documentName, document}) => {
                    expect(documentID).toEqual("bar");
                    expect(documentName).toBeUndefined();
                    expect(document).toEqual(expect.any(Uint8Array));

                    const userKeyList = [{id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
                    const groupKeyList = [{id: "group-20", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];

                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        userKeyList,
                        groupKeyList,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith(
                        "doc key",
                        null,
                        [{id: "user-33", key: encryptedSymKey}],
                        [{id: "group-20", key: encryptedSymKey}],
                        ""
                    );
                    done();
                }
            );
        });

        it("encrypts to users and groups from a policy", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(PolicyApiEndpoints, "callApplyPolicyApi").mockReturnValue(
                Future.of<any>({
                    usersAndGroups: [
                        {id: "group-20", type: "group", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", type: "user", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                    ],
                    invalidUsersAndGroups: [],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-33", key: encryptedSymKey}],
                    groupAccessKeys: [{id: "group-20", key: encryptedSymKey}],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar"}));

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", [], [], false, undefined).engage(
                (e) => done(e),
                ({documentID, documentName, document}) => {
                    expect(documentID).toEqual("bar");
                    expect(documentName).toBeUndefined();
                    expect(document).toEqual(expect.any(Uint8Array));

                    const userKeyList = [{id: "user-33", type: "user", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
                    const groupKeyList = [{id: "group-20", type: "group", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];

                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        userKeyList,
                        groupKeyList,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentCreateApi).toHaveBeenCalledWith(
                        "doc key",
                        null,
                        [{id: "user-33", key: encryptedSymKey}],
                        [{id: "group-20", key: encryptedSymKey}],
                        ""
                    );
                    done();
                }
            );
        });

        it("fails if the policy has invalid users or groups", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(PolicyApiEndpoints, "callApplyPolicyApi").mockReturnValue(
                Future.of<any>({
                    usersAndGroups: [{id: "group-20", type: "group", masterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                    invalidUsersAndGroups: [{id: "user-33", type: "user"}],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-33", key: encryptedSymKey}],
                    groupAccessKeys: [{id: "group-20", key: encryptedSymKey}],
                    encryptedDocument,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentCreateApi").mockReturnValue(Future.of<any>({id: "bar"}));

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", [], [], false, undefined).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.message).toContain("[user-33]");
                    done();
                },
                (_) => done("This should not succeed.")
            );
        });

        it("fails if any of the users or groups cannot be found", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                })
            );

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", ["user-33"], ["group-20", "group-33"], true).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.message).toContain("[group-33]");
                    done();
                },
                () => done("Should not call create when any user or group could not be found")
            );
        });

        it("fails if there is no one to encrypt to.", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [],
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [],
                })
            );

            DocumentApi.encryptLocalDocument("doc key", new Uint8Array([88, 73, 92]), "", [], [], false).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.message).toBe("Failed to create document due to no users or groups to share with.");
                    done();
                },
                () => done("Should not call create when no users or groups could be found")
            );
        });
    });

    describe("updateToStore", () => {
        it("gets current document and encrypts new data before saving", (done) => {
            const newDocument = TestUtils.getEncryptedDocument();
            const existingDocument = TestUtils.getEncryptedDocumentResponse();

            jest.spyOn(DocumentOperations, "reEncryptDocument").mockReturnValue(Future.of<any>(newDocument));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(Future.of<any>(existingDocument));
            jest.spyOn(DocumentApiEndpoints, "callDocumentUpdateApi").mockReturnValue(
                Future.of<any>({id: "bar", name: "updated doc", created: "1", updated: "2"})
            );

            DocumentApi.updateToStore("doc key", new Uint8Array([88, 73, 92])).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({documentID: "bar", documentName: "updated doc", created: "1", updated: "2"});
                    expect(DocumentOperations.reEncryptDocument).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        existingDocument.encryptedSymmetricKey,
                        expect.any(Uint8Array)
                    );
                    expect(DocumentApiEndpoints.callDocumentMetadataGetApi).toHaveBeenCalledWith("doc key");
                    expect(DocumentApiEndpoints.callDocumentUpdateApi).toHaveBeenCalledWith(
                        "doc key",
                        "AgAdeyJfZGlkXyI6ImRvYyBrZXkiLCJfc2lkXyI6MX1ub25jZWJhc2U="
                    );
                    done();
                }
            );
        });
    });

    describe("updateLocalDocument", () => {
        it("encrypts new document and returns package", () => {
            const newDocument = TestUtils.getEncryptedDocument();
            const existingDocument = TestUtils.getEncryptedDocumentResponse();

            jest.spyOn(DocumentOperations, "reEncryptDocument").mockReturnValue(Future.of<any>(newDocument));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(Future.of<any>(existingDocument));

            DocumentApi.updateLocalDocument("docID", new Uint8Array([88, 73, 92])).engage(
                (e) => {
                    throw new Error(e.message);
                },
                ({documentID, documentName, document}) => {
                    expect(documentID).toEqual("docID");
                    expect(documentName).toEqual("my doc");
                    // prettier-ignore
                    expect(document).toEqual(new Uint8Array([2, 0, 27, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 49, 125, 110, 111, 110, 99, 101, 98, 97, 115, 101]));
                    expect(DocumentOperations.reEncryptDocument).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        existingDocument.encryptedSymmetricKey,
                        privateDeviceKey
                    );
                    expect(DocumentApiEndpoints.callDocumentMetadataGetApi).toHaveBeenCalledWith("docID");
                }
            );
        });
    });

    describe("updateName", () => {
        it("invokes document update API and maps result subset", () => {
            jest.spyOn(DocumentApiEndpoints, "callDocumentUpdateApi").mockReturnValue(
                Future.of<any>({id: "bar", name: "updated doc", fromUserId: "user-33", created: "1", updated: "2"})
            );

            DocumentApi.updateName("doc-10", "new name").engage(
                (e) => {
                    throw new Error(e.message);
                },
                (response) => {
                    expect(response).toEqual({
                        documentID: "bar",
                        documentName: "updated doc",
                        created: "1",
                        updated: "2",
                    });
                    expect(DocumentApiEndpoints.callDocumentUpdateApi).toHaveBeenCalledWith("doc-10", undefined, "new name");
                }
            );
        });
    });

    describe("grantDocumentAccess", () => {
        it("runs all expected API calls and maps results to expected output for list of users", (done) => {
            const userKeys = [{id: "userID", userMasterPublicKey: {x: "getPublicKey"}}];
            const docSymKey = {
                encryptedSymmetricKey: "esk",
                ephemeralPublicKey: "epk",
                authorizationCode: "ac",
            };

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(
                Future.of<any>({
                    encryptedSymmetricKey: docSymKey,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentGrantApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userOrGroup: {type: "user", id: "userID"}}],
                    failedIds: [
                        {
                            userOrGroup: {type: "user", id: "userID2"},
                            errorMessage: "failed user",
                        },
                    ],
                })
            );
            jest.spyOn(GroupApiEndpoints, "getGroupPublicKeyList").mockReturnValue(Future.of<any>([]));
            jest.spyOn(DocumentOperations, "encryptDocumentToKeys").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: ["encryptedUserKey"],
                    groupAccessKeys: [],
                })
            );

            DocumentApi.grantDocumentAccess("docID", ["userID", "userID2"], []).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({
                        succeeded: [
                            {
                                id: "userID",
                                type: "user",
                            },
                        ],
                        failed: [
                            {
                                id: "userID2",
                                type: "user",
                                error: "failed user",
                            },
                        ],
                    });

                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["userID", "userID2"]);
                    expect(GroupApiEndpoints.getGroupPublicKeyList).toHaveBeenCalledWith([]);
                    expect(DocumentApiEndpoints.callDocumentMetadataGetApi).toHaveBeenCalledWith("docID");
                    expect(DocumentOperations.encryptDocumentToKeys).toHaveBeenCalledWith(
                        docSymKey,
                        [{id: "userID", masterPublicKey: {x: "getPublicKey"}}],
                        [],
                        privateDeviceKey,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentGrantApi).toHaveBeenCalledWith("docID", ["encryptedUserKey"], []);
                    done();
                }
            );
        });

        it("runs all expected operations and maps result for list of groups", (done) => {
            const groupKeys = [{id: "groupID", groupMasterPublicKey: {x: "groupPublicKey"}, foo: "bar"}];
            const docSymKey = {
                encryptedSymmetricKey: "esk",
                ephemeralPublicKey: "epk",
                authorizationCode: "ac",
            };

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: groupKeys}));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(
                Future.of<any>({
                    encryptedSymmetricKey: docSymKey,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentGrantApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userOrGroup: {type: "group", id: "groupID"}}],
                    failedIds: [],
                })
            );
            jest.spyOn(DocumentOperations, "encryptDocumentToKeys").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [],
                    groupAccessKeys: ["encryptedGroupKey"],
                })
            );

            DocumentApi.grantDocumentAccess("docID", [], ["groupID"]).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({
                        succeeded: [
                            {
                                id: "groupID",
                                type: "group",
                            },
                        ],
                        failed: [],
                    });

                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith([]);
                    expect(GroupApiEndpoints.callGroupKeyListApi).toHaveBeenCalledWith(["groupID"]);
                    expect(DocumentApiEndpoints.callDocumentMetadataGetApi).toHaveBeenCalledWith("docID");
                    expect(DocumentOperations.encryptDocumentToKeys).toHaveBeenCalledWith(
                        docSymKey,
                        [],
                        [{id: "groupID", masterPublicKey: {x: "groupPublicKey"}}],
                        privateDeviceKey,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentGrantApi).toHaveBeenCalledWith("docID", [], ["encryptedGroupKey"]);
                    done();
                }
            );
        });

        it("runs all of the above for lists of users and lists of groups", (done) => {
            const userKeys = [
                {id: "userID1", userMasterPublicKey: {x: "firstuserkey"}},
                {id: "userID2", userMasterPublicKey: {x: "seconduserkey"}},
            ];
            const groupKeys = [
                {id: "groupID1", groupMasterPublicKey: {x: "firstgroupkey"}},
                {id: "groupID2", groupMasterPublicKey: {x: "secondgroupkey"}},
            ];
            const docSymKey = {
                encryptedSymmetricKey: "esk",
                ephemeralPublicKey: "epk",
                authorizationCode: "ac",
            };

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: groupKeys}));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(
                Future.of<any>({
                    encryptedSymmetricKey: docSymKey,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentGrantApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userOrGroup: {type: "group", id: "groupID1"}}, {userOrGroup: {type: "user", id: "userID2"}}],
                    failedIds: [
                        {userOrGroup: {type: "group", id: "groupID2"}, errorMessage: "foo"},
                        {userOrGroup: {type: "user", id: "userID1"}, errorMessage: "bar"},
                    ],
                })
            );
            jest.spyOn(DocumentOperations, "encryptDocumentToKeys").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: ["encryptedUserKey"],
                    groupAccessKeys: ["encryptedGroupKey"],
                })
            );

            DocumentApi.grantDocumentAccess("docID", ["userID1", "userID2"], ["groupID1", "groupID2"]).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({
                        succeeded: [
                            {id: "groupID1", type: "group"},
                            {id: "userID2", type: "user"},
                        ],
                        failed: [
                            {id: "groupID2", type: "group", error: "foo"},
                            {id: "userID1", type: "user", error: "bar"},
                        ],
                    });

                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["userID1", "userID2"]);
                    expect(GroupApiEndpoints.callGroupKeyListApi).toHaveBeenCalledWith(["groupID1", "groupID2"]);
                    expect(DocumentApiEndpoints.callDocumentMetadataGetApi).toHaveBeenCalledWith("docID");
                    expect(DocumentOperations.encryptDocumentToKeys).toHaveBeenCalledWith(
                        docSymKey,
                        [
                            {id: "userID1", masterPublicKey: {x: "firstuserkey"}},
                            {id: "userID2", masterPublicKey: {x: "seconduserkey"}},
                        ],
                        [
                            {id: "groupID1", masterPublicKey: {x: "firstgroupkey"}},
                            {id: "groupID2", masterPublicKey: {x: "secondgroupkey"}},
                        ],
                        privateDeviceKey,
                        ApiState.signingKeys()
                    );
                    expect(DocumentApiEndpoints.callDocumentGrantApi).toHaveBeenCalledWith("docID", ["encryptedUserKey"], ["encryptedGroupKey"]);
                    done();
                }
            );
        });

        it("returns failures for users or groups that dont exist", (done) => {
            const userKeys = [
                {id: "userID1", userMasterPublicKey: {x: "firstuserkey"}},
                {id: "userID2", userMasterPublicKey: {x: "seconduserkey"}},
            ];
            const groupKeys = [{id: "groupID1", groupMasterPublicKey: {x: "firstgroupkey"}}];
            const docSymKey = {
                encryptedSymmetricKey: "esk",
                ephemeralPublicKey: "epk",
                authorizationCode: "ac",
            };

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: groupKeys}));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(
                Future.of<any>({
                    id: "stored ID",
                    encryptedSymmetricKey: docSymKey,
                })
            );
            jest.spyOn(DocumentApiEndpoints, "callDocumentGrantApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userOrGroup: {type: "group", id: "groupID1"}}, {userOrGroup: {type: "user", id: "userID2"}}],
                    failedIds: [
                        {userOrGroup: {type: "group", id: "groupID2"}, errorMessage: "foo"},
                        {userOrGroup: {type: "user", id: "userID1"}, errorMessage: "bar"},
                    ],
                })
            );
            jest.spyOn(DocumentOperations, "encryptDocumentToKeys").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: ["encryptedUserKey"],
                    groupAccessKeys: ["encryptedGroupKey"],
                })
            );

            DocumentApi.grantDocumentAccess("docID", ["userID1", "userID2", "userID3", "userID4"], ["groupID1", "groupID2", "groupID3", "groupID4"]).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({
                        succeeded: [
                            {id: "groupID1", type: "group"},
                            {id: "userID2", type: "user"},
                        ],
                        failed: [
                            {id: "groupID2", type: "group", error: "foo"},
                            {id: "userID1", type: "user", error: "bar"},
                            {id: "userID3", type: "user", error: "ID did not exist in the system."},
                            {id: "userID4", type: "user", error: "ID did not exist in the system."},
                            {id: "groupID3", type: "group", error: "ID did not exist in the system."},
                            {id: "groupID4", type: "group", error: "ID did not exist in the system."},
                        ],
                    });

                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["userID1", "userID2", "userID3", "userID4"]);
                    expect(GroupApiEndpoints.callGroupKeyListApi).toHaveBeenCalledWith(["groupID1", "groupID2", "groupID3", "groupID4"]);
                    done();
                }
            );
        });

        it("bails early and returns failures when no users or groups can be found", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(DocumentApiEndpoints, "callDocumentMetadataGetApi").mockReturnValue(Future.of<any>({}));
            jest.spyOn(DocumentOperations, "encryptDocumentToKeys");

            DocumentApi.grantDocumentAccess("docID", ["userID1", "userID2"], ["groupID1"]).engage(
                (e) => done(e),
                (data: any) => {
                    expect(data).toEqual({
                        succeeded: [],
                        failed: [
                            {id: "userID1", type: "user", error: "ID did not exist in the system."},
                            {id: "userID2", type: "user", error: "ID did not exist in the system."},
                            {id: "groupID1", type: "group", error: "ID did not exist in the system."},
                        ],
                    });

                    expect(DocumentOperations.encryptDocumentToKeys).not.toHaveBeenCalled();
                    done();
                }
            );
        });
    });

    describe("revokeDocumentAccess", () => {
        it("calls document revoke API and returns with expected mapped result", () => {
            jest.spyOn(DocumentApiEndpoints, "callDocumentRevokeApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userOrGroup: {type: "group", id: "groupID1"}}, {userOrGroup: {type: "user", id: "userID2"}}],
                    failedIds: [
                        {userOrGroup: {type: "group", id: "groupID2"}, errorMessage: "foo"},
                        {userOrGroup: {type: "user", id: "userID1"}, errorMessage: "bar"},
                    ],
                })
            );

            DocumentApi.revokeDocumentAccess("docID", ["userID1", "userID2"], ["groupID1", "groupID2"]).engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result) => {
                    expect(result).toEqual({
                        succeeded: [
                            {id: "groupID1", type: "group"},
                            {id: "userID2", type: "user"},
                        ],
                        failed: [
                            {id: "groupID2", type: "group", error: "foo"},
                            {id: "userID1", type: "user", error: "bar"},
                        ],
                    });
                }
            );
        });
    });
});

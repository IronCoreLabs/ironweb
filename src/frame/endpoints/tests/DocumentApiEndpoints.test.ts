import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import ApiState from "../../ApiState";
import {encryptedDocumentToBase64} from "../../FrameUtils";
import DocumentApiEndpoints from "../DocumentApiEndpoints";

describe("DocumentApiEndpoints", () => {
    beforeEach(() => {
        spyOn(ApiRequest, "makeAuthorizedApiRequest").and.returnValue(
            Future.of({
                foo: "bar",
            })
        );
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
    });

    describe("callDocumentListApi", () => {
        it("requests document list endpoint and maps response to data result", () => {
            DocumentApiEndpoints.callDocumentListApi().engage(
                () => fail("Doc list should not reject"),
                (documents: any) => {
                    expect(documents).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents", expect.any(Number), expect.any(Object));
                }
            );
        });
    });

    describe("callDocumentCreateApi", () => {
        it("sends new document to API and maps response to data result", () => {
            const document = TestUtils.getEncryptedDocument();
            const symKey = TestUtils.getEncryptedSymmetricKey();
            const userKeyList = [
                {
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "user-10",
                },
            ];

            DocumentApiEndpoints.callDocumentCreateApi("docID", encryptedDocumentToBase64("docID", 353, document), userKeyList, [], "doc name").engage(
                () => fail("Doc create should not reject"),
                (documentResult: any) => {
                    expect(documentResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        id: "docID",
                        value: {
                            data: {
                                content: "AgAdeyJfZGlkXyI6ImRvY0lEIiwiX3NpZF8iOjM1M31ub25jZWJhc2U=",
                            },
                            name: "doc name",
                            fromUserId: "user-10",
                            sharedWith: [
                                {
                                    ...symKey,
                                    userOrGroup: {
                                        type: "user",
                                        id: "user-10",
                                        masterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                    },
                                },
                            ],
                        },
                    });
                }
            );
        });

        it("sends both lists of users and groups when provided", () => {
            const symKey = TestUtils.getEncryptedSymmetricKey();
            const userKeyList = [
                {
                    publicKey: {x: "firstuserpublickeyx", y: "firstuserpublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "user-10",
                },
                {
                    publicKey: {x: "seconduserpublickeyx", y: "seconduserpublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "user-350",
                },
            ];

            const groupKeyList = [
                {
                    publicKey: {x: "firstgrouppublickeyx", y: "firstgrouppublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "group-93",
                },
                {
                    publicKey: {x: "secondgrouppublickeyx", y: "secondgrouppublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "group-53",
                },
            ];

            DocumentApiEndpoints.callDocumentCreateApi("", null, userKeyList, groupKeyList).engage(
                () => fail("Doc create should not reject"),
                (document: any) => {
                    expect(document).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        value: {
                            fromUserId: "user-10",
                            sharedWith: [
                                {...symKey, userOrGroup: {type: "user", id: "user-10", masterPublicKey: {x: "firstuserpublickeyx", y: "firstuserpublickeyy"}}},
                                {
                                    ...symKey,
                                    userOrGroup: {type: "user", id: "user-350", masterPublicKey: {x: "seconduserpublickeyx", y: "seconduserpublickeyy"}},
                                },
                                {
                                    ...symKey,
                                    userOrGroup: {type: "group", id: "group-93", masterPublicKey: {x: "firstgrouppublickeyx", y: "firstgrouppublickeyy"}},
                                },
                                {
                                    ...symKey,
                                    userOrGroup: {type: "group", id: "group-53", masterPublicKey: {x: "secondgrouppublickeyx", y: "secondgrouppublickeyy"}},
                                },
                            ],
                        },
                    });
                }
            );
        });

        it("optionally stores document data and IV", () => {
            const symKey = TestUtils.getEncryptedSymmetricKey();
            const userKeyList = [
                {
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                    encryptedPlaintext: symKey,
                    id: "user-10",
                },
            ];

            DocumentApiEndpoints.callDocumentCreateApi("docKey", null, userKeyList, []).engage(
                () => fail("Doc create should not reject"),
                (document: any) => {
                    expect(document).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        id: "docKey",
                        value: {
                            fromUserId: "user-10",
                            sharedWith: [
                                {
                                    ...symKey,
                                    userOrGroup: {
                                        type: "user",
                                        id: "user-10",
                                        masterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                    },
                                },
                            ],
                        },
                    });
                }
            );
        });
    });

    describe("callDocumentGetApi", () => {
        it("gets document from api and maps result", () => {
            DocumentApiEndpoints.callDocumentGetApi("docKey").engage(
                () => fail("doc get API should not reject"),
                (document: any) => {
                    expect(document).toEqual({foo: "bar"});

                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "documents/docKey?includeData=true",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });
    });

    describe("callDocumentMetadataGetApi", () => {
        it("gets metadata for document and maps result", () => {
            DocumentApiEndpoints.callDocumentMetadataGetApi("docID").engage(
                () => fail("doc meta get API should not reject"),
                (document: any) => {
                    expect(document).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docID", expect.any(Number), expect.any(Object));
                }
            );
        });
    });

    describe("callDocumentUpdateApi", () => {
        it("updates existing document and returns mapped API response", () => {
            const document = TestUtils.getEncryptedDocument();

            DocumentApiEndpoints.callDocumentUpdateApi("docKey", encryptedDocumentToBase64("docID", 353, document)).engage(
                () => fail("Doc update should not reject"),
                (documentResult: any) => {
                    expect(documentResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docKey", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        data: {
                            content: "AgAdeyJfZGlkXyI6ImRvY0lEIiwiX3NpZF8iOjM1M31ub25jZWJhc2U=",
                        },
                    });
                }
            );
        });

        it("includes document name and omits data if not provided", () => {
            DocumentApiEndpoints.callDocumentUpdateApi("docKey", undefined, "new name").engage(
                () => fail("Doc update should not reject"),
                () => {
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docKey", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        name: "new name",
                    });
                }
            );
        });

        it("sets name to null if passed in as such", () => {
            DocumentApiEndpoints.callDocumentUpdateApi("docKey", undefined, null).engage(
                () => fail("Doc update should not reject"),
                () => {
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docKey", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        name: null,
                    });
                }
            );
        });
    });

    describe("callDocumentGrantApi", () => {
        let userKeys: EncryptedAccessKey[];
        let groupKeys: EncryptedAccessKey[];
        beforeEach(() => {
            userKeys = [
                {
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                    encryptedPlaintext: {
                        ephemeralPublicKey: {x: "", y: "AA=="},
                        encryptedMessage: "AAA=",
                        authHash: "AA==",
                        publicSigningKey: "AAAA",
                        signature: "A===",
                    },
                    id: "37",
                },
                {
                    publicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                    encryptedPlaintext: {
                        ephemeralPublicKey: {x: "AAAAAA==", y: "AAAA"},
                        encryptedMessage: "AA==",
                        authHash: "AA==",
                        publicSigningKey: "AA==",
                        signature: "A===",
                    },
                    id: "99",
                },
            ];

            groupKeys = [
                {
                    publicKey: {x: "grouppublickeyx", y: "grouppublickeyy"},
                    encryptedPlaintext: {
                        ephemeralPublicKey: {x: "AAAAAAA=", y: "AAAAA=="},
                        encryptedMessage: "AAAA",
                        authHash: "AA==",
                        publicSigningKey: "AA==",
                        signature: "A===",
                    },
                    id: "355",
                },
            ];
        });

        it("calls grant API and returns mapped API response", () => {
            DocumentApiEndpoints.callDocumentGrantApi("docID", userKeys, groupKeys).engage(
                () => fail("Doc grant should not reject"),
                (document: any) => {
                    expect(document).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docID/access", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        fromPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString},
                        to: [
                            {
                                encryptedMessage: "AAA=",
                                ephemeralPublicKey: {x: "", y: "AA=="},
                                publicSigningKey: "AAAA",
                                authHash: "AA==",
                                signature: "A===",
                                userOrGroup: {
                                    type: "user",
                                    id: "37",
                                    masterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                },
                            },
                            {
                                encryptedMessage: "AA==",
                                publicSigningKey: "AA==",
                                authHash: "AA==",
                                signature: "A===",
                                ephemeralPublicKey: {x: "AAAAAA==", y: "AAAA"},
                                userOrGroup: {
                                    type: "user",
                                    id: "99",
                                    masterPublicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                                },
                            },
                            {
                                encryptedMessage: "AAAA",
                                ephemeralPublicKey: {x: "AAAAAAA=", y: "AAAAA=="},
                                publicSigningKey: "AA==",
                                authHash: "AA==",
                                signature: "A===",
                                userOrGroup: {
                                    type: "group",
                                    id: "355",
                                    masterPublicKey: {x: "grouppublickeyx", y: "grouppublickeyy"},
                                },
                            },
                        ],
                    });
                }
            );
        });

        it("responds with proper key list when no users", () => {
            DocumentApiEndpoints.callDocumentGrantApi("docID", [], groupKeys).engage(
                () => fail("Doc grant should not reject"),
                () => {
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        fromPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString},
                        to: [
                            {
                                encryptedMessage: "AAAA",
                                publicSigningKey: "AA==",
                                authHash: "AA==",
                                signature: "A===",
                                ephemeralPublicKey: {x: "AAAAAAA=", y: "AAAAA=="},
                                userOrGroup: {
                                    type: "group",
                                    id: "355",
                                    masterPublicKey: {x: "grouppublickeyx", y: "grouppublickeyy"},
                                },
                            },
                        ],
                    });
                }
            );
        });

        it("responds with proper key list when no groups", () => {
            DocumentApiEndpoints.callDocumentGrantApi("docID", userKeys, []).engage(
                () => fail("Doc grant should not reject"),
                () => {
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        fromPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString},
                        to: [
                            {
                                encryptedMessage: "AAA=",
                                publicSigningKey: "AAAA",
                                authHash: "AA==",
                                signature: "A===",
                                ephemeralPublicKey: {x: "", y: "AA=="},
                                userOrGroup: {
                                    type: "user",
                                    id: "37",
                                    masterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                },
                            },
                            {
                                encryptedMessage: "AA==",
                                publicSigningKey: "AA==",
                                authHash: "AA==",
                                signature: "A===",
                                ephemeralPublicKey: {x: "AAAAAA==", y: "AAAA"},
                                userOrGroup: {
                                    type: "user",
                                    id: "99",
                                    masterPublicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                                },
                            },
                        ],
                    });
                }
            );
        });
    });

    describe("callDocumentRevokeApi", () => {
        it("calls document revoke endpoint with both user and group list", () => {
            DocumentApiEndpoints.callDocumentRevokeApi("docID", ["user-1", "user-2"], ["group-1"]).engage(
                (e) => fail(e.message),
                (revokeResult: any) => {
                    expect(revokeResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docID/access", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        userOrGroups: [{id: "user-1", type: "user"}, {id: "user-2", type: "user"}, {id: "group-1", type: "group"}],
                    });
                }
            );
        });

        it("builds list without users if none are provided", () => {
            DocumentApiEndpoints.callDocumentRevokeApi("docID", [], ["group-1"]).engage(
                (e) => fail(e.message),
                (revokeResult: any) => {
                    expect(revokeResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docID/access", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        userOrGroups: [{id: "group-1", type: "group"}],
                    });
                }
            );
        });

        it("builds list without users if none are provided", () => {
            DocumentApiEndpoints.callDocumentRevokeApi("docID?=10", ["user-1"], []).engage(
                (e) => fail(e.message),
                (revokeResult: any) => {
                    expect(revokeResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("documents/docID%3F%3D10/access", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        userOrGroups: [{id: "user-1", type: "user"}],
                    });
                }
            );
        });
    });
});

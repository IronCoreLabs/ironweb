import Future from "futurejs";
import {messenger} from "../";
import * as MT from "../../FrameMessageTypes";
import SDKError from "../../lib/SDKError";
import * as Init from "../initialization";
import * as DocumentAdvancedApi from "../sdk/DocumentAdvancedApi";
import * as DocumentApi from "../sdk/DocumentApi";
import * as GroupApi from "../sdk/GroupApi";
import * as UserApi from "../sdk/UserApi";

describe("frame index", () => {
    describe("onMessage init tests", () => {
        it("FRAME_LOADED_CHECK", () => {
            const payload: MT.FrameLoadedRequest = {
                type: "FRAME_LOADED_CHECK",
            };

            messenger.onMessageCallback(payload, (result) => {
                expect(result).toEqual({type: "FRAME_LOADED_CHECK_RESPONSE"});
            });
        });

        it("INIT_SDK", (done) => {
            spyOn(Init, "initialize").and.returnValue(Future.of("init"));
            const payload: MT.InitApiRequest = {
                type: "INIT_SDK",
                message: {
                    jwtToken: "validJwt",
                    symmetricKey: "symKey",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual("init");
                expect(Init.initialize).toHaveBeenCalledWith("validJwt", "symKey");
                done();
            });
        });

        it("CREATE_USER", (done) => {
            spyOn(Init, "createUser").and.returnValue(Future.of("createUser"));
            const payload: MT.CreateUserRequest = {
                type: "CREATE_USER",
                message: {
                    jwtToken: "validJwt",
                    passcode: "passcode",
                    needsRotation: false,
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual("createUser");
                expect(Init.createUser).toHaveBeenCalledWith("validJwt", "passcode", false);
                done();
            });
        });

        it("CREATE_USER_AND_DEVICE", (done) => {
            spyOn(Init, "createUserAndDevice").and.returnValue(Future.of("createUserAndDevice"));
            const payload: MT.CreateUserAndDeviceRequest = {
                type: "CREATE_USER_AND_DEVICE",
                message: {
                    jwtToken: "validJwt",
                    passcode: "passcode",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual("createUserAndDevice");
                expect(Init.createUserAndDevice).toHaveBeenCalledWith("validJwt", "passcode");
                done();
            });
        });

        it("GEN_DEVICE_KEYS", (done) => {
            spyOn(Init, "generateUserNewDeviceKeys").and.returnValue(Future.of("generateUserNewDeviceKeys"));
            const payload: MT.GenerateNewDeviceKeysRequest = {
                type: "GEN_DEVICE_KEYS",
                message: {
                    passcode: "passcode",
                    jwtToken: "validToken",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual("generateUserNewDeviceKeys");
                expect(Init.generateUserNewDeviceKeys).toHaveBeenCalledWith("validToken", "passcode");
                done();
            });
        });

        it("CREATE_DETATCHED_USER_DEVICE", (done) => {
            spyOn(Init, "createDetachedUserDevice").and.returnValue(Future.of("createDetachedUserDevice"));
            const payload: MT.CreateDetachedUserDeviceRequest = {
                type: "CREATE_DETATCHED_USER_DEVICE",
                message: {passcode: "pass", jwtToken: "tok"},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "CREATE_DETATCHED_USER_DEVICE_RESPONSE",
                    message: "createDetachedUserDevice",
                });
                expect(Init.createDetachedUserDevice).toHaveBeenCalledWith("tok", "pass");
                done();
            });
        });
    });

    describe("onMessage document tests", () => {
        it("DOCUMENT_LIST", (done) => {
            spyOn(DocumentApi, "list").and.returnValue(Future.of("list"));
            const payload: MT.DocumentListRequest = {
                type: "DOCUMENT_LIST",
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_LIST_RESPONSE",
                    message: "list",
                });
                expect(DocumentApi.list).toHaveBeenCalledWith();
                done();
            });
        });

        it("DOCUMENT_META_GET", (done) => {
            spyOn(DocumentApi, "getDocumentMeta").and.returnValue(Future.of("meta"));
            const payload: MT.DocumentMetaGetRequest = {
                type: "DOCUMENT_META_GET",
                message: {
                    documentID: "my doc",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_META_GET_RESPONSE",
                    message: "meta",
                });
                expect(DocumentApi.getDocumentMeta).toHaveBeenCalledWith("my doc");
                done();
            });
        });

        it("DOCUMENT_STORE_DECRYPT", (done) => {
            const documentData = new Uint8Array(3);
            spyOn(DocumentApi, "decryptHostedDoc").and.returnValue(
                Future.of({
                    data: documentData,
                })
            );
            const payload: MT.DocumentStoreDecryptRequest = {
                type: "DOCUMENT_STORE_DECRYPT",
                message: {
                    documentID: "my doc",
                },
            };

            messenger.onMessageCallback(payload, (result: any, transferList: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_STORE_DECRYPT_RESPONSE",
                    message: {data: documentData},
                });
                expect(transferList).toEqual([documentData]);
                expect(DocumentApi.decryptHostedDoc).toHaveBeenCalledWith("my doc");
                done();
            });
        });

        it("DOCUMENT_DECRYPT", (done) => {
            const documentData = new Uint8Array(3);
            spyOn(DocumentApi, "decryptLocalDoc").and.returnValue(
                Future.of({
                    data: documentData,
                })
            );
            const payload: any = {
                type: "DOCUMENT_DECRYPT",
                message: {
                    documentID: "my doc",
                    documentData: {
                        content: new Uint8Array([30, 93]),
                        nonce: new Uint8Array([35]),
                    },
                },
            };

            messenger.onMessageCallback(payload, (result: any, transferList: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_DECRYPT_RESPONSE",
                    message: {data: documentData},
                });
                expect(transferList).toEqual([documentData]);
                expect(DocumentApi.decryptLocalDoc).toHaveBeenCalledWith("my doc", {
                    content: new Uint8Array([30, 93]),
                    nonce: new Uint8Array([35]),
                });
                done();
            });
        });

        it("DOCUMENT_UNMANAGED_DECRYPT", (done) => {
            spyOn(DocumentAdvancedApi, "decryptWithProvidedEdeks").and.returnValue(Future.of("umanagedDecrypt"));
            const payload: any = {
                type: "DOCUMENT_UNMANAGED_DECRYPT",
                message: {
                    documentData: new Uint8Array([35, 88, 37]),
                    edeks: "edeks",
                },
            };
            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_UNMANAGED_DECRYPT_RESPONSE",
                    message: "umanagedDecrypt",
                });
                expect(DocumentAdvancedApi.decryptWithProvidedEdeks).toHaveBeenCalledWith(new Uint8Array([35, 88, 37]), "edeks");
                done();
            });
        });

        it("DOCUMENT_STORE_ENCRYPT", (done) => {
            spyOn(DocumentApi, "encryptToStore").and.returnValue(Future.of("encryptToStore"));
            const payload: any = {
                type: "DOCUMENT_STORE_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentName: "fooey",
                    documentData: new Uint8Array([92, 99, 103]),
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                    grantToAuthor: true,
                    policy: {category: "foo"},
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_STORE_ENCRYPT_RESPONSE",
                    message: "encryptToStore",
                });
                expect(DocumentApi.encryptToStore).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([92, 99, 103]),
                    "fooey",
                    "list of user ids",
                    "list of group ids",
                    true,
                    {category: "foo"}
                );
                done();
            });
        });

        it("DOCUMENT_STORE_ENCRYPT grantToAuthor missing", (done) => {
            spyOn(DocumentApi, "encryptToStore").and.returnValue(Future.of("encryptToStore"));
            const payload: any = {
                type: "DOCUMENT_STORE_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentName: "fooey",
                    documentData: new Uint8Array([92, 99, 103]),
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                },
            };

            messenger.onMessageCallback(payload, () => {
                expect(DocumentApi.encryptToStore).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([92, 99, 103]),
                    "fooey",
                    "list of user ids",
                    "list of group ids",
                    true,
                    undefined
                );
                done();
            });
        });

        it("DOCUMENT_STORE_ENCRYPT grantToAuthor false", (done) => {
            spyOn(DocumentApi, "encryptToStore").and.returnValue(Future.of("encryptToStore"));
            const payload: any = {
                type: "DOCUMENT_STORE_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentName: "fooey",
                    documentData: new Uint8Array([92, 99, 103]),
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                    grantToAuthor: false,
                },
            };

            messenger.onMessageCallback(payload, () => {
                expect(DocumentApi.encryptToStore).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([92, 99, 103]),
                    "fooey",
                    "list of user ids",
                    "list of group ids",
                    false,
                    undefined
                );
                done();
            });
        });

        it("DOCUMENT_ENCRYPT", (done) => {
            const documentData = new Uint8Array(28);
            spyOn(DocumentApi, "encryptLocalDocument").and.returnValue(Future.of({document: documentData}));
            const payload: any = {
                type: "DOCUMENT_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([36]),
                    documentName: "given name",
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                    grantToAuthor: true,
                    policy: undefined,
                },
            };

            messenger.onMessageCallback(payload, (result: any, tranferList: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_ENCRYPT_RESPONSE",
                    message: {document: documentData},
                });
                expect(tranferList).toEqual([documentData]);
                expect(DocumentApi.encryptLocalDocument).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([36]),
                    "given name",
                    "list of user ids",
                    "list of group ids",
                    true,
                    undefined
                );
                done();
            });
        });

        it("DOCUMENT_ENCRYPT grantToAuthor missing", (done) => {
            const documentData = new Uint8Array(28);
            spyOn(DocumentApi, "encryptLocalDocument").and.returnValue(Future.of({document: documentData}));
            const payload: any = {
                type: "DOCUMENT_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([36]),
                    documentName: "given name",
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                },
            };

            messenger.onMessageCallback(payload, () => {
                expect(DocumentApi.encryptLocalDocument).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([36]),
                    "given name",
                    "list of user ids",
                    "list of group ids",
                    true,
                    undefined
                );
                done();
            });
        });

        it("DOCUMENT_ENCRYPT grantToAuthor is false", (done) => {
            const documentData = new Uint8Array(28);
            spyOn(DocumentApi, "encryptLocalDocument").and.returnValue(Future.of({document: documentData}));
            const payload: any = {
                type: "DOCUMENT_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([36]),
                    documentName: "given name",
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                    grantToAuthor: false,
                },
            };

            messenger.onMessageCallback(payload, () => {
                expect(DocumentApi.encryptLocalDocument).toHaveBeenCalledWith(
                    "my doc",
                    new Uint8Array([36]),
                    "given name",
                    "list of user ids",
                    "list of group ids",
                    false,
                    undefined
                );
                done();
            });
        });

        it("DOCUMENT_UNMANAGED_ENCRYPT", (done) => {
            spyOn(DocumentAdvancedApi, "encrypt").and.returnValue(Future.of("umanagedEncrypt"));
            const payload: any = {
                type: "DOCUMENT_UNMANAGED_ENCRYPT",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([36]),
                    userGrants: "list of user ids",
                    groupGrants: "list of group ids",
                    grantToAuthor: true,
                    policy: {},
                },
            };

            messenger.onMessageCallback(payload, () => {
                expect(DocumentAdvancedApi.encrypt).toHaveBeenCalledWith("my doc", new Uint8Array([36]), "list of user ids", "list of group ids", true, {});
                done();
            });
        });

        it("DOCUMENT_STORE_UPDATE_DATA", (done) => {
            spyOn(DocumentApi, "updateToStore").and.returnValue(Future.of("updateToStore"));
            const payload: any = {
                type: "DOCUMENT_STORE_UPDATE_DATA",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([37, 98, 35]),
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_STORE_UPDATE_DATA_RESPONSE",
                    message: "updateToStore",
                });
                expect(DocumentApi.updateToStore).toHaveBeenCalledWith("my doc", new Uint8Array([37, 98, 35]));
                done();
            });
        });

        it("DOCUMENT_UPDATE_DATA", (done) => {
            const documentData = new Uint8Array(33);
            spyOn(DocumentApi, "updateLocalDocument").and.returnValue(Future.of({document: documentData}));
            const payload: any = {
                type: "DOCUMENT_UPDATE_DATA",
                message: {
                    documentID: "my doc",
                    documentData: new Uint8Array([37, 98, 35]),
                },
            };

            messenger.onMessageCallback(payload, (result: any, transferList: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_UPDATE_DATA_RESPONSE",
                    message: {document: documentData},
                });
                expect(transferList).toEqual([documentData]);
                expect(DocumentApi.updateLocalDocument).toHaveBeenCalledWith("my doc", new Uint8Array([37, 98, 35]));
                done();
            });
        });

        it("DOCUMENT_UPDATE_NAME", (done) => {
            spyOn(DocumentApi, "updateName").and.returnValue(Future.of({documentID: "doc-10", documentName: "doc name", created: "1", updated: "2"}));

            const payload: any = {
                type: "DOCUMENT_UPDATE_NAME",
                message: {
                    documentID: "my doc",
                    name: "my doc name",
                },
            };

            messenger.onMessageCallback(payload, (result) => {
                expect(result).toEqual({
                    type: "DOCUMENT_UPDATE_NAME_RESPONSE",
                    message: {
                        documentID: "doc-10",
                        documentName: "doc name",
                        created: "1",
                        updated: "2",
                    },
                });
                expect(DocumentApi.updateName).toHaveBeenCalledWith("my doc", "my doc name");
                done();
            });
        });

        it("DOCUMENT_GRANT", (done) => {
            spyOn(DocumentApi, "grantDocumentAccess").and.returnValue(Future.of("grantDocumentAccess"));
            const payload: MT.DocumentGrantRequest = {
                type: "DOCUMENT_GRANT",
                message: {
                    documentID: "my grant doc",
                    userGrants: ["10", "30", "93"],
                    groupGrants: ["353", "31"],
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_GRANT_RESPONSE",
                    message: "grantDocumentAccess",
                });
                expect(DocumentApi.grantDocumentAccess).toHaveBeenCalledWith("my grant doc", ["10", "30", "93"], ["353", "31"]);
                done();
            });
        });

        it("DOCUMENT_REVOKE", (done) => {
            spyOn(DocumentApi, "revokeDocumentAccess").and.returnValue(Future.of("revokeDocumentAccess"));
            const payload: MT.DocumentRevokeRequest = {
                type: "DOCUMENT_REVOKE",
                message: {
                    documentID: "my grant doc",
                    userRevocations: ["10", "30", "93"],
                    groupRevocations: ["353", "31"],
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DOCUMENT_REVOKE_RESPONSE",
                    message: "revokeDocumentAccess",
                });
                expect(DocumentApi.revokeDocumentAccess).toHaveBeenCalledWith("my grant doc", ["10", "30", "93"], ["353", "31"]);
                done();
            });
        });
    });

    describe("onMessage user tests", () => {
        it("DEAUTHORIZE_DEVICE", (done) => {
            spyOn(UserApi, "deauthorizeDevice").and.returnValue(Future.of("deauthDevice"));
            const payload: MT.DeauthorizeDevice = {
                type: "DEAUTHORIZE_DEVICE",
                message: null,
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "DEAUTHORIZE_DEVICE_RESPONSE",
                    message: "deauthDevice",
                });
                expect(UserApi.deauthorizeDevice).toHaveBeenCalledWith();
                done();
            });
        });

        it("CHANGE_USER_PASSCODE", (done) => {
            spyOn(UserApi, "changeUsersPasscode").and.returnValue(Future.of("changeUsersPasscode"));

            const payload: MT.ChangeUserPasscode = {
                type: "CHANGE_USER_PASSCODE",
                message: {
                    currentPasscode: "current",
                    newPasscode: "new",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "CHANGE_USER_PASSCODE_RESPONSE",
                    message: null,
                });
                expect(UserApi.changeUsersPasscode).toHaveBeenCalledWith("current", "new");
                done();
            });
        });

        it("ROTATE_USER_PRIVATE_KEY", (done) => {
            spyOn(UserApi, "rotateUserMasterKey").and.returnValue(Future.of("rotateUserMasterKey"));

            const payload: MT.RotateUserPrivateKey = {
                type: "ROTATE_USER_PRIVATE_KEY",
                message: {
                    passcode: "current",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "ROTATE_USER_PRIVATE_KEY_RESPONSE",
                    message: null,
                });
            });
            expect(UserApi.rotateUserMasterKey).toHaveBeenCalledWith("current");
            done();
        });
    });

    describe("onMessage group tests", () => {
        it("GROUP_LIST", (done) => {
            spyOn(GroupApi, "list").and.returnValue(Future.of("groupList"));

            const payload: MT.GroupListRequest = {
                type: "GROUP_LIST",
                message: null,
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_LIST_RESPONSE",
                    message: "groupList",
                });
                expect(GroupApi.list).toHaveBeenCalledWith();
                done();
            });
        });

        it("GROUP_GET", (done) => {
            spyOn(GroupApi, "get").and.returnValue(Future.of("groupGet"));

            const payload: MT.GroupGetRequest = {
                type: "GROUP_GET",
                message: {groupID: "my-group"},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_GET_RESPONSE",
                    message: "groupGet",
                });
                expect(GroupApi.get).toHaveBeenCalledWith("my-group");
                done();
            });
        });

        it("GROUP_CREATE", (done) => {
            jest.spyOn(GroupApi, "create").mockReturnValue(Future.of("groupCreate") as any);

            const payload: MT.GroupCreateRequest = {
                type: "GROUP_CREATE",
                message: {
                    groupID: "my-group",
                    groupName: "bar",
                    owner: "owner",
                    addAsMember: true,
                    addAsAdmin: true,
                    needsRotation: false,
                    userLists: {
                        memberList: ["memberString"],
                        adminList: ["adminString"],
                    },
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_CREATE_RESPONSE",
                    message: "groupCreate",
                });
                expect(GroupApi.create).toHaveBeenCalledWith("my-group", "bar", "owner", true, true, false, {
                    memberList: ["memberString"],
                    adminList: ["adminString"],
                });
                done();
            });
        });

        it("GROUP_UPDATE", (done) => {
            spyOn(GroupApi, "update").and.returnValue(Future.of("updatedGroup"));
            const payload: MT.GroupUpdateRequest = {
                type: "GROUP_UPDATE",
                message: {groupID: "groupID", groupName: "new name"},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_UPDATE_RESPONSE",
                    message: "updatedGroup",
                });
                done();
            });
        });

        it("GROUP_ADD_ADMINS", (done) => {
            spyOn(GroupApi, "addAdmins").and.returnValue(Future.of("groupAddAdmins"));
            const payload: MT.GroupAddAdminRequest = {
                type: "GROUP_ADD_ADMINS",
                message: {groupID: "my-group", userList: ["22", "89"]},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_ADD_ADMINS_RESPONSE",
                    message: "groupAddAdmins",
                });
                expect(GroupApi.addAdmins).toHaveBeenCalledWith("my-group", ["22", "89"]);
                done();
            });
        });

        it("GROUP_REMOVE_ADMINS", (done) => {
            spyOn(GroupApi, "removeAdmins").and.returnValue(Future.of("groupRemoveAdmins"));
            const payload: MT.GroupRemoveAdminRequest = {
                type: "GROUP_REMOVE_ADMINS",
                message: {groupID: "my-group", userList: ["22", "89"]},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_REMOVE_ADMINS_RESPONSE",
                    message: "groupRemoveAdmins",
                });
                expect(GroupApi.removeAdmins).toHaveBeenCalledWith("my-group", ["22", "89"]);
                done();
            });
        });

        it("GROUP_ADD_MEMBERS", (done) => {
            spyOn(GroupApi, "addMembers").and.returnValue(Future.of("groupAddMembers"));

            const payload: MT.GroupAddMemberRequest = {
                type: "GROUP_ADD_MEMBERS",
                message: {groupID: "my-group", userList: ["35", "66"]},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_ADD_MEMBERS_RESPONSE",
                    message: "groupAddMembers",
                });
                expect(GroupApi.addMembers).toHaveBeenCalledWith("my-group", ["35", "66"]);
                done();
            });
        });

        it("GROUP_REMOVE_MEMBERS", (done) => {
            spyOn(GroupApi, "removeMembers").and.returnValue(Future.of("groupRemoveMembers"));

            const payload: MT.GroupRemoveMemberRequest = {
                type: "GROUP_REMOVE_MEMBERS",
                message: {groupID: "my-group", userList: ["35", "66"]},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_REMOVE_MEMBERS_RESPONSE",
                    message: "groupRemoveMembers",
                });
                expect(GroupApi.removeMembers).toHaveBeenCalledWith("my-group", ["35", "66"]);
                done();
            });
        });

        it("GROUP_REMOVE_SELF_AS_MEMBER", (done) => {
            spyOn(GroupApi, "removeSelfAsMember").and.returnValue(Future.of("user-10"));

            const payload: MT.GroupRemoveSelfAsMemberRequest = {
                type: "GROUP_REMOVE_SELF_AS_MEMBER",
                message: {groupID: "my-group"},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_REMOVE_SELF_AS_MEMBER_RESPONSE",
                    message: null,
                });
                expect(GroupApi.removeSelfAsMember).toHaveBeenCalledWith("my-group");
                done();
            });
        });

        it("GROUP_DELETE", (done) => {
            spyOn(GroupApi, "deleteGroup").and.returnValue(Future.of("deleteresp"));

            const payload: MT.GroupDeleteRequest = {
                type: "GROUP_DELETE",
                message: {groupID: "my-group"},
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "GROUP_DELETE_RESPONSE",
                    message: "deleteresp",
                });
                expect(GroupApi.deleteGroup).toHaveBeenCalledWith("my-group");
                done();
            });
        });
    });

    describe("error message handling", () => {
        it("returns error response with formatted code and message", (done) => {
            spyOn(DocumentApi, "decryptHostedDoc").and.returnValue(Future.reject(new SDKError(new Error("invalid"), 34)));
            const payload: MT.DocumentStoreDecryptRequest = {
                type: "DOCUMENT_STORE_DECRYPT",
                message: {
                    documentID: "my doc",
                },
            };

            messenger.onMessageCallback(payload, (result: any) => {
                expect(result).toEqual({
                    type: "ERROR_RESPONSE",
                    message: {
                        code: 34,
                        text: "invalid",
                    },
                });
                done();
            });
        });

        it("if you bypass typescript's checks you just get your original message back", () => {
            messenger.onMessageCallback({type: "UNKNOWN", message: "data"} as any, (result: any) => expect(result).toBe("data"));
        });
    });
});

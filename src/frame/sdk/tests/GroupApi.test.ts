import * as GroupApi from "../GroupApi";
import Future from "futurejs";
import GroupApiEndpoints from "../../endpoints/GroupApiEndpoints";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import * as GroupOperations from "../GroupOperations";
import * as TestUtils from "../../../tests/TestUtils";
import ApiState from "../../ApiState";
import {ErrorCodes} from "../../../Constants";

describe("GroupApi", () => {
    describe("list", () => {
        it("requests group list from API and maps over result", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupListApi").mockReturnValue(
                Future.of<any>({
                    result: [
                        {
                            foo: "bar",
                            name: "group name",
                            id: "3",
                            permissions: ["admin"],
                            created: "1",
                            updated: "2",
                        },
                        {
                            foo: "bar",
                            name: null,
                            id: "87",
                            permissions: ["member", "admin"],
                            created: "3",
                            updated: "4",
                        },
                    ],
                })
            );

            GroupApi.list().engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        result: [
                            {
                                groupID: "3",
                                groupName: "group name",
                                isAdmin: true,
                                isMember: false,
                                created: "1",
                                updated: "2",
                            },
                            {
                                groupID: "87",
                                groupName: null,
                                isAdmin: true,
                                isMember: true,
                                created: "3",
                                updated: "4",
                            },
                        ],
                    });

                    expect(GroupApiEndpoints.callGroupListApi).toHaveBeenCalledWith();
                }
            );
        });
    });

    describe("get", () => {
        it("requests get endpoint for specific ID and maps response", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    adminIds: ["2"],
                    memberIds: ["2", "53"],
                    permissions: ["member", "admin"],
                    created: "1",
                    updated: "2",
                    needsRotation: true,
                })
            );

            GroupApi.get("87").engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        groupID: "87",
                        groupName: "private group",
                        groupAdmins: ["2"],
                        groupMembers: ["2", "53"],
                        isAdmin: true,
                        isMember: true,
                        created: "1",
                        updated: "2",
                        needsRotation: true,
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("87");
                }
            );
        });

        it("returns partial response if only meta info is returned", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    permissions: [],
                    created: "1",
                    updated: "2",
                    needsRotation: true,
                })
            );

            GroupApi.get("87").engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        groupID: "87",
                        groupName: "private group",
                        isAdmin: false,
                        isMember: false,
                        created: "1",
                        updated: "2",
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("87");
                }
            );
        });
    });

    describe("create", () => {
        it("requests create endpoint with ID and options and maps response", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            const memberList = [{id: "user2ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];
            const adminList = [
                {id: "user1ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user3ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const userKeyList = [
                {id: "user1ID", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user2ID", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user3ID", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeyList}) as any);
            jest.spyOn(GroupOperations, "groupCreate").mockReturnValue(
                Future.of<any>({
                    encryptedAccessKeys: "encryptedAccessKeys",
                    groupPublicKey: "groupPublicKey",
                    transformKeyGrantList: "transformKeyGrantList",
                }) as any
            );

            jest.spyOn(GroupApiEndpoints, "callGroupCreateApi").mockReturnValue(
                Future.of<any>({
                    groupPublicKey: "groupPublicKey",
                    name: "groupName",
                    id: "groupID",
                    adminIds: ["adminList"],
                    memberIds: ["memberList"],
                    permissions: [],
                    needsRotation: false,
                    created: "1",
                    updated: "2",
                }) as any
            );

            GroupApi.create("groupID", "groupName", false, ["user2ID"], ["user3ID"], "user1ID").engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        groupID: "groupID",
                        groupName: "groupName",
                        groupAdmins: ["adminList"],
                        groupMembers: ["memberList"],
                        needsRotation: false,
                        created: "1",
                        updated: "2",
                        isAdmin: false,
                        isMember: false,
                    });
                    expect(GroupOperations.groupCreate).toHaveBeenCalledWith(ApiState.signingKeys(), memberList, adminList);
                    expect(GroupApiEndpoints.callGroupCreateApi).toHaveBeenCalledWith(
                        "groupID",
                        "groupPublicKey",
                        "encryptedAccessKeys",
                        false,
                        "transformKeyGrantList",
                        "user1ID",
                        "groupName"
                    );
                }
            );
        });
        it("resolve duplicates in userLists", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            const userKeyList = [
                {id: "user1", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user2", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            jest.spyOn(GroupOperations, "groupCreate").mockReturnValue(
                Future.of<any>({
                    encryptedAccessKeys: [],
                    groupPublicKey: TestUtils.getEmptyPublicKeyString(),
                    transformKeyGrantList: [],
                }) as any
            );

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi");
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeyList}) as any);

            GroupApi.create("groupID", "private group", true, ["user1", "user1"], ["user1", "user1", "user2"], "user1").engage(
                (e) => {
                    throw e;
                },
                () => {
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1, user2"]);
                    expect(GroupOperations.groupCreate).toHaveBeenCalledWith(
                        ApiState.signingKeys(),
                        [{id: "user1", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                        [
                            {id: "user1", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                            {id: "user2", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        ],
                        "user1"
                    );
                }
            );
        });
        it("fails if memberList is sent and contains non existent user", () => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "user1ID", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                }) as any
            );

            GroupApi.create("", "private group", false, ["user1", "user2"], []).engage(
                (e) => {
                    expect(e.message).toContain(["user2"]);
                    expect(e.code).toEqual(ErrorCodes.GROUP_CREATE_WITH_MEMBERS_OR_ADMINS_FAILURE);
                },
                () => fail("Should not be able to create group with members if mamber list request contains non existent users")
            );
        });
        it("fails if adminList is sent and contains non existent user", () => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: [{id: "user1ID", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()}],
                }) as any
            );

            GroupApi.create("", "private group", false, [], ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toContain(["user2"]);
                    expect(e.code).toEqual(ErrorCodes.GROUP_CREATE_WITH_MEMBERS_OR_ADMINS_FAILURE);
                },
                () => fail("Should not be able to create group with members if mamber list request contains non existent users")
            );
        });
        it("if needsRotation is set to true callGroupCreateApi is called with needsRotation true", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            jest.spyOn(GroupOperations, "groupCreate").mockReturnValue(
                Future.of<any>({
                    encryptedAccessKeys: [],
                    groupPublicKey: TestUtils.getEmptyPublicKeyString(),
                    transformKeyGrantList: [],
                }) as any
            );

            jest.spyOn(GroupApiEndpoints, "callGroupCreateApi");

            GroupApi.create("groupID", "private group", true, [], ["alwaysOwner"]).engage(
                (e) => {
                    throw e;
                },
                () => {
                    expect(GroupApiEndpoints.callGroupCreateApi).toHaveBeenCalledWith(
                        "groupID",
                        "groupPublicKey",
                        "encryptedAccessKeys",
                        true,
                        "transformKeyGrantList",
                        "ownerUserId",
                        "private group"
                    );
                }
            );
        });
    });

    describe("rotateGroupPrivateKey", () => {
        it("make request to API and map resul to expected Object", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            const userKeys = [
                {id: "id1", userMasterPublicKey: {x: "key1"}},
                {id: "id2", userMasterPublicKey: {x: "key2"}},
            ];

            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({
                    groupMasterPublicKey: {x: "12", y: "23"},
                    groupID: "myGroup",
                    encryptedPrivateKey: "encryptedPrivKey",
                    permissions: ["admin", "member"],
                    adminIds: ["id1", "id2"],
                    currentKeyId: 1,
                }) as any
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}) as any);
            jest.spyOn(GroupOperations, "rotateGroupPrivateKeyAndEncryptToAdmins").mockReturnValue(
                Future.of<any>({
                    encryptedAccessKeys: ["encryptedAccessKey1", "encryptedAccessKey2"],
                    augmentationFactor: new Uint8Array(32),
                }) as any
            );
            jest.spyOn(GroupApiEndpoints, "callGroupPrivateKeyUpdateApi").mockReturnValue(Future.of<any>({needsRotation: false}) as any);

            GroupApi.rotateGroupPrivateKey("myGroup").engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        needsRotation: false,
                    });
                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("myGroup");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["id1", "id2"]);
                    expect(GroupOperations.rotateGroupPrivateKeyAndEncryptToAdmins).toHaveBeenCalledWith(
                        "encryptedPrivKey",
                        [
                            {id: "id1", masterPublicKey: {x: "key1"}},
                            {id: "id2", masterPublicKey: {x: "key2"}},
                        ],
                        expect.any(Uint8Array),
                        ApiState.signingKeys()
                    );
                    expect(GroupApiEndpoints.callGroupPrivateKeyUpdateApi).toHaveBeenCalledWith(
                        "myGroup",
                        ["encryptedAccessKey1", "encryptedAccessKey2"],
                        new Uint8Array(32),
                        1
                    );
                }
            );
        });
        it("return an error if the user requesting the rotation is not an admin of the group", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(Future.of<any>({groupID: "33", permissions: []}) as any);
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: ["key1", "key2"]}) as any);

            GroupApi.rotateGroupPrivateKey("notYourGroup").engage(
                (e) => {
                    expect(e.message).toContain(["Current user is not authorized to rotate this groups private key as they are not a group administrator."]);
                    expect(e.code).toEqual(ErrorCodes.GROUP_ROTATE_PRIVATE_KEY_NOT_ADMIN_FAILURE);
                },
                () => fail("Should not be able to rotate the group private key if the requesting user is not an admin")
            );
        });
    });

    describe("update", () => {
        it("makes request to API and maps result to expected object", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupUpdateApi").mockReturnValue(
                Future.of<any>({
                    id: "88",
                    name: "new name",
                    permissions: ["admin"],
                    created: "123",
                    updated: "456",
                })
            );

            GroupApi.update("88", "new name").engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        groupID: "88",
                        groupName: "new name",
                        isAdmin: true,
                        isMember: false,
                        created: "123",
                        updated: "456",
                    });
                }
            );
        });
    });

    describe("addAdmins", () => {
        it("makes all expected API calls to add admins to group", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            const userKeys = [
                {id: "id1", userMasterPublicKey: {x: "key1"}},
                {id: "id2", userMasterPublicKey: {x: "key2"}},
            ];
            const signature = new Uint8Array(32);

            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({
                    groupMasterPublicKey: {x: "12", y: "23"},
                    groupID: "32",
                    encryptedPrivateKey: "encryptedPrivKey",
                    permissions: ["admin", "member"],
                    adminIds: ["id1"],
                })
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupOperations, "encryptGroupPrivateKeyToList").mockReturnValue(
                Future.of<any>({encryptedAccessKey: ["encryptedAccessKey1", "encryptedAccessKey2"], signature})
            );
            jest.spyOn(GroupApiEndpoints, "callAddAdminsApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "user1"}, {userId: "user2"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );

            GroupApi.addAdmins("33", ["user1", "user2"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["user1", "user2"],
                        failed: [{id: "12", error: "does not exist"}],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("33");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupApiEndpoints.callAddAdminsApi).toHaveBeenCalledWith("33", ["encryptedAccessKey1", "encryptedAccessKey2"], signature);
                    expect(GroupOperations.encryptGroupPrivateKeyToList).toHaveBeenCalledWith(
                        "encryptedPrivKey",
                        {x: "12", y: "23"},
                        "33",
                        [
                            {id: "id1", masterPublicKey: {x: "key1"}},
                            {id: "id2", masterPublicKey: {x: "key2"}},
                        ],
                        expect.any(Uint8Array),
                        ApiState.signingKeys()
                    );
                }
            );
        });

        it("returns list of failures when no users entered exist", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"]})
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupOperations, "encryptGroupPrivateKeyToList");

            GroupApi.addAdmins("33", ["user1", "user2"]).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: [],
                        failed: [
                            {id: "user1", error: expect.any(String)},
                            {id: "user2", error: expect.any(String)},
                        ],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("33");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupOperations.encryptGroupPrivateKeyToList).not.toHaveBeenCalled();
                }
            );
        });

        it("fails if the group get response doesnt return an encrypted private key, indicating the user is not a group admin", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(Future.of<any>({groupID: "33", permissions: []}));
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: ["key1", "key2"]}));

            GroupApi.addAdmins("33", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("fails if the group get response only says the current user is a member and not an admin", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(Future.of<any>({groupID: "61", permissions: ["user"]}));
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: ["key1", "key2"]}));

            GroupApi.addAdmins("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("correctly includes requested users who didnt exist in failure list", () => {
            const userKeys = [
                {id: "id1", userMasterPublicKey: {x: "key1"}},
                {id: "id2", userMasterPublicKey: {x: "key2"}},
            ];

            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"], adminIds: ["id1"]})
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupOperations, "encryptGroupPrivateKeyToList").mockReturnValue(Future.of<any>(["encryptedAccessKey1", "encryptedAccessKey2"]));
            jest.spyOn(GroupApiEndpoints, "callAddAdminsApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "id1"}, {userId: "id2"}],
                    failedIds: [{userId: "id3", errorMessage: "does not exist"}],
                })
            );

            GroupApi.addAdmins("33", ["id1", "id2", "id3", "id4"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["id1", "id2"],
                        failed: [
                            {id: "id3", error: "does not exist"},
                            {id: "id4", error: "ID did not exist in the system."},
                        ],
                    });
                }
            );
        });
    });

    describe("removeAdmins", () => {
        it("invokes group admin remove API and maps result correctly", () => {
            jest.spyOn(GroupApiEndpoints, "callRemoveAdminsApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "88"}, {userId: "13"}],
                    failedIds: [
                        {userId: "12", errorMessage: "does not exist"},
                        {userId: "33", errorMessage: "is group creator"},
                    ],
                })
            );

            GroupApi.removeAdmins("3235", ["88", "13", "12", "33"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["88", "13"],
                        failed: [
                            {id: "12", error: "does not exist"},
                            {id: "33", error: "is group creator"},
                        ],
                    });
                }
            );
        });

        it("includes list of users in failures if the arent included in response", () => {
            jest.spyOn(GroupApiEndpoints, "callRemoveAdminsApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "88"}],
                    failedIds: [
                        {userId: "12", errorMessage: "does not exist"},
                        {userId: "33", errorMessage: "is group creator"},
                    ],
                })
            );

            GroupApi.removeAdmins("3235", ["88", "13", "12", "33"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["88"],
                        failed: [
                            {id: "12", error: "does not exist"},
                            {id: "33", error: "is group creator"},
                            {id: "13", error: "ID did not exist in the system."},
                        ],
                    });
                }
            );
        });
    });

    describe("addMembers", () => {
        it("makes all expected API calls to add members to group", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            const userKeys = [
                {id: "id1", userMasterPublicKey: {x: "key1"}},
                {id: "id2", userMasterPublicKey: {x: "key2"}},
            ];
            const signature = new Uint8Array(32);

            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({
                    groupID: "32",
                    encryptedPrivateKey: "encryptedPrivKey",
                    groupMasterPublicKey: {x: "12", y: "23"},
                    permissions: ["admin", "member"],
                    adminIds: ["id1"],
                })
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupApiEndpoints, "callAddMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "user1"}, {userId: "user2"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );
            jest.spyOn(GroupOperations, "generateGroupTransformKeyToList").mockReturnValue(
                Future.of<any>({transformKeyGrant: ["transformKey1", "transformKey2"], signature})
            );

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: ["user1", "user2"],
                        failed: [{id: "12", error: "does not exist"}],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("61");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupApiEndpoints.callAddMembersApi).toHaveBeenCalledWith("61", ["transformKey1", "transformKey2"], signature);
                    expect(GroupOperations.generateGroupTransformKeyToList).toHaveBeenCalledWith(
                        "encryptedPrivKey",
                        {x: "12", y: "23"},
                        "61",
                        [
                            {id: "id1", masterPublicKey: {x: "key1"}},
                            {id: "id2", masterPublicKey: {x: "key2"}},
                        ],
                        expect.any(Uint8Array),
                        ApiState.signingKeys()
                    );

                    done();
                }
            );
        });

        it("fails fast if none of the requested members exist", (done) => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"]})
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupOperations, "generateGroupTransformKeyToList");

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: [],
                        failed: [
                            {id: "user1", error: expect.any(String)},
                            {id: "user2", error: expect.any(String)},
                        ],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("61");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupOperations.generateGroupTransformKeyToList).not.toHaveBeenCalled();
                    done();
                }
            );
        });

        it("fails if the group get response doesnt return an encrypted private key, indicating the user is not a group admin", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(Future.of<any>({groupID: "32", permissions: []}));
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: ["key1", "key2"]}));

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("fails if the group get response only indicates that the user is a member and not an admin", () => {
            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(Future.of<any>({groupID: "32", permissions: ["user"]}));
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: ["key1", "key2"]}));

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("includes users who were requested but didnt exist in failure list", () => {
            const userKeys = [
                {id: "id1", userMasterPublicKey: {x: "key1"}},
                {id: "id2", userMasterPublicKey: {x: "key2"}},
            ];

            jest.spyOn(GroupApiEndpoints, "callGroupGetApi").mockReturnValue(
                Future.of<any>({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"], adminIds: ["id1"]})
            );
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: userKeys}));
            jest.spyOn(GroupApiEndpoints, "callAddMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "user1"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );
            jest.spyOn(GroupOperations, "generateGroupTransformKeyToList").mockReturnValue(Future.of<any>(["transformKey1", "transformKey2"]));

            GroupApi.addMembers("61", ["user1", "user2", "12"]).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: ["user1"],
                        failed: [
                            {id: "12", error: "does not exist"},
                            {id: "user2", error: "ID did not exist in the system."},
                        ],
                    });
                }
            );
        });
    });

    describe("removeMembers", () => {
        it("invokes API with list and maps result correctly", (done) => {
            jest.spyOn(GroupApiEndpoints, "callRemoveMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "user1"}, {userId: "user2"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );

            GroupApi.removeMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: ["user1", "user2"],
                        failed: [{id: "12", error: "does not exist"}],
                    });

                    expect(GroupApiEndpoints.callRemoveMembersApi).toHaveBeenCalledWith("61", ["user1", "user2"]);
                    done();
                }
            );
        });

        it("includes list of users in failures if the arent included in response", () => {
            jest.spyOn(GroupApiEndpoints, "callRemoveMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "88"}],
                    failedIds: [
                        {userId: "12", errorMessage: "does not exist"},
                        {userId: "33", errorMessage: "is group creator"},
                    ],
                })
            );

            GroupApi.removeMembers("3235", ["88", "13", "12", "33"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["88"],
                        failed: [
                            {id: "12", error: "does not exist"},
                            {id: "33", error: "is group creator"},
                            {id: "13", error: "ID did not exist in the system."},
                        ],
                    });
                }
            );
        });
    });

    describe("removeSelfAsMember", () => {
        it("invokes API with current user and maps result correctly", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            jest.spyOn(GroupApiEndpoints, "callRemoveMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [{userId: "user-10"}],
                    failedIds: [],
                })
            );

            GroupApi.removeSelfAsMember("61").engage(
                (e) => {
                    throw e;
                },
                (result) => {
                    expect(result).toEqual("user-10");

                    expect(GroupApiEndpoints.callRemoveMembersApi).toHaveBeenCalledWith("61", ["user-10"]);
                    done();
                }
            );
        });

        it("returns expected error code if group remove API returns any failure results", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            jest.spyOn(GroupApiEndpoints, "callRemoveMembersApi").mockReturnValue(
                Future.of<any>({
                    succeededIds: [],
                    failedIds: [{userId: "user-10", error: "failed"}],
                })
            );

            GroupApi.removeSelfAsMember("61").engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.GROUP_REMOVE_SELF_REQUEST_FAILURE);
                    done();
                },
                () => fail("Remove self should not succeed if there were any failures")
            );
        });
    });

    describe("deleteGroup", () => {
        it("invokes API to delete the group", (done) => {
            jest.spyOn(GroupApiEndpoints, "callGroupDeleteApi").mockReturnValue(Future.of<any>({id: "3325"}));

            GroupApi.deleteGroup("3325").engage(
                (e) => {
                    throw e;
                },
                (result) => {
                    expect(result).toEqual({id: "3325"} as any);
                    done();
                }
            );
        });
    });
});

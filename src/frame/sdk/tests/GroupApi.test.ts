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
            spyOn(GroupApiEndpoints, "callGroupListApi").and.returnValue(
                Future.of({
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
                (e) => fail(e),
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
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    adminIds: ["2"],
                    memberIds: ["2", "53"],
                    permissions: ["member", "admin"],
                    created: "1",
                    updated: "2",
                })
            );

            GroupApi.get("87").engage(
                (e) => fail(e),
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
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("87");
                }
            );
        });

        it("returns partial response if only meta info is returned", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    permissions: [],
                    created: "1",
                    updated: "2",
                })
            );

            GroupApi.get("87").engage(
                (e) => fail(e),
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
        it("requests create endpoint with ID and options and maps response, if addAsMemeber is set to false, transform key will return undefined", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            spyOn(GroupApiEndpoints, "callGroupCreateApi").and.returnValue(
                Future.of({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    adminIds: ["2"],
                    memberIds: ["2", "53"],
                    permissions: ["admin"],
                    created: "1",
                    updated: "2",
                })
            );

            spyOn(GroupOperations, "groupCreate").and.returnValue(
                Future.of({
                    encryptedGroupKey: "encGroupKey",
                    groupPublicKey: "pub",
                    transformKey: undefined,
                })
            );

            GroupApi.create("23", "private group", false).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({
                        groupID: "87",
                        groupName: "private group",
                        groupAdmins: ["2"],
                        groupMembers: ["2", "53"],
                        isAdmin: true,
                        isMember: false,
                        created: "1",
                        updated: "2",
                    });

                    expect(GroupApiEndpoints.callGroupCreateApi).toHaveBeenCalledWith("23", "pub", "encGroupKey", "private group", undefined);
                    expect(GroupOperations.groupCreate).toHaveBeenCalledWith(TestUtils.userPublicBytes, ApiState.signingKeys(), false);
                }
            );
        });

        it("if addAsMemeber is set to true, transform key will return with a value", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            spyOn(GroupApiEndpoints, "callGroupCreateApi").and.returnValue(
                Future.of({
                    groupPublicKey: "bar",
                    name: "private group",
                    id: "87",
                    adminIds: ["2"],
                    memberIds: ["2", "53"],
                    permissions: ["admin"],
                    created: "1",
                    updated: "2",
                })
            );

            spyOn(GroupOperations, "groupCreate").and.returnValue(
                Future.of({
                    encryptedGroupKey: "encGroupKey",
                    groupPublicKey: "pub",
                    transformKey: TestUtils.getTransformKey(),
                })
            );

            GroupApi.create("", "private group", true).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({
                        groupID: "87",
                        groupName: "private group",
                        groupAdmins: ["2"],
                        groupMembers: ["2", "53"],
                        isAdmin: true,
                        isMember: false,
                        created: "1",
                        updated: "2",
                    });

                    expect(GroupApiEndpoints.callGroupCreateApi).toHaveBeenCalledWith("", "pub", "encGroupKey", "private group", TestUtils.getTransformKey());
                    expect(GroupOperations.groupCreate).toHaveBeenCalledWith(TestUtils.userPublicBytes, ApiState.signingKeys(), true);
                }
            );
        });
    });

    describe("update", () => {
        it("makes request to API and maps result to expected object", () => {
            spyOn(GroupApiEndpoints, "callGroupUpdateApi").and.returnValue(
                Future.of({
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
            const userKeys = [{id: "id1", userMasterPublicKey: {x: "key1"}}, {id: "id2", userMasterPublicKey: {x: "key2"}}];

            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"], adminIds: ["id1"]})
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: userKeys}));
            spyOn(GroupOperations, "encryptGroupPrivateKeyToList").and.returnValue(Future.of(["encryptedAccessKey1", "encryptedAccessKey2"]));
            spyOn(GroupApiEndpoints, "callAddAdminsApi").and.returnValue(
                Future.of({
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
                    expect(GroupApiEndpoints.callAddAdminsApi).toHaveBeenCalledWith("33", ["encryptedAccessKey1", "encryptedAccessKey2"]);
                    expect(GroupOperations.encryptGroupPrivateKeyToList).toHaveBeenCalledWith(
                        "encryptedPrivKey",
                        [{id: "id1", masterPublicKey: {x: "key1"}}, {id: "id2", masterPublicKey: {x: "key2"}}],
                        expect.any(Uint8Array),
                        ApiState.signingKeys()
                    );
                }
            );
        });

        it("returns list of failures when no users entered exist", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"]})
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: []}));
            spyOn(GroupOperations, "encryptGroupPrivateKeyToList");

            GroupApi.addAdmins("33", ["user1", "user2"]).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: [],
                        failed: [{id: "user1", error: expect.any(String)}, {id: "user2", error: expect.any(String)}],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("33");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupOperations.encryptGroupPrivateKeyToList).not.toHaveBeenCalled();
                }
            );
        });

        it("fails if the group get response doesnt return an encrypted private key, indicating the user is not a group admin", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(Future.of({groupID: "33", permissions: []}));
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: ["key1", "key2"]}));

            GroupApi.addAdmins("33", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("fails if the group get response only says the current user is a member and not an admin", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(Future.of({groupID: "61", permissions: ["user"]}));
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: ["key1", "key2"]}));

            GroupApi.addAdmins("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("correctly includes requested users who didnt exist in failure list", () => {
            const userKeys = [{id: "id1", userMasterPublicKey: {x: "key1"}}, {id: "id2", userMasterPublicKey: {x: "key2"}}];

            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"], adminIds: ["id1"]})
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: userKeys}));
            spyOn(GroupOperations, "encryptGroupPrivateKeyToList").and.returnValue(Future.of(["encryptedAccessKey1", "encryptedAccessKey2"]));
            spyOn(GroupApiEndpoints, "callAddAdminsApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "id1"}, {userId: "id2"}],
                    failedIds: [{userId: "id3", errorMessage: "does not exist"}],
                })
            );

            GroupApi.addAdmins("33", ["id1", "id2", "id3", "id4"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["id1", "id2"],
                        failed: [{id: "id3", error: "does not exist"}, {id: "id4", error: "ID did not exist in the system."}],
                    });
                }
            );
        });
    });

    describe("removeAdmins", () => {
        it("invokes group admin remove API and maps result correctly", () => {
            spyOn(GroupApiEndpoints, "callRemoveAdminsApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "88"}, {userId: "13"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}, {userId: "33", errorMessage: "is group creator"}],
                })
            );

            GroupApi.removeAdmins("3235", ["88", "13", "12", "33"]).engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toEqual({
                        succeeded: ["88", "13"],
                        failed: [{id: "12", error: "does not exist"}, {id: "33", error: "is group creator"}],
                    });
                }
            );
        });

        it("includes list of users in failures if the arent included in response", () => {
            spyOn(GroupApiEndpoints, "callRemoveAdminsApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "88"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}, {userId: "33", errorMessage: "is group creator"}],
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
            const userKeys = [{id: "id1", userMasterPublicKey: {x: "key1"}}, {id: "id2", userMasterPublicKey: {x: "key2"}}];
            const signature = new Uint8Array(32);

            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({
                    groupID: "32",
                    encryptedPrivateKey: "encryptedPrivKey",
                    groupMasterPublicKey: {x: "12", y: "23"},
                    GroupID: "groupID",
                    permissions: ["admin", "member"],
                    adminIds: ["id1"],
                })
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: userKeys}));
            spyOn(GroupApiEndpoints, "callAddMembersApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "user1"}, {userId: "user2"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );
            spyOn(GroupOperations, "generateGroupTransformKeyToList").and.returnValue(
                Future.of({transformKeyGrant: ["transformKey1", "transformKey2"], signature})
            );

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => fail(e),
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
                        [{id: "id1", masterPublicKey: {x: "key1"}}, {id: "id2", masterPublicKey: {x: "key2"}}],
                        expect.any(Uint8Array),
                        ApiState.signingKeys()
                    );

                    done();
                }
            );
        });

        it("fails fast if none of the requested members exist", (done) => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"]})
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: []}));
            spyOn(GroupOperations, "generateGroupTransformKeyToList");

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: [],
                        failed: [{id: "user1", error: expect.any(String)}, {id: "user2", error: expect.any(String)}],
                    });

                    expect(GroupApiEndpoints.callGroupGetApi).toHaveBeenCalledWith("61");
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user1", "user2"]);
                    expect(GroupOperations.generateGroupTransformKeyToList).not.toHaveBeenCalled();
                    done();
                }
            );
        });

        it("fails if the group get response doesnt return an encrypted private key, indicating the user is not a group admin", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(Future.of({groupID: "32", permissions: []}));
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: ["key1", "key2"]}));

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("fails if the group get response only indicates that the user is a member and not an admin", () => {
            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(Future.of({groupID: "32", permissions: ["user"]}));
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: ["key1", "key2"]}));

            GroupApi.addMembers("61", ["user1", "user2"]).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toBeNumber();
                },
                () => fail("Should not be able to add members when user is not an admin and GET does not return an encrypted private key")
            );
        });

        it("includes users who were requested but didnt exist in failure list", () => {
            const userKeys = [{id: "id1", userMasterPublicKey: {x: "key1"}}, {id: "id2", userMasterPublicKey: {x: "key2"}}];

            spyOn(GroupApiEndpoints, "callGroupGetApi").and.returnValue(
                Future.of({groupID: "32", encryptedPrivateKey: "encryptedPrivKey", permissions: ["admin", "member"], adminIds: ["id1"]})
            );
            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(Future.of({result: userKeys}));
            spyOn(GroupApiEndpoints, "callAddMembersApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "user1"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );
            spyOn(GroupOperations, "generateGroupTransformKeyToList").and.returnValue(Future.of(["transformKey1", "transformKey2"]));

            GroupApi.addMembers("61", ["user1", "user2", "12"]).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({
                        succeeded: ["user1"],
                        failed: [{id: "12", error: "does not exist"}, {id: "user2", error: "ID did not exist in the system."}],
                    });
                }
            );
        });
    });

    describe("removeMembers", () => {
        it("invokes API with list and maps result correctly", (done) => {
            spyOn(GroupApiEndpoints, "callRemoveMembersApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "user1"}, {userId: "user2"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}],
                })
            );

            GroupApi.removeMembers("61", ["user1", "user2"]).engage(
                (e) => fail(e),
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
            spyOn(GroupApiEndpoints, "callRemoveMembersApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "88"}],
                    failedIds: [{userId: "12", errorMessage: "does not exist"}, {userId: "33", errorMessage: "is group creator"}],
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
            spyOn(GroupApiEndpoints, "callRemoveMembersApi").and.returnValue(
                Future.of({
                    succeededIds: [{userId: "user-10"}],
                    failedIds: [],
                })
            );

            GroupApi.removeSelfAsMember("61").engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual("user-10");

                    expect(GroupApiEndpoints.callRemoveMembersApi).toHaveBeenCalledWith("61", ["user-10"]);
                    done();
                }
            );
        });

        it("returns expected error code if group remove API returns any failure results", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            spyOn(GroupApiEndpoints, "callRemoveMembersApi").and.returnValue(
                Future.of({
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
            spyOn(GroupApiEndpoints, "callGroupDeleteApi").and.returnValue(Future.of({id: "3325"}));

            GroupApi.deleteGroup("3325").engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual({id: "3325"} as any);
                    done();
                }
            );
        });
    });
});

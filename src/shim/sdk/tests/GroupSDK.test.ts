import * as GroupSDK from "../GroupSDK";
import * as FrameMediator from "../../FrameMediator";
import * as ShimUtils from "../../ShimUtils";
import Future from "futurejs";

describe("GroupSDK", () => {
    beforeEach(() => {
        spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({message: "messageResponse"}));
    });

    afterEach(() => {
        ShimUtils.clearSDKInitialized();
    });

    describe("group API", () => {
        describe("list", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.list()).toThrow();
            });

            it("sends message to frame and maps message", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.list()
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_LIST",
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("get", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.get("abc")).toThrow();
            });

            it("fails when group ID is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.get(8 as any)).toThrow();
                expect(() => GroupSDK.get("ID 1")).toThrow();
                expect(() => GroupSDK.get("")).toThrow();
            });

            it("sends payload to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.get("3")
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_GET",
                            message: {
                                groupID: "3",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("create", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.create()).toThrow();
            });

            it("fails when group ID is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.create({groupID: 8} as any)).toThrow();
                expect(() => GroupSDK.create({groupID: []} as any)).toThrow();
                expect(() => GroupSDK.create({groupID: ",asega"})).toThrow();
            });
            it("sends create message to frame with default options if nothing is passed in", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create()
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: undefined,
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("sends create message to frame with groupID if that value is valid and passes as an option", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({groupID: "providedGroupID"})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "providedGroupID",
                                groupName: "",
                                ownerUserId: undefined,
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("sends create message to frame with addAsMemberValue if that value is passed in as options", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({addAsMember: false})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: undefined,
                                addAsMember: false,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("sends create message to frame with addAsAdmin value and ownerUserIdif that value is passed in as options", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({addAsAdmin: false, ownerUserId: "owner"})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: "owner",
                                addAsMember: true,
                                addAsAdmin: false,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("sends create message to frame with groupName if that value is passed in as options", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({groupName: "abc"})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "abc",
                                ownerUserId: undefined,
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("sends create message to frame with options passed in if provided", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({
                    groupID: "providedID",
                    groupName: "abc",
                    ownerUserId: "ownerUserId",
                    addAsMember: true,
                    addAsAdmin: true,
                    needsRotation: true,
                    memberList: ["user1Id"],
                    adminList: ["user2Id"],
                })
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "providedID",
                                groupName: "abc",
                                ownerUserId: "ownerUserId",
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: true,
                                userLists: {
                                    memberList: ["user1Id"],
                                    adminList: ["user2Id"],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("sends create message to frame with memberList when provided", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({memberList: ["user1", "user2"]})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: undefined,
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: ["user1", "user2"],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("sends create message to frame with adminList when provided", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({adminList: ["user1", "user2"]})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: undefined,
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: ["user1", "user2"],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
            it("send create message to frame with ownerUserId if provided", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.create({ownerUserId: "ownerUserId"})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_CREATE",
                            message: {
                                groupID: "",
                                groupName: "",
                                ownerUserId: "ownerUserId",
                                addAsMember: true,
                                addAsAdmin: true,
                                needsRotation: false,
                                userLists: {
                                    memberList: [],
                                    adminList: [],
                                },
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });
        describe("rotateGroupPrivateKey", () => {
            it("throw if SDK has not yet been initialized", () => {
                ShimUtils.clearSDKInitialized();
                expect(() => GroupSDK.rotateGroupPrivateKey("current")).toThrow();
            });
            it("send rotate group private key payload to the frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.rotateGroupPrivateKey("myGroup")
                    .then((result: any) => {
                        expect(result).toBeUndefined();
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "ROTATE_GROUP_PRIVATE_KEY",
                            message: {
                                groupID: "myGroup",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e.message));
            });
        });

        describe("update", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.update("5", {groupName: "name"})).toThrow();
            });

            it("fails validation if groupID or group name is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.update("", {groupName: "abc"})).toThrow();
                expect(() => GroupSDK.update("id two", {groupName: "abc"})).toThrow();
                expect(() => GroupSDK.update("^35", {groupName: "abc"})).toThrow();

                expect(() => GroupSDK.update("35", {} as any)).toThrow();
                expect(() => GroupSDK.update("35", {groupName: undefined} as any)).toThrow();
                expect(() => GroupSDK.update("35", {groupName: ""})).toThrow();
            });

            it("sends update payload to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.update("6", {groupName: "new name"})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_UPDATE",
                            message: {
                                groupID: "6",
                                groupName: "new name",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("sends null value for group name", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.update("6", {groupName: null})
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_UPDATE",
                            message: {
                                groupID: "6",
                                groupName: null,
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("addAdmins", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.addAdmins("5", ["3", "35"])).toThrow();
            });

            it("fails validation if groupID or admin list is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.addAdmins("", [])).toThrow();
                expect(() => GroupSDK.addAdmins("35", [])).toThrow();
                expect(() => GroupSDK.addAdmins("^35", ["id2"])).toThrow();
            });

            it("sends add admins message to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.addAdmins("6", ["5", "36", "894"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_ADD_ADMINS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "894"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("dedupes users in array before submitting", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.addAdmins("6", ["5", "36", "5", "611"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_ADD_ADMINS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "611"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("removeAdmins", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.removeAdmins("5", ["33"])).toThrow();
            });

            it("fails validation if groupID or member list is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.removeAdmins("", [])).toThrow();
                expect(() => GroupSDK.removeAdmins("35", [])).toThrow();
                expect(() => GroupSDK.removeAdmins("<ID>", ["id2"])).toThrow();
            });

            it("sends remove members message to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.removeAdmins("6", ["5", "36", "894"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_REMOVE_ADMINS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "894"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("dedupes users in array before submitting", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.removeAdmins("6", ["5", "36", "5", "611"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_REMOVE_ADMINS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "611"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("addMembers", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.addMembers("3", ["35", "32"])).toThrow();
            });

            it("fails validation if groupID or member list is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.addMembers("", [])).toThrow();
                expect(() => GroupSDK.addMembers("35", [])).toThrow();
                expect(() => GroupSDK.addMembers("{id}", ["abc"])).toThrow();
            });

            it("sends add members message to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.addMembers("6", ["5", "36", "894"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_ADD_MEMBERS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "894"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("dedupes users in array before submitting", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.addMembers("6", ["5", "36", "5", "611"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_ADD_MEMBERS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "611"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("removeMembers", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.removeMembers("6", ["5", "36", "894"])).toThrow();
            });

            it("fails validation if groupID or member list is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.removeMembers("", [])).toThrow();
                expect(() => GroupSDK.removeMembers("35", [])).toThrow();
                expect(() => GroupSDK.removeMembers("%ID", ["ID2"])).toThrow();
            });

            it("sends remove members message to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.removeMembers("6", ["5", "36", "894"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_REMOVE_MEMBERS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "894"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });

            it("dedupes users in array before submitting", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.removeMembers("6", ["5", "36", "5", "611"])
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_REMOVE_MEMBERS",
                            message: {
                                groupID: "6",
                                userList: ["5", "36", "611"],
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("removeSelf", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.removeSelfAsMember("group6")).toThrow();
            });

            it("fails validation if groupID or member list is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.removeSelfAsMember("")).toThrow();
                expect(() => GroupSDK.removeSelfAsMember("ID2,ID1")).toThrow();
            });

            it("sends remove self request to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.removeSelfAsMember("group6")
                    .then((result: any) => {
                        expect(result).toBeUndefined();
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_REMOVE_SELF_AS_MEMBER",
                            message: {
                                groupID: "group6",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });

        describe("deleteGroup", () => {
            it("throws if SDK has not yet been initialized", () => {
                expect(() => GroupSDK.deleteGroup("group6")).toThrow();
            });

            it("fails validation if groupID is invalid", () => {
                ShimUtils.setSDKInitialized();
                expect(() => GroupSDK.deleteGroup("")).toThrow();
                expect(() => GroupSDK.deleteGroup("ID2,ID1")).toThrow();
            });

            it("sends remove self request to frame", (done) => {
                ShimUtils.setSDKInitialized();
                GroupSDK.deleteGroup("group6")
                    .then((result: any) => {
                        expect(result).toEqual("messageResponse");
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "GROUP_DELETE",
                            message: {
                                groupID: "group6",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e));
            });
        });
    });
});

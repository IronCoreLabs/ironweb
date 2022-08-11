import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import ApiState from "../../ApiState";
import GroupApiEndpoints from "../GroupApiEndpoints";

describe("GroupApiEndpoints", () => {
    var apiSpy: jasmine.Spy;
    beforeEach(() => {
        apiSpy = jest.spyOn(ApiRequest, "makeAuthorizedApiRequest").and.returnValue(
            Future.of({
                foo: "bar",
            })
        );
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
    });

    describe("callGroupListApi", () => {
        it("requests group list endpoint and maps response to data result", () => {
            GroupApiEndpoints.callGroupListApi().engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups", expect.any(Number), expect.any(Object));
                }
            );
        });
    });

    describe("callGroupKeyListApi", () => {
        it("requests group list endpoint and maps response to data result", () => {
            const id1 = "group-10";
            const key1 = "group-10-key";
            const id2 = "group-20";
            const key2 = "group-20-key";
            const apiResp = {
                result: [
                    {id: id1, groupMasterPublicKey: key1},
                    {id: id2, groupMasterPublicKey: key2},
                ],
            };
            apiSpy.and.returnValue(Future.of(apiResp));
            GroupApiEndpoints.callGroupKeyListApi([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups?id=group-10%2Cgroup-20", expect.any(Number), expect.any(Object));
                }
            );
        });

        it("escapes IDs that are passed in", () => {
            const id1 = "~`!@#$%^&*()-_=+[{]};:<.>/?";
            const key1 = "group-10-key";
            const id2 = "&<>";
            const key2 = "group-20-key";
            const apiResp = {
                result: [
                    {id: id1, groupMasterPublicKey: key1},
                    {id: id2, groupMasterPublicKey: key2},
                ],
            };
            apiSpy.and.returnValue(Future.of(apiResp));
            GroupApiEndpoints.callGroupKeyListApi([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "groups?id=~%60!%40%23%24%25%5E%26*()-_%3D%2B%5B%7B%5D%7D%3B%3A%3C.%3E%2F%3F%2C%26%3C%3E",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });

        it("returns empty array if no group IDs provided", () => {
            GroupApiEndpoints.callGroupKeyListApi([]).engage(
                (e) => fail(e),
                (groups) => {
                    expect(groups).toEqual({result: []});
                    expect(ApiRequest.makeAuthorizedApiRequest).not.toHaveBeenCalled();
                }
            );
        });
    });

    describe("getGroupPublicKeyList", () => {
        it("only calls to API the first time for a list of group keys.", () => {
            const id1 = "group-10";
            const key1 = "group-10-key";
            const id2 = "group-20";
            const key2 = "group-20-key";
            const apiResp = {
                result: [
                    {id: id1, groupMasterPublicKey: key1},
                    {id: id2, groupMasterPublicKey: key2},
                ],
            };
            // clear the module cache for this test
            for (var member in GroupApiEndpoints.groupPublicKeyCache) delete GroupApiEndpoints.groupPublicKeyCache[member];
            apiSpy.and.returnValue(Future.of(apiResp));
            GroupApiEndpoints.getGroupPublicKeyList([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp.result);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups?id=group-10%2Cgroup-20", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
            GroupApiEndpoints.getGroupPublicKeyList([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp.result);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
        });

        it("the cache is filled as expected.", () => {
            const id1 = "group-10";
            const key1 = "group-10-key";
            const id2 = "group-20";
            const key2 = "group-20-key";
            const apiResp = {
                result: [
                    {id: id1, groupMasterPublicKey: key1},
                    {id: id2, groupMasterPublicKey: key2},
                ],
            };
            // clear the module cache for this test
            for (var member in GroupApiEndpoints.groupPublicKeyCache) delete GroupApiEndpoints.groupPublicKeyCache[member];
            apiSpy.and.returnValue(Future.of(apiResp));
            GroupApiEndpoints.getGroupPublicKeyList([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp.result);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups?id=group-10%2Cgroup-20", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                    expect(GroupApiEndpoints.groupPublicKeyCache).toEqual({[id1]: {groupMasterPublicKey: key1}, [id2]: {groupMasterPublicKey: key2}});
                }
            );
        });

        it("calls with everything to the API if any keys weren't in the cache.", () => {
            const id1 = "group-10";
            const key1 = "group-10-key";
            const id2 = "group-20";
            const key2 = "group-20-key";
            const apiResp = {
                result: [
                    {id: id1, groupMasterPublicKey: key1},
                    {id: id2, groupMasterPublicKey: key2},
                ],
            };
            // clear the module cache for this test
            for (var member in GroupApiEndpoints.groupPublicKeyCache) delete GroupApiEndpoints.groupPublicKeyCache[member];
            apiSpy.and.returnValue(Future.of(apiResp));
            GroupApiEndpoints.getGroupPublicKeyList([id1, id2]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual(apiResp.result);
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups?id=group-10%2Cgroup-20", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
            GroupApiEndpoints.getGroupPublicKeyList([id1, "group-30"]).engage(
                (e) => fail(e),
                (_) => {
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups?id=group-10%2Cgroup-30", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(2);
                }
            );
        });
    });

    describe("callGroupGetApi", () => {
        it("requests group get with specific ID and maps response to data result", () => {
            GroupApiEndpoints.callGroupGetApi("87").engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/87", expect.any(Number), expect.any(Object));
                }
            );
        });
    });

    describe("callGroupCreateApi", () => {
        const groupPublicKey = {
            x: new Uint8Array([98, 105, 133]),
            y: new Uint8Array([110, 98]),
        };
        it("combines all group content into payload and maps response to data result", () => {
            const encryptedPlaintext = TestUtils.getEncryptedSymmetricKey();
            const encryptedAccessKeys = [
                {
                    encryptedPlaintext,
                    id: "ownerUserId",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
            ];
            const transformKeyGrantList = [
                {id: "user1ID", publicKey: TestUtils.getEmptyPublicKeyString(), transformKey: TestUtils.getTransformKey()},
                {id: "user2ID", publicKey: TestUtils.getEmptyPublicKeyString(), transformKey: TestUtils.getTransformKey()},
            ];

            GroupApiEndpoints.callGroupCreateApi("35", groupPublicKey, encryptedAccessKeys, false, transformKeyGrantList, "ownerUserId", "group name").engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        id: "35",
                        name: "group name",
                        owner: "ownerUserId",
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                user: {
                                    userId: "ownerUserId",
                                    userMasterPublicKey: {
                                        x: "firstpublickeyx",
                                        y: "firstpublickeyy",
                                    },
                                },
                                ...encryptedPlaintext,
                            },
                        ],
                        members: [
                            {
                                userId: "user1ID",
                                userMasterPublicKey: {
                                    x: expect.any(String),
                                    y: expect.any(String),
                                },
                                transformKey: {
                                    ephemeralPublicKey: {
                                        x: expect.any(String),
                                        y: expect.any(String),
                                    },
                                    toPublicKey: {
                                        x: expect.any(String),
                                        y: expect.any(String),
                                    },
                                    encryptedTempKey: expect.any(String),
                                    hashedTempKey: expect.any(String),
                                    publicSigningKey: expect.any(String),
                                    signature: expect.any(String),
                                },
                            },
                            {
                                userId: "user2ID",
                                userMasterPublicKey: {
                                    x: expect.any(String),
                                    y: expect.any(String),
                                },
                                transformKey: {
                                    ephemeralPublicKey: {
                                        x: expect.any(String),
                                        y: expect.any(String),
                                    },
                                    toPublicKey: {
                                        x: expect.any(String),
                                        y: expect.any(String),
                                    },
                                    encryptedTempKey: expect.any(String),
                                    hashedTempKey: expect.any(String),
                                    publicSigningKey: expect.any(String),
                                    signature: expect.any(String),
                                },
                            },
                        ],
                        needsRotation: false,
                    });
                }
            );
        });
        it("doesnt send in name value if one is not provided", () => {
            const transformKeyGrant = {id: "userID", publicKey: TestUtils.getEmptyPublicKeyString(), transformKey: TestUtils.getTransformKey()};
            const encryptedPlaintext = TestUtils.getEncryptedSymmetricKey();
            const encryptedAccessKeys = [
                {
                    encryptedPlaintext: TestUtils.getEncryptedSymmetricKey(),
                    id: "ownerUserId",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
            ];

            GroupApiEndpoints.callGroupCreateApi("", groupPublicKey, encryptedAccessKeys, false, [transformKeyGrant], "ownerUserId", "").engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                user: {
                                    userId: "ownerUserId",
                                    userMasterPublicKey: {
                                        x: "firstpublickeyx",
                                        y: "firstpublickeyy",
                                    },
                                },
                                ...encryptedPlaintext,
                            },
                        ],
                        members: [
                            {
                                userId: "userID",
                                userMasterPublicKey: {x: expect.any(String), y: expect.any(String)},
                                transformKey: {
                                    ephemeralPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    toPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    encryptedTempKey: expect.any(String),
                                    hashedTempKey: expect.any(String),
                                    publicSigningKey: expect.any(String),
                                    signature: expect.any(String),
                                },
                            },
                        ],
                        owner: "ownerUserId",
                        needsRotation: false,
                    });
                }
            );
        });
        it("checks contents of transformKeyGrantList, if empty payload should not have member list", () => {
            const encryptedPlaintext = TestUtils.getEncryptedSymmetricKey();
            const encryptedAccessKeys = [
                {
                    encryptedPlaintext: TestUtils.getEncryptedSymmetricKey(),
                    id: "ownerUserId",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
            ];

            GroupApiEndpoints.callGroupCreateApi("", groupPublicKey, encryptedAccessKeys, false, [], "ownerUserId", "group name").engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        name: "group name",
                        owner: "ownerUserId",
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                user: {
                                    userId: "ownerUserId",
                                    userMasterPublicKey: {
                                        x: "firstpublickeyx",
                                        y: "firstpublickeyy",
                                    },
                                },
                                ...encryptedPlaintext,
                            },
                        ],
                        needsRotation: false,
                    });
                }
            );
        });
        it("if an ownerUserId is not provided one is not sent", () => {
            const encryptedPlaintext = TestUtils.getEncryptedSymmetricKey();
            const encryptedAccessKeys = [
                {
                    encryptedPlaintext: encryptedPlaintext,
                    id: "ownerUserId",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
            ];

            GroupApiEndpoints.callGroupCreateApi("", groupPublicKey, encryptedAccessKeys, false, [], "", "group name").engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        name: "group name",
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                user: {
                                    userId: "ownerUserId",
                                    userMasterPublicKey: {
                                        x: "firstpublickeyx",
                                        y: "firstpublickeyy",
                                    },
                                },
                                ...encryptedPlaintext,
                            },
                        ],
                        needsRotation: false,
                    });
                }
            );
        });
    });

    describe("callGroupPrivateKeyUpdateApi", () => {
        it("invokes API with expected parameters", () => {
            const encryptedPlaintext = TestUtils.getEncryptedSymmetricKey();
            const encryptedAccessKeys = [
                {
                    encryptedPlaintext: encryptedPlaintext,
                    id: "ownerUserId",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
            ];
            const augmentationFactor = new Uint8Array([98, 103, 110]);
            GroupApiEndpoints.callGroupPrivateKeyUpdateApi("groupID", encryptedAccessKeys, augmentationFactor, 5).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/groupID/keys/5", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        augmentationFactor: "Ymdu",
                        admins: [
                            {
                                user: {
                                    userId: "ownerUserId",
                                    userMasterPublicKey: {
                                        x: "firstpublickeyx",
                                        y: "firstpublickeyy",
                                    },
                                },
                                ...encryptedPlaintext,
                            },
                        ],
                    });
                }
            );
        });
    });

    describe("callGroupUpdateApi", () => {
        it("invokes API with update parameters when new value provided", () => {
            GroupApiEndpoints.callGroupUpdateApi("23", "new name").engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/23", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        name: "new name",
                    });
                }
            );
        });

        it("invokes API with null to clear group name", () => {
            GroupApiEndpoints.callGroupUpdateApi("&32", null).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/%2632", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        name: null,
                    });
                }
            );
        });
    });

    describe("callAddAdminsApi", () => {
        it("invokes API with expected parameters", () => {
            const groupEncryptedPrivateKey = TestUtils.getEncryptedSymmetricKey();
            const signature = new Uint8Array([98, 103, 110]);
            const userKeys = [
                {
                    encryptedPlaintext: groupEncryptedPrivateKey,
                    id: "33",
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                },
                {
                    encryptedPlaintext: groupEncryptedPrivateKey,
                    id: "93",
                    publicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                },
            ];

            GroupApiEndpoints.callAddAdminsApi("22", userKeys, signature).engage(
                (e) => fail(e),
                (addResult: any) => {
                    expect(addResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/22/admins", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        admins: [
                            {
                                user: {
                                    userId: "33",
                                    userMasterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                },
                                ...groupEncryptedPrivateKey,
                            },
                            {
                                user: {
                                    userId: "93",
                                    userMasterPublicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                                },
                                ...groupEncryptedPrivateKey,
                            },
                        ],
                        signature: "Ymdu",
                    });
                }
            );
        });
    });

    describe("callRemoveAdminsApi", () => {
        it("invokes API with expected parameters", () => {
            const userIDs = ["31", "89", "76", "33"];

            GroupApiEndpoints.callRemoveAdminsApi("22", userIDs).engage(
                (e) => fail(e.message),
                (removeResult: any) => {
                    expect(removeResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/22/admins", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        users: [{userId: "31"}, {userId: "89"}, {userId: "76"}, {userId: "33"}],
                    });
                }
            );
        });
    });

    describe("callAddMembersApi", () => {
        it("maps user keys to API call", () => {
            const userKeys = [
                {
                    publicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                    transformKey: TestUtils.getTransformKey(),
                    id: "37",
                },
                {
                    publicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                    transformKey: TestUtils.getTransformKey(),
                    id: "99",
                },
            ];
            const signature = new Uint8Array([98, 103, 110]);

            GroupApiEndpoints.callAddMembersApi("31", userKeys, signature).engage(
                (e) => fail(e),
                (addResult: any) => {
                    expect(addResult).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/31/users", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        users: [
                            {
                                userId: "37",
                                userMasterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                transformKey: {
                                    ephemeralPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    toPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    encryptedTempKey: expect.any(String),
                                    hashedTempKey: expect.any(String),
                                    publicSigningKey: expect.any(String),
                                    signature: expect.any(String),
                                },
                            },
                            {
                                userId: "99",
                                userMasterPublicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                                transformKey: {
                                    ephemeralPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    toPublicKey: {x: expect.any(String), y: expect.any(String)},
                                    encryptedTempKey: expect.any(String),
                                    hashedTempKey: expect.any(String),
                                    publicSigningKey: expect.any(String),
                                    signature: expect.any(String),
                                },
                            },
                        ],
                        signature: "Ymdu",
                    });
                }
            );
        });

        describe("callRemoveMembersApi", () => {
            it("passes in list of IDs to API", () => {
                GroupApiEndpoints.callRemoveMembersApi("31", ["3513", "36236"]).engage(
                    (e) => fail(e),
                    (removeResult: any) => {
                        expect(removeResult).toEqual({foo: "bar"});
                        expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/31/users", expect.any(Number), expect.any(Object));
                        const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];

                        expect(JSON.parse(request.body)).toEqual({
                            users: [{userId: "3513"}, {userId: "36236"}],
                        });
                    }
                );
            });
        });

        describe("callGroupDeleteApi", () => {
            it("requests expected endpoint", () => {
                GroupApiEndpoints.callGroupDeleteApi("31&32").engage(
                    (e) => fail(e),
                    (deleteResult: any) => {
                        expect(deleteResult).toEqual({foo: "bar"});
                        expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("groups/31%2632", expect.any(Number), expect.any(Object));
                        const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                        expect(request.body).toBeUndefined();
                    }
                );
            });
        });
    });
});

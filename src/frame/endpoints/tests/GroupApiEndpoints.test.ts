import GroupApiEndpoints from "../GroupApiEndpoints";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import Future from "futurejs";
import ApiState from "../../ApiState";

describe("GroupApiEndpoints", () => {
    beforeEach(() => {
        spyOn(ApiRequest, "fetchJSON").and.returnValue(
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
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                }
            );
        });
    });

    describe("callGroupKeyListApi", () => {
        it("requests group list endpoint and maps response to data result", () => {
            GroupApiEndpoints.callGroupKeyListApi(["group-10", "group-20"]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith(
                        "groups?id=group-10,group-20",
                        jasmine.any(Number),
                        jasmine.any(Object),
                        jasmine.any(Future)
                    );
                }
            );
        });

        it("escapes IDs that are passed in", () => {
            GroupApiEndpoints.callGroupKeyListApi(["~`!@#$%^&*()-_=+[{]};:<.>/?", "&<>"]).engage(
                (e) => fail(e),
                (groups: any) => {
                    expect(groups).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith(
                        "groups?id=~%60!%40%23%24%25%5E%26*()-_%3D%2B%5B%7B%5D%7D%3B%3A%3C.%3E%2F%3F,%26%3C%3E",
                        jasmine.any(Number),
                        jasmine.any(Object),
                        jasmine.any(Future)
                    );
                }
            );
        });

        it("returns empty array if no group IDs provided", () => {
            GroupApiEndpoints.callGroupKeyListApi([]).engage(
                (e) => fail(e),
                (groups) => {
                    expect(groups).toEqual({result: []});
                    expect(ApiRequest.fetchJSON).not.toHaveBeenCalled();
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
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/87", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                }
            );
        });
    });

    describe("callGroupCreateApi", () => {
        it("combines all group content into payload and maps response to data result", () => {
            const groupPublicKey = {
                x: new Uint8Array([98, 105, 133]),
                y: new Uint8Array([110, 98]),
            };
            const groupEncryptedPrivateKey = TestUtils.getEncryptedSymmetricKey();

            const transformKey = TestUtils.getTransformKey();

            GroupApiEndpoints.callGroupCreateApi("35", groupPublicKey, groupEncryptedPrivateKey, "group name", transformKey).engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        id: "35",
                        name: "group name",
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                ...groupEncryptedPrivateKey,
                                user: {
                                    userId: "user-10",
                                    userMasterPublicKey: {
                                        x: "upkx",
                                        y: "upky",
                                    },
                                },
                            },
                        ],
                        members: [
                            {
                                userId: "user-10",
                                userMasterPublicKey: {
                                    x: "upkx",
                                    y: "upky",
                                },
                                transformKey: {
                                    ephemeralPublicKey: {
                                        x: jasmine.any(String),
                                        y: jasmine.any(String),
                                    },
                                    toPublicKey: {
                                        x: jasmine.any(String),
                                        y: jasmine.any(String),
                                    },
                                    encryptedTempKey: jasmine.any(String),
                                    hashedTempKey: jasmine.any(String),
                                    publicSigningKey: jasmine.any(String),
                                    signature: jasmine.any(String),
                                },
                            },
                        ],
                    });
                }
            );
        });

        it("doesnt send in name value if one is not provided", () => {
            const groupPublicKey = {
                x: new Uint8Array([98, 105, 133]),
                y: new Uint8Array([110, 98]),
            };
            const groupEncryptedPrivateKey = TestUtils.getEncryptedSymmetricKey();
            const transformKey = TestUtils.getTransformKey();

            GroupApiEndpoints.callGroupCreateApi("", groupPublicKey, groupEncryptedPrivateKey, "", transformKey).engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                ...groupEncryptedPrivateKey,
                                user: {
                                    userId: "user-10",
                                    userMasterPublicKey: {x: "upkx", y: "upky"},
                                },
                            },
                        ],
                        members: [
                            {
                                userId: "user-10",
                                userMasterPublicKey: {x: "upkx", y: "upky"},
                                transformKey: {
                                    ephemeralPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    toPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    encryptedTempKey: jasmine.any(String),
                                    hashedTempKey: jasmine.any(String),
                                    publicSigningKey: jasmine.any(String),
                                    signature: jasmine.any(String),
                                },
                            },
                        ],
                    });
                }
            );
        });

        it("checks contents of transformKey, if undefined payload should not have transformKey key or member list", () => {
            const groupPublicKey = {
                x: new Uint8Array([98, 105, 133]),
                y: new Uint8Array([110, 98]),
            };
            const groupEncryptedPrivateKey: any = {
                encryptedMessage: "abc",
                authorizationCode: "auth",
                ephemeralPublicKey: "epub",
            };

            const transformKey = undefined;

            GroupApiEndpoints.callGroupCreateApi("", groupPublicKey, groupEncryptedPrivateKey, "group name", transformKey).engage(
                (e) => fail(e),
                (group: any) => {
                    expect(group).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        name: "group name",
                        groupPublicKey: {
                            x: "YmmF",
                            y: "bmI=",
                        },
                        admins: [
                            {
                                encryptedMessage: "abc",
                                authorizationCode: "auth",
                                ephemeralPublicKey: "epub",
                                user: {
                                    userId: "user-10",
                                    userMasterPublicKey: {
                                        x: "upkx",
                                        y: "upky",
                                    },
                                },
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
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/23", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
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
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/%2632", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

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

            GroupApiEndpoints.callAddAdminsApi("22", userKeys).engage(
                (e) => fail(e),
                (addResult: any) => {
                    expect(addResult).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/22/admins", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

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
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/22/admins", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

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

            GroupApiEndpoints.callAddMembersApi("31", userKeys).engage(
                (e) => fail(e),
                (addResult: any) => {
                    expect(addResult).toEqual({foo: "bar"});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/31/users", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

                    expect(JSON.parse(request.body)).toEqual({
                        users: [
                            {
                                userId: "37",
                                userMasterPublicKey: {x: "firstpublickeyx", y: "firstpublickeyy"},
                                transformKey: {
                                    ephemeralPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    toPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    encryptedTempKey: jasmine.any(String),
                                    hashedTempKey: jasmine.any(String),
                                    publicSigningKey: jasmine.any(String),
                                    signature: jasmine.any(String),
                                },
                            },
                            {
                                userId: "99",
                                userMasterPublicKey: {x: "secondpublickey", y: "secondpublickeyy"},
                                transformKey: {
                                    ephemeralPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    toPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                                    encryptedTempKey: jasmine.any(String),
                                    hashedTempKey: jasmine.any(String),
                                    publicSigningKey: jasmine.any(String),
                                    signature: jasmine.any(String),
                                },
                            },
                        ],
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
                        expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/31/users", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                        const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];

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
                        expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("groups/31%2632", jasmine.any(Number), jasmine.any(Object), jasmine.any(Future));
                        const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                        expect(request.body).toBeUndefined();
                    }
                );
            });
        });
    });
});

import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import ApiState from "../../ApiState";
import UserApiEndpoints from "../UserApiEndpoints";

describe("UserApiEndpoints", () => {
    beforeEach(() => {
        jest.spyOn(ApiRequest, "makeAuthorizedApiRequest");
        jest.spyOn(ApiRequest, "makeJwtApiRequest");
    });

    describe("callUserVerifyApi", () => {
        let mapSpy: jest.SpyInstance;
        beforeEach(() => {
            mapSpy = jest.fn();
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue({
                map: mapSpy,
            });
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue({
                map: mapSpy,
            });
        });

        it("calls API with expected results", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");
            expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users/verify?returnKeys=true", expect.any(Number), {method: "GET"}, "jwtToken");
        });

        it("returns expected result with user exist flag set to false when not a 200", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");

            expect(mapSpy).toHaveBeenCalledWith(expect.any(Function));
            const mapper = mapSpy.mock.calls[0][0];
            expect(mapper(undefined)).toEqual({
                user: undefined,
                jwt: "jwtToken",
            });
        });

        it("returns expected result with user exist flag set to true when 200 response", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");

            expect(mapSpy).toHaveBeenCalledWith(expect.any(Function));
            const mapper = mapSpy.mock.calls[0][0];
            expect(mapper({foo: "bar"})).toEqual({
                user: {foo: "bar"},
                jwt: "jwtToken",
            });
        });
    });

    describe("callUserCreateApi", () => {
        it("creates user with keys and returns saved user object", () => {
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            UserApiEndpoints.callUserCreateApi(
                "jwtToken",
                {
                    ...TestUtils.getEmptyKeyPair(),
                    encryptedPrivateKey: new Uint8Array(10),
                },
                true
            ).engage(
                (e) => {
                    throw e;
                },
                (user: any) => {
                    expect(user).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });

                    expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users", expect.any(Number), expect.any(Object), "jwtToken");
                    const request = (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPublicKey: {x: expect.any(String), y: expect.any(String)},
                        userPrivateKey: "AAAAAAAAAAAAAA==",
                        needsRotation: true,
                    });
                }
            );
        });
    });

    describe("callUserCreateApiWithDevice", () => {
        it("creates user with full key set and returns saved user object", () => {
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            UserApiEndpoints.callUserCreateApiWithDevice("jwtToken", {
                userKeys: {
                    ...TestUtils.getEmptyKeyPair(),
                    encryptedPrivateKey: new Uint8Array(10),
                },
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: TestUtils.getSigningKeyPair(),
                transformKey: TestUtils.getTransformKey(),
            }).engage(
                (e) => {
                    throw e;
                },
                (user: any) => {
                    expect(user).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });

                    expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users", expect.any(Number), expect.any(Object), "jwtToken");
                    const request = (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPublicKey: {x: expect.any(String), y: expect.any(String)},
                        userPrivateKey: "AAAAAAAAAAAAAA==",
                        devices: [
                            {
                                publicKey: {x: expect.any(String), y: expect.any(String)},
                                signingKey: expect.any(String),
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
                    });
                }
            );
        });

        it("creates user with partial key set and returns saved user object", () => {
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            UserApiEndpoints.callUserCreateApiWithDevice("jwtToken", {
                userKeys: {
                    ...TestUtils.getEmptyKeyPair(),
                    encryptedPrivateKey: new Uint8Array(12),
                },
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: TestUtils.getSigningKeyPair(),
                transformKey: TestUtils.getTransformKey(),
            }).engage(
                (e) => {
                    throw e;
                },
                (user: any) => {
                    expect(user).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });

                    expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users", expect.any(Number), expect.any(Object), "jwtToken");
                    const request = (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPublicKey: {x: expect.any(String), y: expect.any(String)},
                        userPrivateKey: "AAAAAAAAAAAAAAAA",
                        devices: [
                            {
                                publicKey: {x: expect.any(String), y: expect.any(String)},
                                signingKey: expect.any(String),
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
                    });
                }
            );
        });
    });

    describe("callUserKeyUpdateApi", () => {
        it("calls Api with rotated private key and augmentation factor when private key rotation is requested", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyUpdateApi(new Uint8Array([99, 104, 111]), new Uint8Array([98, 103, 110])).engage(
                (e) => {
                    throw new Error(e.message);
                },
                (userKeys: any) => {
                    expect(userKeys).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users/user-10/keys/1", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPrivateKey: "Y2hv",
                        augmentationFactor: "Ymdu",
                    });
                }
            );
        });
    });

    describe("callUserUpdateApi", () => {
        it("calls API and updates status when requested", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(undefined, 2).engage(
                (e) => {
                    throw new Error(e.message);
                },
                (userKeys: any) => {
                    expect(userKeys).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users/user-10", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        status: 2,
                    });
                }
            );
        });

        it("calls API and updates users escrowed private key when requested", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser({...TestUtils.getFullUser(), id: "user-special~!@#$"});
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(new Uint8Array([98, 103, 110])).engage(
                (e) => {
                    throw new Error(e.message);
                },
                () => {
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users/user-special~!%40%23%24", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPrivateKey: "Ymdu",
                    });
                }
            );
        });

        it("updates both status and escrowed private key", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(new Uint8Array([98, 103, 110]), 3).engage(
                (e) => {
                    throw new Error(e.message);
                },
                () => {
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users/user-10", expect.any(Number), expect.any(Object));
                    const request = (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPrivateKey: "Ymdu",
                        status: 3,
                    });
                }
            );
        });
    });

    describe("callUserDeviceAdd", () => {
        it("calls API and returns data as expected", () => {
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    devicePublicKey: {x: "", y: ""},
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());

            UserApiEndpoints.callUserDeviceAdd(
                "jwt",
                TestUtils.getEmptyPublicKey(),
                TestUtils.getTransformKey(),
                new Uint8Array([99, 103, 113, 93]),
                133353523
            ).engage(
                (e) => {
                    throw e;
                },
                (userKeys: any) => {
                    expect(userKeys).toEqual({
                        devicePublicKey: {x: "", y: ""},
                    });

                    expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users/devices", expect.any(Number), expect.any(Object), "jwt");
                    const request = (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mock.calls[0][2];
                    expect(JSON.parse(request.body)).toEqual({
                        timestamp: 133353523,
                        userPublicKey: {x: expect.any(String), y: expect.any(String)},
                        device: {
                            transformKey: {
                                ephemeralPublicKey: {x: expect.any(String), y: expect.any(String)},
                                toPublicKey: {x: expect.any(String), y: expect.any(String)},
                                encryptedTempKey: expect.any(String),
                                hashedTempKey: expect.any(String),
                                publicSigningKey: expect.any(String),
                                signature: expect.any(String),
                            },
                        },
                        signature: "Y2dxXQ==",
                    });
                }
            );
        });
    });

    describe("callUserCurrentDeviceDelete", () => {
        it("calls API to delete device for current user", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(Future.of<any>({id: 353}));
            ApiState.setCurrentUser({...TestUtils.getFullUser(), id: "user-special~!@#$"});
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserCurrentDeviceDelete().engage(
                (e) => {
                    throw e;
                },
                (deleteResult: any) => {
                    expect(deleteResult).toEqual({id: 353});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "users/user-special~!%40%23%24/devices/current",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });
    });

    describe("callUserDeviceDeleteBySigningKeyWithJwt", () => {
        it("calls API and returns data as expected", () => {
            (ApiRequest.makeJwtApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    id: 7,
                })
            );

            UserApiEndpoints.callUserDeviceDeleteBySigningKeyWithJwt("jwt", "signingKey" as unknown as Base64String).engage(
                (e) => {
                    throw e;
                },
                (deletedId: any) => {
                    expect(deletedId).toEqual({id: 7});
                    expect(ApiRequest.makeJwtApiRequest).toHaveBeenCalledWith("users/devices/signingKey", expect.any(Number), expect.any(Object), "jwt");
                }
            );
        });
    });

    describe("callUserKeyListApi", () => {
        it("calls API and returns mapped response data", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    result: [
                        {id: "user-10", userMasterPublicKey: {x: ""}},
                        {id: "user-20", userMasterPublicKey: {x: ""}},
                    ],
                })
            );
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyListApi(["user-10", "user-20"]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual({
                        result: [
                            {id: "user-10", userMasterPublicKey: {x: ""}},
                            {id: "user-20", userMasterPublicKey: {x: ""}},
                        ],
                    });

                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users?id=user-10%2Cuser-20", expect.any(Number), expect.any(Object));
                }
            );
        });

        it("caches the response in memory.", () => {
            const id1 = "user-10";
            const id2 = "user-20";
            const resp = {
                result: [
                    {id: id1, userMasterPublicKey: {x: ""}},
                    {id: id2, userMasterPublicKey: {x: ""}},
                ],
            };
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(Future.of<any>(resp));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            // clear the module cache for this test
            for (var member in UserApiEndpoints.userPublicKeyCache) delete UserApiEndpoints.userPublicKeyCache[member];
            expect(UserApiEndpoints.userPublicKeyCache).toEqual({});
            UserApiEndpoints.callUserKeyListApi([id1, id2]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual(resp);

                    expect(UserApiEndpoints.userPublicKeyCache).toEqual({
                        [id1]: {userMasterPublicKey: resp.result[0].userMasterPublicKey},
                        [id2]: {userMasterPublicKey: resp.result[1].userMasterPublicKey},
                    });
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users?id=user-10%2Cuser-20", expect.any(Number), expect.any(Object));
                }
            );
        });

        it("cached values prevent extra calls to the API.", () => {
            const id1 = "user-10";
            const id2 = "user-20";
            const resp = {
                result: [
                    {id: id1, userMasterPublicKey: {x: ""}},
                    {id: id2, userMasterPublicKey: {x: ""}},
                ],
            };
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(Future.of<any>(resp));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            // clear the module cache for this test
            for (var member in UserApiEndpoints.userPublicKeyCache) delete UserApiEndpoints.userPublicKeyCache[member];
            UserApiEndpoints.callUserKeyListApi([id1, id2]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual(resp);

                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users?id=user-10%2Cuser-20", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
            UserApiEndpoints.callUserKeyListApi([id1, id2]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual(resp);

                    // make sure it wasn't actually called a second time
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
        });

        it("any non cached values result in extra calls to the API.", () => {
            const id1 = "user-10";
            const id2 = "user-20";
            const resp = {
                result: [
                    {id: id1, userMasterPublicKey: {x: ""}},
                    {id: id2, userMasterPublicKey: {x: ""}},
                ],
            };
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(Future.of<any>(resp));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            // clear the module cache for this test
            for (var member in UserApiEndpoints.userPublicKeyCache) delete UserApiEndpoints.userPublicKeyCache[member];
            UserApiEndpoints.callUserKeyListApi([id1, id2]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual(resp);

                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("users?id=user-10%2Cuser-20", expect.any(Number), expect.any(Object));
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(1);
                }
            );
            UserApiEndpoints.callUserKeyListApi([id1, "user-30"]).engage(
                (e) => {
                    throw e;
                },
                (_) => {
                    // make sure it was actually called a second time
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledTimes(2);
                }
            );
        });

        it("escapes all user IDs", () => {
            (ApiRequest.makeAuthorizedApiRequest as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    result: [
                        {id: "user-10", userMasterPublicKey: {x: ""}},
                        {id: "user-20", userMasterPublicKey: {x: ""}},
                    ],
                })
            );
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyListApi(["~`!@#$%^&*()-_=+[{]};:<.>/?", "user-20"]).engage(
                (e) => {
                    throw e;
                },
                (userList: any) => {
                    expect(userList).toEqual({
                        result: [
                            {id: "user-10", userMasterPublicKey: {x: ""}},
                            {id: "user-20", userMasterPublicKey: {x: ""}},
                        ],
                    });

                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "users?id=~%60!%40%23%24%25%5E%26*()-_%3D%2B%5B%7B%5D%7D%3B%3A%3C.%3E%2F%3F%2Cuser-20",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });

        it("returns empty result when no keys provided", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyListApi([]).engage(
                (e) => {
                    throw e;
                },
                (result) => {
                    expect(result).toEqual({result: []});
                    expect(ApiRequest.makeAuthorizedApiRequest).not.toHaveBeenCalled();
                }
            );
        });
    });
});

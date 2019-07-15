import UserApiEndpoints from "../UserApiEndpoints";
import * as ApiRequest from "../../ApiRequest";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import ApiState from "../../ApiState";

describe("UserApiEndpoints", () => {
    beforeEach(() => {
        spyOn(ApiRequest, "fetchJSON");
    });

    describe("callUserVerifyApi", () => {
        let mapSpy: jasmine.Spy;
        beforeEach(() => {
            mapSpy = jasmine.createSpy("fetchJSON Map");
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue({
                map: mapSpy,
            });
        });

        it("calls fetchJSON with expected results", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");
            expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users/verify?returnKeys=true", expect.any(Number), {}, expect.any(Future));
            const authHeader = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[3];
            authHeader.engage(
                (e: Error) => fail(e),
                (auth: string) => {
                    expect(auth).toEqual("jwt jwtToken");
                }
            );
        });

        it("returns expected result with user exist flag set to false when not a 200", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");

            expect(mapSpy).toHaveBeenCalledWith(expect.any(Function));
            const mapper = mapSpy.calls.argsFor(0)[0];
            expect(mapper(undefined)).toEqual({
                user: undefined,
                jwt: "jwtToken",
            });
        });

        it("returns expected result with user exist flag set to true when 200 response", () => {
            UserApiEndpoints.callUserVerifyApi("jwtToken");

            expect(mapSpy).toHaveBeenCalledWith(expect.any(Function));
            const mapper = mapSpy.calls.argsFor(0)[0];
            expect(mapper({foo: "bar"})).toEqual({
                user: {foo: "bar"},
                jwt: "jwtToken",
            });
        });
    });

    describe("callUserCreateApi", () => {
        it("creates user with full key set and returns saved user object", () => {
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    id: "user-10",
                    foo: "bar",
                })
            );

            UserApiEndpoints.callUserCreateApi("jwtToken", {
                userKeys: {
                    ...TestUtils.getEmptyKeyPair(),
                    encryptedPrivateKey: new Uint8Array(10),
                },
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: TestUtils.getSigningKeyPair(),
                transformKey: TestUtils.getTransformKey(),
            }).engage(
                () => fail("reject shouldnt be called with valid user object"),
                (user: any) => {
                    expect(user).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });

                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                    const authHeader = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[3];
                    authHeader.engage((e: Error) => fail(e.message), (header: string) => expect(header).toEqual("jwt jwtToken"));
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
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    id: "user-10",
                    foo: "bar",
                })
            );

            UserApiEndpoints.callUserCreateApi("jwtToken", {
                userKeys: {
                    ...TestUtils.getEmptyKeyPair(),
                    encryptedPrivateKey: new Uint8Array(12),
                },
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: TestUtils.getSigningKeyPair(),
                transformKey: TestUtils.getTransformKey(),
            }).engage(
                () => fail("reject shouldnt be called with valid user object"),
                (user: any) => {
                    expect(user).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });

                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                    const authHeader = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[3];
                    authHeader.engage((e: Error) => fail(e.message), (header: string) => expect(header).toEqual("jwt jwtToken"));
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

    describe("callUserUpdateApi", () => {
        it("calls API and updates status when requested", () => {
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(undefined, 2).engage(
                (e) => fail(e.message),
                (userKeys: any) => {
                    expect(userKeys).toEqual({
                        id: "user-10",
                        foo: "bar",
                    });
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users/user-10", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        status: 2,
                    });
                }
            );
        });

        it("calls API and updates users escrowed private key when requested", () => {
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(new Uint8Array([98, 103, 110])).engage(
                (e) => fail(e.message),
                () => {
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users/user-10", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                    expect(JSON.parse(request.body)).toEqual({
                        userPrivateKey: "Ymdu",
                    });
                }
            );
        });

        it("updates both status and escrowed private key", () => {
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    id: "user-10",
                    foo: "bar",
                })
            );

            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserUpdateApi(new Uint8Array([98, 103, 110]), 3).engage(
                (e) => fail(e.message),
                () => {
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users/user-10", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
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
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
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
                (e) => fail(e),
                (userKeys: any) => {
                    expect(userKeys).toEqual({
                        devicePublicKey: {x: "", y: ""},
                    });

                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users/devices", expect.any(Number), expect.any(Object), expect.any(Future));
                    const request = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[2];
                    const authHeader = (ApiRequest.fetchJSON as jasmine.Spy).calls.argsFor(0)[3];
                    authHeader.engage((e: Error) => fail(e.message), (header: string) => expect(header).toEqual("jwt jwt"));
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
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(Future.of({id: 353}));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserCurrentDeviceDelete().engage(
                () => fail("reject should not be called when request returns successfully"),
                (deleteResult: any) => {
                    expect(deleteResult).toEqual({id: 353});
                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith(
                        "users/user-10/devices/current",
                        expect.any(Number),
                        expect.any(Object),
                        expect.any(Future)
                    );
                }
            );
        });
    });

    describe("callUserKeyListApi", () => {
        it("calls API and returns mapped response data", () => {
            (ApiRequest.fetchJSON as jasmine.Spy).and.returnValue(
                Future.of({
                    result: [{id: "user-10", userMasterPublicKey: {x: ""}}, {id: "user-20", userMasterPublicKey: {x: ""}}],
                })
            );
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyListApi(["user-10", "user-20"]).engage(
                () => fail("reject should not be called when request returns user list"),
                (userList: any) => {
                    expect(userList).toEqual({
                        result: [{id: "user-10", userMasterPublicKey: {x: ""}}, {id: "user-20", userMasterPublicKey: {x: ""}}],
                    });

                    expect(ApiRequest.fetchJSON).toHaveBeenCalledWith("users?id=user-10,user-20", expect.any(Number), expect.any(Object), expect.any(Future));
                }
            );
        });

        it("returns empty result when no keys provided", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());

            UserApiEndpoints.callUserKeyListApi([]).engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual({result: []});
                    expect(ApiRequest.fetchJSON).not.toHaveBeenCalled();
                }
            );
        });
    });
});

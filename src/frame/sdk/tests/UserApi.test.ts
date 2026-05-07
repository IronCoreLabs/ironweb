import * as UserApi from "../UserApi";
import * as WorkerMediator from "../../WorkerMediator";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import Future from "futurejs";
import ApiState from "../../ApiState";
import * as TestUtils from "../../../tests/TestUtils";

describe("UserApi", () => {
    describe("deleteDevice", () => {
        it("calls API and clears items from expected key", async () => {
            jest.spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").mockReturnValue(Future.of<any>({id: 33}));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            const result = await UserApi.deleteDevice();

            expect(UserApiEndpoints.callUserCurrentDeviceDelete).toHaveBeenCalledWith();
            expect(result).toBe(33);
            expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
            expect(ApiState.user()).toBeUndefined();
        });

        it("clears items from local storage even if request fails", async () => {
            jest.spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").mockReturnValue(Future.reject<any>("device delete"));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            const result = await UserApi.deleteDevice();

            expect(result).toBe(-1);
            expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
            expect(ApiState.user()).toBeUndefined();
        });

        it("calls API but doesn't clear storage if passed an ID.", async () => {
            jest.spyOn(UserApiEndpoints, "callUserDeviceDelete").mockReturnValue(Future.of<any>({id: 33}));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            const result = await UserApi.deleteDevice(33);

            expect(result).toBe(33);
            expect(localStorage.removeItem).not.toHaveBeenCalled();
            expect(ApiState.user()).toBeDefined();
        });
    });

    describe("rotateUserMasterKey", () => {
        it("sends message to worker and takes result and passes it to call user key update endpoint", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            jest.spyOn(UserApiEndpoints, "callUserKeyUpdateApi").mockReturnValue(Future.of<any>("user key update result"));
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {newEncryptedPrivateUserKey: "newEncryptedPrivateUserKey", augmentationFactor: "augmentationFactor"},
                })
            );
            jest.spyOn(ApiState, "setEncryptedPrivateUserKey");

            UserApi.rotateUserMasterKey("current").engage(
                (e) => done(e),
                (result: any) => {
                    expect(result).toEqual("user key update result");
                    expect(ApiState.setEncryptedPrivateUserKey).toHaveBeenCalledWith("newEncryptedPrivateUserKey");
                    expect(UserApiEndpoints.callUserKeyUpdateApi).toHaveBeenCalledWith("newEncryptedPrivateUserKey", "augmentationFactor");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "ROTATE_USER_PRIVATE_KEY",
                        message: {
                            passcode: "current",
                            encryptedPrivateUserKey: new Uint8Array([]),
                        },
                    });
                    done();
                }
            );
        });
    });

    describe("changeUsersPasscode", () => {
        it("sends message to worker and takes result and passes it to call user update endpoint", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
            jest.spyOn(UserApiEndpoints, "callUserUpdateApi").mockReturnValue(Future.of<any>("user update result"));
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {encryptedPrivateUserKey: "encrypted private user key"},
                })
            );
            jest.spyOn(ApiState, "setEncryptedPrivateUserKey");

            UserApi.changeUsersPasscode("current", "new").engage(
                (e) => done(e),
                (result: any) => {
                    expect(result).toEqual("user update result");
                    expect(UserApiEndpoints.callUserUpdateApi).toHaveBeenCalledWith("encrypted private user key");
                    expect(ApiState.setEncryptedPrivateUserKey).toHaveBeenCalledWith("encrypted private user key");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "CHANGE_USER_PASSCODE",
                        message: {
                            currentPasscode: "current",
                            newPasscode: "new",
                            encryptedPrivateUserKey: new Uint8Array([]),
                        },
                    });
                    done();
                }
            );
        });
    });

    describe("listDevices", () => {
        it("calls API and returns the expected response shape", () => {
            const iclResponse = {
                result: [
                    {
                        name: null,
                        id: 613,
                        updated: "2022-09-09T19:15:12.374Z",
                        publicSigningKey: "KoZEmt+JX6Ml4mTRNQmhl47xqFfyer6K8uJJoXFx+Zs=",
                        isCurrentDevice: true,
                        created: "2022-09-09T19:15:12.374Z",
                    },
                ],
            };
            jest.spyOn(UserApiEndpoints, "callUserListDevices").mockReturnValue(Future.of<any>(iclResponse));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            UserApi.listDevices().engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result) => {
                    expect(UserApiEndpoints.callUserListDevices).toHaveBeenCalledWith();
                    expect(result).toBe(iclResponse);
                }
            );
        });
    });

    describe("disableSelf", () => {
        it("calls callUserUpdateApi with status=0 (disabled)", () => {
            jest.spyOn(UserApiEndpoints, "callUserUpdateApi").mockReturnValue(Future.of<any>({id: "user-10"}));
            UserApi.disableSelf().engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result: any) => {
                    expect(result).toEqual({id: "user-10"});
                    expect(UserApiEndpoints.callUserUpdateApi).toHaveBeenCalledWith(undefined, 0);
                }
            );
        });
    });

    describe("userIdFromJwt", () => {
        // Build a base64url payload from arbitrary JSON. Mirrors what a real JWT issuer produces.
        const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
        const makeJwt = (claims: unknown) => `header.${b64url(JSON.stringify(claims))}.sig`;

        const expectOk = (jwt: string, expected: string) => {
            UserApi.userIdFromJwt(jwt).engage(
                (e) => {
                    throw new Error(`expected success, got error: ${e.message}`);
                },
                (sub) => expect(sub).toEqual(expected)
            );
        };
        const expectReject = (jwt: string, done: jest.DoneCallback) => {
            UserApi.userIdFromJwt(jwt).engage(
                (e) => {
                    expect(e.code).toBe(100); // JWT_FORMAT_FAILURE
                    done();
                },
                (sub) => done(new Error(`expected rejection, got sub: ${sub}`))
            );
        };

        it("extracts a simple ASCII sub claim", () => {
            expectOk(makeJwt({sub: "user-10"}), "user-10");
        });

        it("ignores other claims and returns just sub", () => {
            expectOk(makeJwt({iss: "issuer", aud: "aud", sub: "user-10", exp: 1700000000}), "user-10");
        });

        it("supports a sub containing characters that base64url encodes with - and _", () => {
            // Constructing a JSON payload whose base64 encoding contains both '+' and '/' so it
            // exercises the base64url -> base64 conversion. The string `???>>>` does that.
            expectOk(makeJwt({sub: "???>>>"}), "???>>>");
        });

        it("supports UTF-8 sub claims (multi-byte)", () => {
            expectOk(makeJwt({sub: "用户-10"}), "用户-10");
            expectOk(makeJwt({sub: "user-😀"}), "user-😀");
        });

        it("handles payloads requiring 0, 1, or 2 base64 padding chars", () => {
            // Lengths chosen so the base64 of `{"sub":"X..."}` falls into each padding bucket.
            expectOk(makeJwt({sub: "a"}), "a"); // payload bytes mod 3 = 2 → 1 padding
            expectOk(makeJwt({sub: "ab"}), "ab"); // payload bytes mod 3 = 0 → 0 padding
            expectOk(makeJwt({sub: "abc"}), "abc"); // payload bytes mod 3 = 1 → 2 padding
        });

        it("rejects a JWT with no dots", (done) => {
            expectReject("notavalidjwt", done);
        });

        it("rejects a JWT with only a header section", (done) => {
            expectReject("header.", done);
        });

        it("rejects a JWT whose payload section is empty", (done) => {
            expectReject("header..sig", done);
        });

        it("rejects a JWT whose payload is not valid base64", (done) => {
            expectReject("header.!!!not-base64!!!.sig", done);
        });

        it("rejects a JWT whose payload base64 decodes to invalid JSON", (done) => {
            expectReject(`header.${b64url("not json")}.sig`, done);
        });

        it("rejects a JWT whose payload is JSON but not an object", (done) => {
            // `JSON.parse("123")` returns a number; reading .sub off it returns undefined.
            expectReject(`header.${b64url("123")}.sig`, done);
        });

        it("rejects a JWT with no sub claim", (done) => {
            expectReject(makeJwt({foo: "bar"}), done);
        });

        it("rejects a JWT whose sub claim is an empty string", (done) => {
            expectReject(makeJwt({sub: ""}), done);
        });

        it("rejects a JWT whose sub claim is not a string", (done) => {
            expectReject(makeJwt({sub: 42}), done);
        });

        it("rejects a JWT whose sub claim is null", (done) => {
            expectReject(makeJwt({sub: null}), done);
        });

        it("rejects a JWT whose sub claim is an object", (done) => {
            expectReject(makeJwt({sub: {nested: "x"}}), done);
        });

        it("rejects an empty string", (done) => {
            expectReject("", done);
        });
    });

    describe("updateUserStatusWithJwt", () => {
        // Header and signature can be anything; payload is base64url(`{"sub":"some-user-id"}`).
        const jwt = "header.eyJzdWIiOiJzb21lLXVzZXItaWQifQ.sig";

        it("decodes the user id from the JWT sub claim and calls the endpoint", () => {
            jest.spyOn(UserApiEndpoints, "callUserUpdateStatusWithJwt").mockReturnValue(Future.of<any>({id: "some-user-id"}));
            UserApi.updateUserStatusWithJwt(jwt, 0).engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result: any) => {
                    expect(result).toEqual({id: "some-user-id"});
                    expect(UserApiEndpoints.callUserUpdateStatusWithJwt).toHaveBeenCalledWith(jwt, "some-user-id", 0);
                }
            );
        });

        it("rejects when JWT is malformed without calling the endpoint", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserUpdateStatusWithJwt");
            UserApi.updateUserStatusWithJwt("notavalidjwt", 1).engage(
                (e) => {
                    expect(e.code).toBe(100); // JWT_FORMAT_FAILURE
                    expect(UserApiEndpoints.callUserUpdateStatusWithJwt).not.toHaveBeenCalled();
                    done();
                },
                () => done(new Error("expected to fail"))
            );
        });

        it("rejects when JWT has no sub claim without calling the endpoint", (done) => {
            // payload is base64url(`{"foo":"bar"}`)
            const noSub = "header.eyJmb28iOiJiYXIifQ.sig";
            jest.spyOn(UserApiEndpoints, "callUserUpdateStatusWithJwt");
            UserApi.updateUserStatusWithJwt(noSub, 1).engage(
                (e) => {
                    expect(e.code).toBe(100);
                    expect(UserApiEndpoints.callUserUpdateStatusWithJwt).not.toHaveBeenCalled();
                    done();
                },
                () => done(new Error("expected to fail"))
            );
        });
    });

    describe("deleteDeviceBySigningKeyWithJwt", () => {
        it("calls the correct API", async () => {
            jest.spyOn(UserApiEndpoints, "callUserDeviceDeleteBySigningKeyWithJwt").mockReturnValue(Future.of<any>({id: 33}));
            ApiState.clearCurrentUser();
            expect(ApiState.user()).toBeUndefined();
            const result = await UserApi.deleteDeviceBySigningKeyWithJwt("jwt", "signingKey");

            expect(UserApiEndpoints.callUserDeviceDeleteBySigningKeyWithJwt).toHaveBeenCalledWith("jwt", "signingKey");
            expect(result).toBe(33);
            expect(ApiState.user()).toBeUndefined();
        });
    });
});

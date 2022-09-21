import * as Initialize from "../Initialize";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import Future from "futurejs";
import * as ShimUtils from "../ShimUtils";
import * as FrameMediator from "../FrameMediator";

describe("Initialize", () => {
    describe("createNewUser", () => {
        it("rejects if JWT callback does not return a promise", (done) => {
            const jwtCallback = () => ({} as any);

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => done("resolve should not be called when JWT CB is invalid"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_FORMAT_FAILURE);
                    done();
                });
        });

        it("rejects if JWT promise rejects", (done) => {
            const jwtCallback = () => {
                return Promise.reject(new Error("failed promise"));
            };

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("sends message to frame to create new user", (done) => {
            const jwtCallback = jest.fn().mockReturnValue(Promise.resolve("validJWT"));
            jest.spyOn(FrameMediator, "sendMessage").mockImplementation(() =>
                Future.of<any>({message: {id: "1", segmentId: 1, status: 1, userMasterPublicKey: "pubkey", userPrivateKey: "privkey"}})
            );
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then((initResult) => {
                    expect(jwtCallback).toHaveBeenCalledTimes(1);
                    expect(initResult).toEqual({
                        accountID: "1",
                        segmentID: 1,
                        status: 1,
                        userMasterPublicKey: "pubkey",
                    });

                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "CREATE_USER",
                        message: {
                            jwtToken: "validJWT",
                            passcode: "passcode",
                            needsRotation: false,
                        },
                    });

                    expect(ShimUtils.storeParentWindowSymmetricKey).not.toHaveBeenCalled();
                    done();
                })
                .catch((e) => {
                    throw e;
                });
        });
    });

    describe("createUserDeviceKeys", () => {
        it("rejects if JWT callback does not return a promise", (done) => {
            const jwtCallback = () => ({} as any);

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => done("resolve should not be called when JWT CB is invalid"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_FORMAT_FAILURE);
                    done();
                });
        });

        it("rejects if JWT promise rejects", (done) => {
            const jwtCallback = () => {
                return Promise.reject(new Error("failed promise"));
            };

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("sends message to frame to create new user devices", (done) => {
            const jwtCallback = jest.fn().mockReturnValue(Promise.resolve("validJWT"));
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    type: "CREATE_DETATCHED_USER_DEVICE_RESPONSE",
                    message: {
                        accountID: "abc",
                        segmentID: 11,
                        deviceKey: "devPriv",
                        signingKey: "sigPriv",
                    },
                })
            );

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then((deviceResult) => {
                    expect(jwtCallback).toHaveBeenCalledTimes(1);
                    expect(deviceResult).toEqual({
                        accountID: "abc",
                        segmentID: 11,
                        deviceKey: "devPriv",
                        signingKey: "sigPriv",
                    });

                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "CREATE_DETATCHED_USER_DEVICE",
                        message: {
                            jwtToken: "validJWT",
                            passcode: "passcode",
                        },
                    });
                    done();
                })
                .catch((e) => {
                    throw e;
                });
        });
    });

    describe("jwt failures", () => {
        it("rejects if JWT callback does not return a promise", (done) => {
            const jwtCallback = () => ({} as any);

            Initialize.initialize(jwtCallback, jest.fn())
                .then(() => done("resolve should not be called when JWT CB is invalid"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_FORMAT_FAILURE);
                    done();
                });
        });

        it("rejects if JWT promise rejects", (done) => {
            const jwtCallback = () => {
                return Promise.reject(new Error("failed promise"));
            };

            Initialize.initialize(jwtCallback, jest.fn())
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.initialize(jwtCallback, jest.fn())
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.initialize(jwtCallback, jest.fn())
                .then(() => done("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });
    });

    describe("setPasscode failures", () => {
        afterEach(() => {
            localStorage.clear();
        });

        it("rejects if passcode callback doesnt return a Promise", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback: any = () => "passcode";
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => done("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_FORMAT_FAILURE);
                    done();
                });
        });

        it("rejects if passcode is not a string", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = (userExists: boolean) => {
                expect(userExists).toBe(true);
                return Promise.resolve([] as any);
            };
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: true}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => done("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if passcode has no length", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = (userExists: boolean) => {
                expect(userExists).toBe(false);
                return Promise.resolve("");
            };
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => done("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if set passcode promise rejects", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = () => Promise.reject(new Error("forced failure"));
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => done("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.message).toEqual("forced failure");
                    done();
                });
        });
    });

    describe("SDK response", () => {
        afterEach(() => {
            localStorage.clear();
        });

        it("sends message to frame to create new user when verify result has no user", (done) => {
            const jwtCallback = jest.fn().mockReturnValue(Promise.resolve("validJWT"));
            const passcodeCallback = jest.fn().mockReturnValue(Promise.resolve("passcode"));
            jest.spyOn(FrameMediator, "sendMessage").mockImplementation((message: any) => {
                if (message.type === "INIT_SDK") {
                    return Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}});
                }
                return Future.of<any>({message: {symmetricKey: "symKey", user: {id: "user-10", status: 1}}});
            });
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then((initResult) => {
                    expect(jwtCallback).toHaveBeenCalledTimes(2);
                    expect(passcodeCallback).toHaveBeenCalledWith(false);
                    expect(initResult).toEqual({
                        user: {
                            id: "user-10",
                            status: 1,
                        },
                    });

                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "INIT_SDK",
                        message: {
                            jwtToken: "validJWT",
                            symmetricKey: undefined,
                        },
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "CREATE_USER_AND_DEVICE",
                        message: {
                            passcode: "passcode",
                            jwtToken: "validJWT",
                        },
                    });

                    expect(ShimUtils.storeParentWindowSymmetricKey).toHaveBeenCalledWith("symKey");
                    done();
                })
                .catch((e) => {
                    throw e;
                });
        });

        it("sends message to sub frame to create new device keys", (done) => {
            const jwtCallback = jest.fn().mockReturnValue(Promise.resolve("validJWT"));
            const passcodeCallback = jest.fn().mockReturnValue(Promise.resolve("pass"));
            jest.spyOn(FrameMediator, "sendMessage").mockImplementation((message: any) => {
                if (message.type === "INIT_SDK") {
                    return Future.of<any>({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: true}});
                }
                return Future.of<any>({message: {symmetricKey: "symKeyFromNewDevice", user: {id: "user-10", status: 1}}});
            });
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then((initResult) => {
                    expect(initResult).toEqual({
                        user: {
                            id: "user-10",
                            status: 1,
                        },
                    });
                    expect(jwtCallback).toHaveBeenCalledTimes(2);
                    expect(passcodeCallback).toHaveBeenCalledWith(true);
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "INIT_SDK",
                        message: {
                            jwtToken: "validJWT",
                            symmetricKey: undefined,
                        },
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GEN_DEVICE_KEYS",
                        message: {passcode: "pass", jwtToken: "validJWT"},
                    });
                    expect(ShimUtils.storeParentWindowSymmetricKey).toHaveBeenCalledWith("symKeyFromNewDevice");

                    done();
                })
                .catch((e) => {
                    throw e;
                });
        });

        it("sends JWT token to sub frame and returns full SDK if the user already exists and has keys", (done) => {
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");
            const jwtCallback = () => Promise.resolve("validJWT");
            const passcodeCallback = jest.fn().mockReturnValue(Promise.resolve("pass"));
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    type: "FULL_SDK_RESPONSE",
                    message: {
                        symmetricKey: "symKey2",
                        user: {
                            id: "user-10",
                            status: 1,
                        },
                    },
                })
            );

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then((initResult) => {
                    expect(initResult).toEqual({
                        user: {
                            id: "user-10",
                            status: 1,
                        },
                    });
                    expect(passcodeCallback).not.toHaveBeenCalled();
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "INIT_SDK",
                        message: {
                            jwtToken: "validJWT",
                            symmetricKey: undefined,
                        },
                    });
                    expect(ShimUtils.storeParentWindowSymmetricKey).toHaveBeenCalledWith("symKey2");
                    done();
                })
                .catch((e) => {
                    throw e;
                });
        });
    });

    describe("deleteDeviceByPublicSigningKey", () => {
        it("sends the frame delete message, doesn't send delete request type to frame", (done) => {
            ShimUtils.clearSDKInitialized();
            jest.spyOn(ShimUtils, "clearParentWindowSymmetricKey");
            jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({message: 10}));
            Initialize.deleteDeviceByPublicSigningKey(() => Promise.resolve("jwt"), "signingKey")
                .then((result: any) => {
                    expect(result).toEqual(10);
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DELETE_DEVICE_BY_SIGNING_KEY_JWT",
                        message: {
                            publicSigningKey: "signingKey",
                            jwtToken: "jwt",
                        },
                    });
                    expect(ShimUtils.clearParentWindowSymmetricKey).not.toHaveBeenCalled();
                    done();
                })
                .catch((e) => done(e));
        });
    });
});

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
                .then(() => fail("resolve should not be called when JWT CB is invalid"))
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
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("sends message to frame to create new user", (done) => {
            const jwtCallback = jasmine.createSpy("jwt").and.returnValue(Promise.resolve("validJWT"));
            jest.spyOn(FrameMediator, "sendMessage").and.callFake(() =>
                Future.of({message: {id: "1", segmentId: 1, status: 1, userMasterPublicKey: "pubkey", userPrivateKey: "privkey"}})
            );
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");

            Initialize.createNewUser(jwtCallback, "passcode", false)
                .then((initResult) => {
                    expect(jwtCallback.calls.count()).toEqual(1);
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
                .catch((e) => fail(e));
        });
    });

    describe("createUserDeviceKeys", () => {
        it("rejects if JWT callback does not return a promise", (done) => {
            const jwtCallback = () => ({} as any);

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => fail("resolve should not be called when JWT CB is invalid"))
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
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.createUserDeviceKeys(jwtCallback, "passcode")
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("sends message to frame to create new user devices", (done) => {
            const jwtCallback = jasmine.createSpy("jwt").and.returnValue(Promise.resolve("validJWT"));
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(
                Future.of({
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
                    expect(jwtCallback.calls.count()).toEqual(1);
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
                .catch((e) => fail(e));
        });
    });

    describe("jwt failures", () => {
        it("rejects if JWT callback does not return a promise", (done) => {
            const jwtCallback = () => ({} as any);

            Initialize.initialize(jwtCallback, jasmine.createSpy("passcodeCallback"))
                .then(() => fail("resolve should not be called when JWT CB is invalid"))
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

            Initialize.initialize(jwtCallback, jasmine.createSpy("passcodeCallback"))
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: Error) => {
                    expect(err).toEqual(new Error("failed promise"));
                    done();
                });
        });

        it("rejects if JWT returned is not a string", (done) => {
            const jwtCallback = () => Promise.resolve({}) as Promise<string>;

            Initialize.initialize(jwtCallback, jasmine.createSpy("passcodeCallback"))
                .then(() => fail("resolve should not be called when JWT CB rejects"))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.JWT_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if JWT returned is an empty string", (done) => {
            const jwtCallback = () => Promise.resolve("");

            Initialize.initialize(jwtCallback, jasmine.createSpy("passcodeCallback"))
                .then(() => fail("resolve should not be called when JWT CB rejects"))
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
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => fail("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_FORMAT_FAILURE);
                    done();
                });
        });

        it("rejects if passcode is not a string", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = (userExists: boolean) => {
                expect(userExists).toBeTrue();
                return Promise.resolve([] as any);
            };
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: true}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => fail("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if passcode has no length", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = (userExists: boolean) => {
                expect(userExists).toBeFalse();
                return Promise.resolve("");
            };
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => fail("resolve should not be called when passcode callback "))
                .catch((err: SDKError) => {
                    expect(err).toEqual(expect.any(Error));
                    expect(err.code).toEqual(ErrorCodes.PASSCODE_RETRIEVAL_FAILURE);
                    done();
                });
        });

        it("rejects if set passcode promise rejects", (done) => {
            const jwtCallback = () => Promise.resolve("jwt");
            const passcodeCallback = () => Promise.reject(new Error("forced failure"));
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}}));

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then(() => fail("resolve should not be called when passcode callback "))
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
            const jwtCallback = jasmine.createSpy("jwt").and.returnValue(Promise.resolve("validJWT"));
            const passcodeCallback = jasmine.createSpy("passcode").and.returnValue(Promise.resolve("passcode"));
            jest.spyOn(FrameMediator, "sendMessage").and.callFake((message: any) => {
                if (message.type === "INIT_SDK") {
                    return Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: false}});
                }
                return Future.of({message: {symmetricKey: "symKey", user: {id: "user-10", status: 1}}});
            });
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");

            Initialize.initialize(jwtCallback, passcodeCallback)
                .then((initResult) => {
                    expect(jwtCallback.calls.count()).toEqual(2);
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
                .catch((e) => fail(e));
        });

        it("sends message to sub frame to create new device keys", (done) => {
            const jwtCallback = jasmine.createSpy("jwt").and.returnValue(Promise.resolve("validJWT"));
            const passcodeCallback = jasmine.createSpy("passcode").and.returnValue(Promise.resolve("pass"));
            jest.spyOn(FrameMediator, "sendMessage").and.callFake((message: any) => {
                if (message.type === "INIT_SDK") {
                    return Future.of({type: "INIT_PASSCODE_REQUIRED", message: {doesUserExist: true}});
                }
                return Future.of({message: {symmetricKey: "symKeyFromNewDevice", user: {id: "user-10", status: 1}}});
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
                    expect(jwtCallback.calls.count()).toEqual(2);
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
                .catch((e) => fail(e));
        });

        it("sends JWT token to sub frame and returns full SDK if the user already exists and has keys", (done) => {
            jest.spyOn(ShimUtils, "storeParentWindowSymmetricKey");
            const jwtCallback = () => Promise.resolve("validJWT");
            const passcodeCallback = jasmine.createSpy("passcode").and.returnValue(Promise.resolve("pass"));
            jest.spyOn(FrameMediator, "sendMessage").and.returnValue(
                Future.of({
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
                .catch((e) => fail(e));
        });
    });
});

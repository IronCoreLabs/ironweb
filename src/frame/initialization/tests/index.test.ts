import {fromByteArray} from "base64-js";
import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import {publicKeyToBase64} from "../../../lib/Utils";
import * as TestUtils from "../../../tests/TestUtils";
import ApiState from "../../ApiState";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import * as FrameUtils from "../../FrameUtils";
import * as Init from "../index";
import * as InitializationApi from "../InitializationApi";

describe("init index", () => {
    beforeEach(() => {
        ApiState.clearCurrentUser();
    });
    afterEach(() => {
        localStorage.clear();
    });

    describe("initialize", () => {
        it("sets user on state with verify response when users exists", (done) => {
            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                })
            );

            Init.initialize("jwtToken").engage(
                (e) => {
                    throw e;
                },
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(InitializationApi.initializeApi).toHaveBeenCalledWith("jwtToken");
                    const user = ApiState.user();
                    expect(user.id).toEqual("user-10");
                    expect(user.segmentId).toEqual(1);
                    expect(user.status).toEqual(1);
                    expect(user.groupsNeedingRotation).toEqual([]);
                    done();
                }
            );
        });

        it("does not update user state when user does not exist on verify response", (done) => {
            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: undefined,
                })
            );

            Init.initialize("jwtToken").engage(
                (e) => {
                    throw e;
                },
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: false,
                        },
                    });
                    expect(InitializationApi.initializeApi).toHaveBeenCalledWith("jwtToken");
                    expect(ApiState.user()).toBeUndefined();
                    done();
                }
            );
        });

        it("clears local device keys when no sym key provided and returns passcode response", (done) => {
            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                })
            );
            jest.spyOn(InitializationApi, "fetchAndValidateLocalKeys");
            jest.spyOn(FrameUtils, "clearDeviceAndSigningKeys");

            Init.initialize("jwtToken", undefined).engage(
                (e) => {
                    throw e;
                },
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(InitializationApi.fetchAndValidateLocalKeys).not.toHaveBeenCalled();
                    expect(FrameUtils.clearDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1);
                    expect(typeof ApiState.user()).toBe("object");
                    done();
                }
            );
        });

        it("expects passcode response when local keys cannot be found or validated", (done) => {
            jest.spyOn(InitializationApi, "fetchAndValidateLocalKeys").mockReturnValue(Future.reject(new Error("failed")));

            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                })
            );

            Init.initialize("jwtToken", "symKey").engage(
                (e) => {
                    throw e;
                },
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(typeof ApiState.user()).toBe("object");
                    done();
                }
            );
        });

        it("returns with SDK object when device/signing keys are found locally", (done) => {
            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                })
            );

            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(InitializationApi, "fetchAndValidateLocalKeys").mockReturnValue(Future.of<any>({deviceKeys, signingKeys}));

            Init.initialize("jwtToken", "symKey").engage(
                (e) => {
                    throw e;
                },
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            user: {
                                id: "user-10",
                                needsRotation: false,
                                status: 1,
                            },
                            groupsNeedingRotation: [],
                            symmetricKey: undefined,
                        },
                    });
                    expect(ApiState.userPublicKey()).toEqual(TestUtils.userPublicBytes);
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);
                    expect(ApiState.user()).toEqual(TestUtils.getFullUser());
                    expect(InitializationApi.fetchAndValidateLocalKeys).toHaveBeenCalledWith("user-10", 1, "symKey");
                    done();
                }
            );
        });
    });

    describe("createUser", () => {
        it("invokes create user request and does not set API state", () => {
            const userKeys = TestUtils.getEmptyKeyPair();
            const apiResponse: ApiUserResponse = {
                id: "1",
                segmentId: 1,
                status: 1,
                userMasterPublicKey: publicKeyToBase64(userKeys.publicKey),
                userPrivateKey: fromByteArray(userKeys.privateKey),
                currentKeyId: 1,
                needsRotation: false,
                groupsNeedingRotation: [],
            };

            jest.spyOn(FrameUtils, "storeDeviceAndSigningKeys");

            jest.spyOn(InitializationApi, "createUser").mockReturnValue(Future.of<any>(apiResponse));

            Init.createUser("jwt", "passcode", false).engage(
                (e) => {
                    throw e;
                },
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "CREATE_USER_RESPONSE",
                        message: apiResponse,
                    });
                    expect(InitializationApi.createUser).toHaveBeenCalledWith("passcode", "jwt", false);
                    expect(FrameUtils.storeDeviceAndSigningKeys).not.toHaveBeenCalled();
                }
            );
        });
    });

    describe("createUserAndDevice", () => {
        it("invokes create user request and sets API state before returning SDK response type", () => {
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            const userKeys = TestUtils.getEmptyKeyPair();

            jest.spyOn(FrameUtils, "storeDeviceAndSigningKeys");

            jest.spyOn(InitializationApi, "createUserAndDevice").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                    keys: {
                        userKeys: {
                            ...userKeys,
                            encryptedPrivateKey: new Uint8Array(10),
                        },
                        deviceKeys,
                        signingKeys,
                        transformKey: TestUtils.getTransformKey(),
                    },
                    encryptedLocalKeys: {
                        encryptedDeviceKey: "edk",
                        encryptedSigningKey: "esk",
                        symmetricKey: "sk",
                        iv: "iv",
                    },
                })
            );

            Init.createUserAndDevice("jwt", "passcode").engage(
                (e) => {
                    throw e;
                },
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            symmetricKey: "AAA=",
                            user: {
                                id: "user-10",
                                needsRotation: false,
                                status: 1,
                            },
                            groupsNeedingRotation: [],
                        },
                    });
                    expect(InitializationApi.createUserAndDevice).toHaveBeenCalledWith("passcode", "jwt");
                    expect(ApiState.userPublicKey()).toEqual(TestUtils.userPublicBytes);
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);
                    expect(ApiState.user()).toEqual(TestUtils.getFullUser());

                    expect(FrameUtils.storeDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1, "edk", "esk", "iv");
                }
            );
        });
    });

    describe("generateUserNewDeviceKeys", () => {
        it("decrypts user key and generates new keys", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            jest.spyOn(InitializationApi, "initializeApi").mockReturnValue(
                Future.of<any>({
                    user: TestUtils.getFullUser(),
                })
            );
            jest.spyOn(FrameUtils, "storeDeviceAndSigningKeys");
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(InitializationApi, "generateDeviceAndSigningKeys").mockReturnValue(
                Future.of<any>({
                    encryptedLocalKeys: {
                        encryptedDeviceKey: "edk",
                        encryptedSigningKey: "esk",
                        symmetricKey: "sk",
                        iv: "iv",
                    },
                    userUpdateKeys: {deviceKeys, signingKeys},
                })
            );
            jest.spyOn(localStorage, "setItem");

            Init.generateUserNewDeviceKeys("jwtToken", "passcode").engage(
                (e) => {
                    throw e;
                },
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            symmetricKey: "AAA=",
                            user: {
                                id: "user-10",
                                needsRotation: false,
                                status: 1,
                            },
                            groupsNeedingRotation: [],
                        },
                    });
                    expect(InitializationApi.generateDeviceAndSigningKeys).toHaveBeenCalledWith(
                        "jwtToken",
                        "passcode",
                        new Uint8Array([]),
                        TestUtils.userPublicBytes
                    );
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);

                    expect(FrameUtils.storeDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1, "edk", "esk", "iv");
                }
            );
        });
    });

    describe("createDetachedUserDevice", () => {
        it("verifies user and rejects if they dont exist", () => {
            jest.spyOn(UserApiEndpoints, "callUserVerifyApi").mockReturnValue(Future.of<any>({}));

            Init.createDetachedUserDevice("token", "pass").engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.USER_NOT_SYNCED_FAILURE);
                },
                () => {
                    throw new Error("Call should not succeed when user doesnt yet exist.");
                }
            );
        });

        it("uses verified user and password to decrypt master key and generates device from it", () => {
            jest.spyOn(UserApiEndpoints, "callUserVerifyApi").mockReturnValue(
                Future.of<any>({
                    user: {
                        id: "mockID",
                        segmentId: 333,
                        userPrivateKey: "aaaa",
                        userMasterPublicKey: TestUtils.getFullUser().userMasterPublicKey,
                    },
                })
            );
            jest.spyOn(InitializationApi, "generateDeviceAndSigningKeys").mockReturnValue(
                Future.of<any>({
                    userUpdateKeys: {
                        deviceKeys: {privateKey: new Uint8Array([98, 81, 130, 199])},
                        signingKeys: {privateKey: new Uint8Array([58, 101, 98])},
                    },
                    addedDevice: {
                        id: 1,
                        created: "timestamp",
                        name: "deviceName",
                    },
                })
            );

            Init.createDetachedUserDevice("token", "pass").engage(
                (e) => {
                    throw e;
                },
                (result) => {
                    expect(InitializationApi.generateDeviceAndSigningKeys).toHaveBeenCalledWith("token", "pass", expect.any(Uint8Array), {
                        x: expect.any(Uint8Array),
                        y: expect.any(Uint8Array),
                    });
                    expect(result).toEqual({
                        accountId: "mockID",
                        segmentId: 333,
                        devicePrivateKey: "YlGCxw==",
                        signingPrivateKey: "OmVi",
                        id: 1,
                        created: "timestamp",
                        name: "deviceName",
                    });
                }
            );
        });
    });
});

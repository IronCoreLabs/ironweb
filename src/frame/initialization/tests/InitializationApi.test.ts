import * as InitApi from "../InitializationApi";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import * as WorkerMediator from "../../WorkerMediator";
import Future from "futurejs";
import * as FrameUtils from "../../FrameUtils";
import * as TestUtils from "../../../tests/TestUtils";

describe("InitializationApi", () => {
    describe("initializeApi", () => {
        it("invokes API endpoint with expected parameter", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserVerifyApi").mockReturnValue(Future.of<any>("init result"));

            InitApi.initializeApi("jwtToken").engage(
                (e) => {
                    throw e;
                },
                (val: any) => {
                    expect(val).toEqual("init result");
                    expect(UserApiEndpoints.callUserVerifyApi).toHaveBeenCalledWith("jwtToken");
                    done();
                }
            );
        });
    });

    describe("createUser", () => {
        it("requests new JWT and derives key if jwt is callback", (done) => {
            const userKeys = TestUtils.getEmptyKeyPair();

            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: userKeys,
                })
            );
            jest.spyOn(UserApiEndpoints, "callUserCreateApi").mockReturnValue(Future.of<any>("new user"));

            InitApi.createUser("passcode", "jwtToken2", false).engage(
                (e) => {
                    throw e;
                },
                (userCreationData: any) => {
                    expect(userCreationData).toEqual("new user");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: expect.any(String),
                        message: {passcode: "passcode"},
                    });
                    expect(UserApiEndpoints.callUserCreateApi).toHaveBeenCalledWith("jwtToken2", userKeys, false);
                    done();
                }
            );
        });
    });

    describe("createUserAndDevice", () => {
        it("requests new JWT and derives key if jwt is callback", (done) => {
            const userKeys = TestUtils.getEmptyKeyPair();
            const deviceAndSigning = {
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: {
                    publicKey: new Uint8Array([]),
                    privateKey: new Uint8Array([]),
                },
            };

            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {
                        userKeys,
                        encryptedDeviceAndSigningKeys: deviceAndSigning,
                    },
                })
            );
            jest.spyOn(UserApiEndpoints, "callUserCreateApiWithDevice").mockReturnValue(Future.of<any>("new user"));

            InitApi.createUserAndDevice("passcode", "jwtToken2").engage(
                (e) => {
                    throw e;
                },
                (userCreationData: any) => {
                    expect(userCreationData).toEqual({
                        user: "new user",
                        keys: userKeys,
                        encryptedLocalKeys: deviceAndSigning,
                    });

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: expect.any(String),
                        message: {passcode: "passcode"},
                    });
                    expect(UserApiEndpoints.callUserCreateApiWithDevice).toHaveBeenCalledWith("jwtToken2", userKeys);
                    done();
                }
            );
        });
    });

    describe("generateDeviceAndSigningKeys", () => {
        it("generates a new device/signing key pair, transform key, and saves to API", () => {
            const userKeys = {
                ...TestUtils.getEmptyKeyPair(),
                transformKey: TestUtils.getTransformKey(),
            };
            const deviceAndSigning = {
                deviceKeys: TestUtils.getEmptyKeyPair(),
                signingKeys: {
                    publicKey: new Uint8Array([]),
                    privateKey: new Uint8Array([]),
                },
            };
            const encryptedUserKey = new Uint8Array(64);
            const userPublicKey = TestUtils.getEmptyPublicKey();
            const deviceSignature = new Uint8Array(33);

            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {
                        userKeys,
                        encryptedDeviceAndSigningKeys: deviceAndSigning,
                        deviceSignature: {
                            signature: deviceSignature,
                            ts: 353253,
                        },
                    },
                })
            );
            jest.spyOn(UserApiEndpoints, "callUserDeviceAdd").mockReturnValue(
                Future.of<any>({
                    id: 1,
                    created: "timestamp",
                    name: "deviceName",
                })
            );

            InitApi.generateDeviceAndSigningKeys("jwtToken", "passcode", encryptedUserKey, userPublicKey).engage(
                (e) => {
                    throw e;
                },
                (keys: any) => {
                    expect(keys).toEqual({
                        userUpdateKeys: userKeys,
                        encryptedLocalKeys: deviceAndSigning,
                        addedDevice: {id: 1, created: "timestamp", name: "deviceName"},
                    });

                    expect(UserApiEndpoints.callUserDeviceAdd).toHaveBeenCalledWith(
                        "jwtToken",
                        userKeys.publicKey,
                        userKeys.transformKey,
                        deviceSignature,
                        353253
                    );
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: expect.any(String),
                        message: {
                            passcode: "passcode",
                            jwtToken: "jwtToken",
                            encryptedPrivateUserKey: encryptedUserKey,
                            publicUserKey: userPublicKey,
                            keySalt: new Uint8Array(32),
                        },
                    });
                }
            );
        });
    });

    describe("fetchAndValidateLocalKeys", () => {
        it("looks up keys in local storage and returns public and private for device and signing", () => {
            const encryptedDeviceKey = new Uint8Array(33);
            const encryptedSigningKey = new Uint8Array(64);
            const nonce = new Uint8Array(12);

            jest.spyOn(FrameUtils, "getDeviceAndSigningKeys").mockReturnValue(Future.of<any>({encryptedDeviceKey, encryptedSigningKey, nonce}));

            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(Future.of<any>({message: "decrypted keys"}));

            InitApi.fetchAndValidateLocalKeys("30", 3, "AA==").engage(
                (e) => {
                    throw e;
                },
                (response: any) => {
                    expect(response).toEqual("decrypted keys");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: expect.any(String),
                        message: {
                            encryptedDeviceKey,
                            encryptedSigningKey,
                            nonce,
                            symmetricKey: new Uint8Array(1),
                        },
                    });
                }
            );
        });
    });
});

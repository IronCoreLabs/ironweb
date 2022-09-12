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
});

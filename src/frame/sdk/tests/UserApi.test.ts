import * as UserApi from "../UserApi";
import * as WorkerMediator from "../../WorkerMediator";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import Future from "futurejs";
import ApiState from "../../ApiState";
import * as TestUtils from "../../../tests/TestUtils";

describe("UserApi", () => {
    describe("deauthorizeDevice", () => {
        it("calls API and clears items from expected key", () => {
            jest.spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").mockReturnValue(Future.of<any>({id: 33}));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            UserApi.deauthorizeDevice().engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result) => {
                    expect(UserApiEndpoints.callUserCurrentDeviceDelete).toHaveBeenCalledWith();
                    expect(result).toBe(true);
                    expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
                    expect(ApiState.user()).toBeUndefined();
                }
            );
        });

        it("clears items from local storage even if request fails", () => {
            jest.spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").mockReturnValue(Future.reject<any>("device delete"));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            jest.spyOn(Storage.prototype, "removeItem");
            UserApi.deauthorizeDevice().engage(
                (e) => {
                    throw new Error(e.message);
                },
                (result) => {
                    expect(result).toBe(false);
                    expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
                    expect(ApiState.user()).toBeUndefined();
                }
            );
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
});

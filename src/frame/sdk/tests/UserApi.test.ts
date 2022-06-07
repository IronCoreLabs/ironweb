import * as UserApi from "../UserApi";
import * as WorkerMediator from "../../WorkerMediator";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import Future from "futurejs";
import ApiState from "../../ApiState";
import * as TestUtils from "../../../tests/TestUtils";

describe("UserApi", () => {
    describe("deauthorizeDevice", () => {
        it("calls API and clears items from expected key", () => {
            spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").and.returnValue(Future.of({id: 33}));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            spyOn(Storage.prototype, "removeItem");
            UserApi.deauthorizeDevice().engage(
                (e) => fail(e.message),
                (result) => {
                    expect(UserApiEndpoints.callUserCurrentDeviceDelete).toHaveBeenCalledWith();
                    expect(result).toBeTrue();
                    expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
                    expect(ApiState.user()).toBeUndefined();
                }
            );
        });

        it("clears items from local storage even if request fails", () => {
            spyOn(UserApiEndpoints, "callUserCurrentDeviceDelete").and.returnValue(Future.reject("device delete"));
            ApiState.setCurrentUser(TestUtils.getFullUser());
            expect(ApiState.user()).toEqual(TestUtils.getFullUser());
            spyOn(Storage.prototype, "removeItem");
            UserApi.deauthorizeDevice().engage(
                (e) => fail(e.message),
                (result) => {
                    expect(result).toBeFalse();
                    expect(localStorage.removeItem).toHaveBeenCalledWith("1-1:user-10-icldaspkn");
                    expect(ApiState.user()).toBeUndefined();
                }
            );
        });
    });

    describe("rotateUserMasterKey", () => {
        it("sends message to worker and takes result and passes it to call user key update endpoint", (done) => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            spyOn(UserApiEndpoints, "callUserKeyUpdateApi").and.returnValue(Future.of("user key update result"));
            spyOn(WorkerMediator, "sendMessage").and.returnValue(
                Future.of({
                    message: {newEncryptedPrivateUserKey: "newEncryptedPrivateUserKey", augmentationFactor: "augmentationFactor"},
                })
            );
            spyOn(ApiState, "setEncryptedPrivateUserKey");

            UserApi.rotateUserMasterKey("current").engage(
                (e) => fail(e.message),
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
            spyOn(UserApiEndpoints, "callUserUpdateApi").and.returnValue(Future.of("user update result"));
            spyOn(WorkerMediator, "sendMessage").and.returnValue(
                Future.of({
                    message: {encryptedPrivateUserKey: "encrypted private user key"},
                })
            );
            spyOn(ApiState, "setEncryptedPrivateUserKey");

            UserApi.changeUsersPasscode("current", "new").engage(
                (e) => fail(e.message),
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

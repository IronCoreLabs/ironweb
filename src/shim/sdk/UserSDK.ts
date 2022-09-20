import {clearParentWindowSymmetricKey, checkSDKInitialized, clearSDKInitialized} from "../ShimUtils";
import * as FrameMediator from "../FrameMediator";
import * as MT from "../../FrameMessageTypes";
import {getJWT} from "../Initialize";
import {JWTCallback} from "ironweb";

/**
 * Update an existing users passcode that is used to escrow their private key. The returned Promise will resolve successfully upon passcode change or
 * will reject if the users current passcode was incorrect or could not be updated.
 * @param {string} currentPasscode The users current passcode
 * @param {string} newPasscode     New passcode
 */
export function changePasscode(currentPasscode: string, newPasscode: string) {
    checkSDKInitialized();
    const payload: MT.ChangeUserPasscode = {
        type: "CHANGE_USER_PASSCODE",
        message: {currentPasscode, newPasscode},
    };
    return FrameMediator.sendMessage<MT.ChangeUserPasscodeResponse>(payload)
        .map(() => undefined)
        .toPromise();
}
/**
 * Rotates the user current private key.
 * @param {string} passcode The users current passcode
 */
export function rotateMasterKey(passcode: string) {
    checkSDKInitialized();
    const payload: MT.RotateUserPrivateKey = {
        type: "ROTATE_USER_PRIVATE_KEY",
        message: {passcode},
    };
    return FrameMediator.sendMessage<MT.RotateUserPrivateKeyResponse>(payload)
        .map(() => undefined)
        .toPromise();
}

/**
 * @deprecated Use deleteDevice with no arguments to get the same behavior.
 * Clears local device keys from the current browser instance. This will require the user to enter their passcode the next time they want to use this browser on this machine.
 * This method should usually be called whenever the current user logs out of your application.
 */
export const deauthorizeDevice = () => deleteDevice().then((deletedDevice) => ({transformKeyDeleted: deletedDevice > 0}));

/**
 * Deletes a device. If deleting the current device, the user will have to enter their passcode the next time they want to use this browser on this machine.
 * This method should usually be called whenever the current user logs out of your application or you're aware a device of their's shouldn't have access.
 * @param {number | undefined} deviceId The device id to delete. If undefined, the current device will be deleted and local storage will be cleared.
 */
export const deleteDevice = (deviceId?: number) => {
    checkSDKInitialized();
    const deletingCurrentDevice = deviceId === undefined;
    const payload: MT.DeleteDevice = {
        type: "DELETE_DEVICE",
        message: deviceId,
    };
    // If current device, clear the local symmetric key from local storage, then send a request to clear the frames local storage.
    // Once that's complete clear the SDK init flag so that the user has to rerun init before the SDK methods will work again.
    if (deletingCurrentDevice) {
        clearParentWindowSymmetricKey();
    }
    return FrameMediator.sendMessage<MT.DeleteDeviceResponse>(payload)
        .map(({message}) => {
            if (deletingCurrentDevice) {
                clearSDKInitialized();
            }
            return message;
        })
        .toPromise();
};

/**
 * Deletes a device by its public signing key.
 * @param {Base64String} publicSigningKey The public signing key of the device to delete.
 */
export const deleteDeviceByPublicSigningKey = (publicSigningKey: Base64String) => {
    checkSDKInitialized();
    const payload: MT.DeleteDeviceBySigningKey = {
        type: "DELETE_DEVICE_BY_SIGNING_KEY",
        message: publicSigningKey,
    };
    return FrameMediator.sendMessage<MT.DeleteDeviceResponse>(payload)
        .map(({message}) => message)
        .toPromise();
};

/**
 * Deletes a device by its public signing key. Uses JWT auth, so it doesn't require an initialized SDK.
 * @param {Base64String} publicSigningKey The public signing key of the device to delete.
 */
export const deleteDeviceByPublicSigningKeyWithJwt = (jwtCallback: JWTCallback, publicSigningKey: Base64String): Promise<number> =>
    getJWT(jwtCallback)
        .flatMap((jwtToken) => {
            const payload: MT.DeleteDeviceBySigningKeyJwt = {
                type: "DELETE_DEVICE_BY_SIGNING_KEY_JWT",
                message: {
                    jwtToken,
                    publicSigningKey,
                },
            };
            return FrameMediator.sendMessage<MT.DeleteDeviceResponse>(payload).map(({message}) => message);
        })
        .toPromise();

/**
 * Lists all the devices for the currently logged in user.
 */
export const listDevices = () => {
    checkSDKInitialized();
    const payload: MT.ListDevices = {
        type: "LIST_DEVICES",
        message: null,
    };
    return FrameMediator.sendMessage<MT.ListDevicesResponse>(payload)
        .map(({message: result}) => result)
        .toPromise();
};

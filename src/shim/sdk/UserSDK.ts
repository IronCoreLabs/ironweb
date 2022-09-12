import {clearParentWindowSymmetricKey, checkSDKInitialized, clearSDKInitialized} from "../ShimUtils";
import * as FrameMediator from "../FrameMediator";
import * as MT from "../../FrameMessageTypes";

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
 * Clears local device keys from the current browser instance. This will require the user to enter their passcode the next time they want to use this browser on this machine.
 * This method should usually be called whenever the current user logs out of your application.
 */
export function deauthorizeDevice() {
    checkSDKInitialized();
    const payload: MT.DeauthorizeDevice = {
        type: "DEAUTHORIZE_DEVICE",
        message: null,
    };
    //Clear the local symmetric key from local storage, then send a request to clear the frames local storage. Once that's complete clear the SDK init flag
    //so that the user has to rerun init before the SDK methods will work again.
    clearParentWindowSymmetricKey();
    return FrameMediator.sendMessage<MT.DeauthorizeDeviceResponse>(payload)
        .map(({message}) => {
            clearSDKInitialized();
            return {transformKeyDeleted: message};
        })
        .toPromise();
}

/**
 * Lists all the devices for the currently logged in user.
 */
export function listDevices() {
    checkSDKInitialized();
    const payload: MT.ListDevices = {
        type: "LIST_DEVICES",
        message: null,
    };
    return FrameMediator.sendMessage<MT.ListDevicesResponse>(payload)
        .map(({message: result}) => result)
        .toPromise();
}

import ApiState from "../ApiState";
import {clearDeviceAndSigningKeys} from "../FrameUtils";
import * as WMT from "../../WorkerMessageTypes";
import * as WorkerMediator from "../WorkerMediator";
import UserApiEndpoints from "../endpoints/UserApiEndpoints";
import Future from "futurejs";

/**
 * Makes a request to delete the provided device from the DB and also clear user's device and signing keys from local storage.
 */
export function deauthorizeDevice() {
    return (
        UserApiEndpoints.callUserCurrentDeviceDelete()
            //If the delete request fails, we don't want to fail the Promise the caller gets because we'll still be able to delete
            //their device private key from local storage. So mock out a fake ID here that we can use to decision off of.
            .handleWith(() => Future.of({id: -1}))
            .map((deleteResponse) => {
                const {id, segmentId} = ApiState.user();
                clearDeviceAndSigningKeys(id, segmentId);
                ApiState.clearCurrentUser();
                return deleteResponse.id > 0;
            })
    );
}

/**
 * Rotate users current private key by taking their current passcode and using it to derive a key to decrypt their user private key.
 * Then generates and augmentation factor and subtracts that augmentation factor from the users private key. The new private key is then
 * encrypted. The new encrypted private key and the augmentation factor is then passed as an authorized api request. The server then
 * validates the request and augments the server side private key.
 * @param {string} passcode Users current passcode
 */
export function rotateUserMasterKey(passcode: string) {
    const encryptedPrivateUserKey = ApiState.encryptedUserKey();
    const payload: WMT.RotateUserPrivateKeyWorkerRequest = {
        type: "ROTATE_USER_PRIVATE_KEY",
        message: {
            passcode,
            encryptedPrivateUserKey,
        },
    };
    return WorkerMediator.sendMessage<WMT.RotateUserPrivateKeyWorkerResponse>(payload).flatMap(({message}) =>
        UserApiEndpoints.callUserKeyUpdateApi(message.newEncryptedPrivateUserKey, message.augmentationFactor)
    );
}

/**
 * Change the current users passcode by taking their current passcode and using it to derive a key to decrypt their user private key.
 * Then derive a key from their new passcode and use that to encrypt their user private key before saving it in escrow.
 * @param {string} currentPasscode Users current passcode
 * @param {string} newPasscode     New passcode to use
 */
export function changeUsersPasscode(currentPasscode: string, newPasscode: string) {
    const encryptedPrivateUserKey = ApiState.encryptedUserKey();

    const payload: WMT.ChangeUserPasscodeWorkerRequest = {
        type: "CHANGE_USER_PASSCODE",
        message: {
            currentPasscode,
            newPasscode,
            encryptedPrivateUserKey,
        },
    };

    return WorkerMediator.sendMessage<WMT.ChangeUserPasscodeWorkerResponse>(payload).flatMap(({message}) =>
        UserApiEndpoints.callUserUpdateApi(message.encryptedPrivateUserKey)
    );
}

import {decode as utf8Decode} from "@stablelib/utf8";
import Future from "futurejs";
import SDKError from "../../lib/SDKError";
import {ErrorCodes, UserStatus} from "../../Constants";
import * as WMT from "../../WorkerMessageTypes";
import ApiState from "../ApiState";
import UserApiEndpoints from "../endpoints/UserApiEndpoints";
import {clearDeviceAndSigningKeys} from "../FrameUtils";
import * as WorkerMediator from "../WorkerMediator";

/**
 * Extract the `sub` claim from a JWT token to identify the user the JWT is for. The JWT is
 * not verified here; the server is the authority. UTF-8 safe for non-ASCII user IDs.
 */
export const userIdFromJwt = (jwt: string): Future<SDKError, string> => {
    try {
        const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(window.atob(payload), (c) => c.charCodeAt(0));
        const claims = JSON.parse(utf8Decode(bytes));
        if (typeof claims.sub !== "string" || claims.sub.length === 0) {
            throw new Error("JWT is missing required 'sub' claim.");
        }
        return Future.of(claims.sub);
    } catch (e) {
        // Wrap in a fresh Error so SDKError applies our error code instead of inheriting one from
        // the underlying exception (e.g. DOMException from atob exposes a numeric `code` property).
        const message = e instanceof Error ? e.message : String(e);
        return Future.reject(new SDKError(new Error(message), ErrorCodes.JWT_FORMAT_FAILURE));
    }
};

/**
 * Rotate users current private key by taking their current passcode and using it to derive a key to decrypt their user private key.
 * Then generates and augmentation factor and subtracts that augmentation factor from the users private key. The new private key is then
 * encrypted. The new encrypted private key and the augmentation factor is then passed as an authorized api request. The server then
 * validates the request and augments the server side private key.
 * @param {string} passcode Users current passcode
 */
export function rotateUserMasterKey(passcode: string): Future<SDKError, ApiUserResponse> {
    const encryptedPrivateUserKey = ApiState.encryptedUserKey();

    const payload: WMT.RotateUserPrivateKeyWorkerRequest = {
        type: "ROTATE_USER_PRIVATE_KEY",
        message: {
            passcode,
            encryptedPrivateUserKey,
        },
    };
    return WorkerMediator.sendMessage<WMT.RotateUserPrivateKeyWorkerResponse>(payload).flatMap(({message}) => {
        //Since the users private key is now different, store it off in case the user performs any operations that need it (e.g. change password)
        //within this existing session.
        ApiState.setEncryptedPrivateUserKey(message.newEncryptedPrivateUserKey);
        return UserApiEndpoints.callUserKeyUpdateApi(message.newEncryptedPrivateUserKey, message.augmentationFactor);
    });
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

    return WorkerMediator.sendMessage<WMT.ChangeUserPasscodeWorkerResponse>(payload).flatMap(({message}: WMT.ChangeUserPasscodeWorkerResponse) => {
        //Since the users encrypted private key is now different, store it off in case the user performs any operations
        //that need it (e.g. change password, rotate master key) within this existing session.
        ApiState.setEncryptedPrivateUserKey(message.encryptedPrivateUserKey);
        return UserApiEndpoints.callUserUpdateApi(message.encryptedPrivateUserKey);
    });
}

/**
 * Makes a request to delete the provided device from the DB and clear user's device and signing keys from local storage if it's their current device.
 */
export const deleteDevice = (deviceId?: number) => {
    // if the id is undefined we're deleting the current device and need to do some more work
    if (deviceId === undefined) {
        return (
            UserApiEndpoints.callUserCurrentDeviceDelete()
                //If the delete request fails, we don't want to fail the Promise the caller gets because we'll still be able to delete
                //their device private key from local storage. So mock out a fake ID here that we can use to decision off of.
                .handleWith(() => Future.of({id: -1}))
                .map((deleteResponse) => {
                    deleteLocalDeviceAndClearUser();
                    return deleteResponse.id;
                })
        );
    } else {
        return UserApiEndpoints.callUserDeviceDelete(deviceId).map((r) => r.id);
    }
};

/**
 * Makes a request to delete the provided device from the DB.
 */
export const deleteDeviceBySigningKey = (publicSigningKey: Base64String) =>
    UserApiEndpoints.callUserDeviceDeleteBySigningKey(publicSigningKey).map((r) => r.id);

/**
 * Delete a device from the DB given the public signing key of the device. Uses JWT auth.
 */
export const deleteDeviceBySigningKeyWithJwt = (jwtToken: string, publicSigningKey: Base64String) =>
    UserApiEndpoints.callUserDeviceDeleteBySigningKeyWithJwt(jwtToken, publicSigningKey).map((r) => r.id);

/**
 * Makes a request to list the devices for the currently logged in user.
 */
export const listDevices = () => UserApiEndpoints.callUserListDevices();

const deleteLocalDeviceAndClearUser = () => {
    const user = ApiState.user();
    const {id, segmentId} = user;
    clearDeviceAndSigningKeys(id, segmentId);
    ApiState.clearCurrentUser();
};

/**
 * Disables the currently authenticated user. After this call succeeds the user
 * will not be able to invoke any other authorized SDK functions. Disabled users
 * remain members of any groups they belonged to but cannot use them.
 */
export const disableSelf = () =>
    UserApiEndpoints.callUserUpdateApi(undefined, UserStatus.DISABLED).map((r) => {
        deleteLocalDeviceAndClearUser();
        return r;
    });

/**
 * Update the status of the user identified by the provided JWT.
 * Allows changing a user's status using JWT auth, without an initialized SDK.
 * The user id is taken from the `sub` claim of the JWT.
 */
export const updateUserStatusWithJwt = (jwtToken: string, status: number) =>
    userIdFromJwt(jwtToken).flatMap((userId) => UserApiEndpoints.callUserUpdateStatusWithJwt(jwtToken, userId, status));

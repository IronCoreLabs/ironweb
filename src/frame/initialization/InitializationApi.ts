import {toByteArray} from "base64-js";
import Future from "futurejs";
import UserApiEndpoints, {UserCreationKeys} from "../endpoints/UserApiEndpoints";
import * as WMT from "../../WorkerMessageTypes";
import * as WorkerMediator from "../WorkerMediator";
import {CryptoConstants} from "../../Constants";
import {getDeviceAndSigningKeys} from "../FrameUtils";
import {sliceArrayBuffer} from "../../lib/Utils";
import SDKError from "../../lib/SDKError";

interface CreateUserAndDeviceResult {
    user: ApiUserResponse;
    keys: UserCreationKeys;
    encryptedLocalKeys: EncryptedLocalKeys;
}

/**
 * Invoke JWT callback, then call the user verify API
 * @param {CallbackToPromise} jwt User defined JWT to promise callback
 */
export function initializeApi(jwt: string) {
    return UserApiEndpoints.callUserVerifyApi(jwt);
}

export const createUser = (passcode: string, jwtToken: string, needsRotation: boolean): Future<SDKError, ApiUserResponse> => {
    const payload: WMT.NewUserKeygenWorkerRequest = {
        type: "NEW_USER_KEYGEN",
        message: {passcode},
    };
    return WorkerMediator.sendMessage<WMT.NewUserKeygenWorkerResponse>(payload).flatMap(({message}) => {
        return UserApiEndpoints.callUserCreateApi(jwtToken, message, needsRotation);
    });
};

/**
 * Create a new user by generating keys for them and then encrypting and storing them
 * @param  {CallbackToPromise} jwt      Callback to retrieve JWT token
 * @param  {string}            passcode Users passcode
 */
export function createUserAndDevice(passcode: string, jwtToken: string): Future<SDKError, CreateUserAndDeviceResult> {
    const payload: WMT.NewUserAndDeviceKeygenWorkerRequest = {
        type: "NEW_USER_AND_DEVICE_KEYGEN",
        message: {passcode},
    };
    return WorkerMediator.sendMessage<WMT.NewUserAndDeviceKeygenWorkerResponse>(payload).flatMap(({message}) => {
        return UserApiEndpoints.callUserCreateApiWithDevice(jwtToken, message.userKeys).map((createdUser) => ({
            user: createdUser,
            keys: message.userKeys,
            encryptedLocalKeys: message.encryptedDeviceAndSigningKeys,
        }));
    });
}

/**
 * Generate a new set of device and signing keys for an existing user who has lost their device keys.
 */
export function generateDeviceAndSigningKeys(jwtToken: string, passcode: string, encryptedPrivateUserKey: Uint8Array, publicUserKey: PublicKey<Uint8Array>) {
    const payload: WMT.DeviceKeygenWorkerRequest = {
        type: "USER_DEVICE_KEYGEN",
        message: {
            passcode,
            jwtToken,
            encryptedPrivateUserKey,
            publicUserKey,
            keySalt: sliceArrayBuffer(encryptedPrivateUserKey, 0, CryptoConstants.SALT_LENGTH),
        },
    };

    return WorkerMediator.sendMessage<WMT.DeviceKeygenWorkerResponse>(payload).flatMap(({message}) => {
        const {userKeys, deviceSignature, encryptedDeviceAndSigningKeys} = message;
        return UserApiEndpoints.callUserDeviceAdd(jwtToken, publicUserKey, userKeys.transformKey, deviceSignature.signature, deviceSignature.ts).map(() => ({
            userUpdateKeys: userKeys,
            encryptedLocalKeys: encryptedDeviceAndSigningKeys,
        }));
    });
}

/**
 * Attempt to read a users device and signing keys from local storage. If they exist and appear to be valid, use them to generate the associated public
 * key and return both pairs
 * @param {string} userID               User provided user ID
 * @param {number} segmentID            ID of segment user is a part of
 * @param {string} localKeySymmetricKey Users local symmetric key provided by parent window
 */
export function fetchAndValidateLocalKeys(userID: string, segmentID: number, localKeySymmetricKey: string) {
    return getDeviceAndSigningKeys(userID, segmentID).flatMap((localKeys) => {
        const payload: WMT.DecryptLocalKeysWorkerRequest = {
            type: "DECRYPT_LOCAL_KEYS",
            message: {
                ...localKeys,
                symmetricKey: toByteArray(localKeySymmetricKey),
            },
        };
        return WorkerMediator.sendMessage<WMT.DecryptLocalKeysWorkerResponse>(payload).map(({message}) => message);
    });
}

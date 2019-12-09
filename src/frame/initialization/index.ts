import Future from "futurejs";
import {fromByteArray, toByteArray} from "base64-js";
import * as InitializationApi from "./InitializationApi";
import ApiState from "../ApiState";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import UserApiEndpoints from "../endpoints/UserApiEndpoints";
import {storeDeviceAndSigningKeys, clearDeviceAndSigningKeys} from "../FrameUtils";
import {publicKeyToBytes} from "../../lib/Utils";
import {InitApiPasscodeResponse, InitApiSdkResponse, CreateUserResponse} from "../../FrameMessageTypes";
import {DeviceKeys} from "ironweb";

/**
 * Build response back to shim for when the SDK has been initialized. Include details about the current user as well as
 * the users optional device symmetric key to store in shim local storage.
 */
const buildSDKInitCompleteResponse = (user: ApiUserResponse, deviceSymmetricKey?: Uint8Array): InitApiSdkResponse => ({
    type: "FULL_SDK_RESPONSE",
    message: {
        user: {
            id: user.id,
            status: user.status,
            needsRotation: user.needsRotation,
            groupsNeedsRotation: user.groupsNeedsRotation,
        },
        symmetricKey: deviceSymmetricKey ? fromByteArray(deviceSymmetricKey) : undefined,
    },
});

/**
 * Handle result of verify call. If user exists, we attempt to lookup their private device/signing keys in local storage and generate their
 * public keys from them. If any of that fails or the user doesn't exist, we return the passcode callback response.
 * @param  {undefined|ApiUserResponse} user                         User response from verify endpoint
 * @param  {string}                    deviceAndSigningSymmetricKey Optional symmetric key that is used to decrypt the users device and signing keys
 */
const handleVerifyResult = (
    user: undefined | ApiUserResponse,
    deviceAndSigningSymmetricKey?: string
): Future<SDKError, InitApiPasscodeResponse | InitApiSdkResponse> => {
    const needsPasscode: InitApiPasscodeResponse = {
        type: "INIT_PASSCODE_REQUIRED",
        message: {doesUserExist: user !== undefined},
    };
    const needsPasscodeFuture = Future.of(needsPasscode);

    if (user) {
        ApiState.setCurrentUser(user);
        if (!deviceAndSigningSymmetricKey) {
            //If we didn't get a symmetric key from the parent window, don't even try to lookup the users local device keys, as we won't be able to
            //decrypt them anyway. So clear out anything we might have locally and ask for the users passcode to generate us a new device key set
            clearDeviceAndSigningKeys(user.id, user.segmentId);
            return needsPasscodeFuture;
        }
        return (
            InitializationApi.fetchAndValidateLocalKeys(user.id, user.segmentId, deviceAndSigningSymmetricKey)
                //We need to map this error to constrain the types to say we're returning a SDK Error, even though we'll always use the handleWith below. That's why the error code here is invalid.
                .errorMap((e) => new SDKError(e, 0))
                .map(({deviceKeys, signingKeys}) => {
                    ApiState.setDeviceAndSigningKeys(deviceKeys, signingKeys);
                    return buildSDKInitCompleteResponse(user);
                })
                //Handles the scenario where either
                //  + We couldn't find a local set of encrypted device/signing keys
                //  + We found them, but the JSON structure was mangled somehow
                //  + We found them and JSON parsed them, but the decryption failed
                //In that case we need to generate a new set of device keys, so get the users passcode
                //We have to use 'any' here because our Future library expects the "repairedType" of a handleWith to be the same as the "good" result type. In
                //this case we can't do that and want to return a different type
                .handleWith(() => needsPasscodeFuture as any)
        );
    }
    return needsPasscodeFuture;
};

/**
 * Initialize the API by providing a JWT callback to Promise method
 * @param {CallbackToPromise} jwtCallback                  Method which when invoked will return a Promise which will be resolved with a JWT token
 * @param {string}            deviceAndSigningSymmetricKey Optional symmetric key that is used to decrypt the users device and signing keys
 */
export const initialize = (jwtToken: string, deviceAndSigningSymmetricKey?: string) =>
    InitializationApi.initializeApi(jwtToken).flatMap(({user}) => handleVerifyResult(user, deviceAndSigningSymmetricKey));

/**
 * Create a new user given a JWT token to request with and the user's passcode to escrow their keys
 */
export const createUser = (jwtToken: string, passcode: string, needsRotation: boolean): Future<SDKError, CreateUserResponse> =>
    InitializationApi.createUser(passcode, jwtToken, needsRotation).map((_) => ({
        type: "CREATE_USER_RESPONSE",
        message: _,
    }));

/**
 * Create a new user given a JWT token to request with and the users passcode to escrow their keys, as well as a device for the current browser.
 * @param {string} jwtToken Users JWT token to validate create request
 * @param {string} passcode Users passcode to escrow their keys
 */
export const createUserAndDevice = (jwtToken: string, passcode: string): Future<SDKError, InitApiSdkResponse> =>
    InitializationApi.createUserAndDevice(passcode, jwtToken).map(({user, keys, encryptedLocalKeys}) => {
        const {deviceKeys, signingKeys} = keys;
        ApiState.setCurrentUser(user);
        ApiState.setDeviceAndSigningKeys(deviceKeys, signingKeys);
        storeDeviceAndSigningKeys(
            user.id,
            user.segmentId,
            encryptedLocalKeys.encryptedDeviceKey,
            encryptedLocalKeys.encryptedSigningKey,
            encryptedLocalKeys.iv
        );
        return buildSDKInitCompleteResponse(user, encryptedLocalKeys.symmetricKey);
    });

/**
 * Generate new device keys for an existing user
 * @param {string} jwtToken Users JWT token to validate device add request
 * @param {string} passcode Users passcode so we can decrypt their private user key to generate a transform key
 */
export const generateUserNewDeviceKeys = (jwtToken: string, passcode: string): Future<SDKError, InitApiSdkResponse> => {
    const {id, segmentId} = ApiState.user();
    return InitializationApi.generateDeviceAndSigningKeys(jwtToken, passcode, ApiState.encryptedUserKey(), ApiState.userPublicKey()).map(
        ({userUpdateKeys, encryptedLocalKeys}) => {
            ApiState.setDeviceAndSigningKeys(userUpdateKeys.deviceKeys, userUpdateKeys.signingKeys);
            storeDeviceAndSigningKeys(id, segmentId, encryptedLocalKeys.encryptedDeviceKey, encryptedLocalKeys.encryptedSigningKey, encryptedLocalKeys.iv);
            return buildSDKInitCompleteResponse(ApiState.user(), encryptedLocalKeys.symmetricKey);
        }
    );
};

/**
 * Create a set of device keys for an existing user given a valid JWT and their passcode. Validates that the user exists before
 * generating a set of device and signing keys. Only returns the private device and signing key since the associated public key
 * for each can be derived if/when necessary.
 */
export const createDetachedUserDevice = (jwtToken: string, passcode: string): Future<SDKError, DeviceKeys> =>
    UserApiEndpoints.callUserVerifyApi(jwtToken).flatMap((verifyResult) => {
        if (!verifyResult.user) {
            return Future.reject(
                new SDKError(
                    new Error("Cannot generate a device as the user specified in the provided JWT does not yet exist."),
                    ErrorCodes.USER_NOT_SYNCED_FAILURE
                )
            );
        }
        const {id, segmentId, userPrivateKey, userMasterPublicKey} = verifyResult.user;
        return InitializationApi.generateDeviceAndSigningKeys(jwtToken, passcode, toByteArray(userPrivateKey), publicKeyToBytes(userMasterPublicKey)).map(
            ({userUpdateKeys}) => ({
                accountId: id,
                segmentId: segmentId,
                devicePrivateKey: fromByteArray(userUpdateKeys.deviceKeys.privateKey),
                signingPrivateKey: fromByteArray(userUpdateKeys.signingKeys.privateKey),
            })
        );
    });

import {fromByteArray} from "base64-js";
import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import Future from "futurejs";
import {publicKeyToBase64, transformKeyToBase64} from "../../lib/Utils";
import * as ApiRequest from "../ApiRequest";
import {ErrorCodes} from "../../Constants";
import ApiState from "../ApiState";
import SDKError from "../../lib/SDKError";

export interface UserUpdateKeys {
    deviceKeys: {
        publicKey: PublicKey<Uint8Array>;
        privateKey: PrivateKey<Uint8Array>;
    };
    signingKeys: {
        publicKey: Uint8Array;
        privateKey: PrivateKey<Uint8Array>;
    };
    transformKey: TransformKey;
}

export interface UserCreationKeys extends UserUpdateKeys {
    userKeys: {
        publicKey: PublicKey<Uint8Array>;
        privateKey: PrivateKey<Uint8Array>;
        encryptedPrivateKey: PrivateKey<Uint8Array>;
    };
}

interface UserVerifyProcessedResult {
    user: ApiUserResponse | undefined;
    jwt: string;
}
type UserVerifyResponseType = ApiUserResponse | undefined;
type UserCreateResponseType = ApiUserResponse;
type UserUpdateResponseType = ApiUserResponse;
export interface UserKeyListResponseType {
    result: Array<{
        id: string;
        userMasterPublicKey: PublicKey<Base64String>;
    }>;
}

/**
 * Generate a signature for the current user from user state
 */
function getSignatureHeader() {
    const {segmentId, id} = ApiState.user();
    return ApiRequest.getRequestSignature(segmentId, id, ApiState.signingKeys());
}

/**
 * Generate an auth header that uses a JWT for authorization.
 */
function getJwtHeader(jwt: string) {
    return Future.of(`jwt ${jwt}`);
}

/**
 * Generate parameters for the init call with proper URL, options, and error code
 */
function verify() {
    return {
        url: `users/verify?returnKeys=true`,
        options: {},
        errorCode: ErrorCodes.USER_VERIFY_API_REQUEST_FAILURE,
    };
}

/**
 * Generate API request details for user create request
 * @param  {UserCreationKeys} keys Generated keys. Can either be a full key pair set of public/private keys, or a partial set with only public keys
 * @return {Object}                Request object that can be passed to fetch() API
 */
function userCreate(keys: UserCreationKeys) {
    const {userKeys, deviceKeys, signingKeys, transformKey} = keys;

    const body = {
        userPublicKey: publicKeyToBase64(userKeys.publicKey),
        userPrivateKey: fromByteArray(userKeys.encryptedPrivateKey),
        devices: [
            {
                publicKey: publicKeyToBase64(deviceKeys.publicKey),
                signingKey: fromByteArray(signingKeys.publicKey),
                transformKey: transformKeyToBase64(transformKey),
            },
        ],
    };
    return {
        url: `users`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        },
        errorCode: ErrorCodes.USER_CREATE_REQUEST_FAILURE,
    };
}

/**
 * Add a new set of device/signing/transform keys to the user
 * @param {string}       jwtToken      Users JWT token
 * @param {PublicKey}    userPublicKey Users master public key
 * @param {TransformKey} transformKey  Device transform key
 * @param {Uint8Array}   signature     Signature for device add request
 * @param {number}       timestamp     Timestamp of signature generation
 */
function userDeviceAdd(userPublicKey: PublicKey<Uint8Array>, transformKey: TransformKey, signature: Uint8Array, timestamp: number) {
    return {
        url: `users/devices`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                timestamp,
                userPublicKey: publicKeyToBase64(userPublicKey),
                device: {
                    transformKey: transformKeyToBase64(transformKey),
                },
                signature: fromByteArray(signature),
            }),
        },
        errorCode: ErrorCodes.USER_DEVICE_ADD_REQUEST_FAILURE,
    };
}

/**
 * Delete the users current device that is being used to make this request.
 */
function deleteCurrentDevice(userID: string) {
    return {
        url: `users/${userID}/devices/current`,
        options: {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        },
        errorCode: ErrorCodes.USER_DEVICE_DELETE_REQUEST_FAILURE,
    };
}

/**
 * Update a users status and/or their escrowed private key.
 * @param {string}                 userID         ID of user to update
 * @param {PrivateKey<Uint8Array>} userPrivateKey Users encrypted private key to escrow
 * @param {number}                 status         Updated status of user
 */
function userUpdate(userID: string, userPrivateKey?: PrivateKey<Uint8Array>, status?: number) {
    return {
        url: `users/${userID}`,
        options: {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                status,
                userPrivateKey: userPrivateKey ? fromByteArray(userPrivateKey) : undefined,
            }),
        },
        errorCode: ErrorCodes.USER_UPDATE_REQUEST_FAILURE,
    };
}

/**
 * Generate API request details for user key list request
 * @param {string[]}         userList List of user IDs to retrieve
 */
function userKeyList(userList: string[]) {
    return {
        url: `users?id=${userList.join(",")}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.USER_KEY_LIST_REQUEST_FAILURE,
    };
}

export default {
    /**
     * Invoke user verify API and maps result to determine if we got back a user or not
     * @param {string} jwt JWT token to pass to verify API
     */
    callUserVerifyApi(jwt: string): Future<SDKError, UserVerifyProcessedResult> {
        const {url, options, errorCode} = verify();
        return ApiRequest.fetchJSON<UserVerifyResponseType>(url, errorCode, options, getJwtHeader(jwt)).map((data) => ({
            user: data || undefined,
            jwt,
        }));
    },

    /**
     * Invoke user create API with jwt and users keys
     * @param {string}         jwt          JWT token
     * @param {FullKeyPairSet} creationKeys Users keys which will have public keys and optionally private keys
     */
    callUserCreateApi(jwt: string, creationKeys: UserCreationKeys): Future<SDKError, UserCreateResponseType> {
        const {url, options, errorCode} = userCreate(creationKeys);
        return ApiRequest.fetchJSON<UserCreateResponseType>(url, errorCode, options, getJwtHeader(jwt));
    },

    /**
     * Invoke user update API to either update a users escrowed, encrypted private key and/or update their status.
     * @param {PrivateKey<Uint8Array>} userPrivateKey Encrypted private key to update in escrow
     * @param {number}                 status         Updated status to set for user
     */
    callUserUpdateApi(userPrivateKey?: PrivateKey<Uint8Array>, status?: number) {
        const {id} = ApiState.user();
        const {url, options, errorCode} = userUpdate(id, userPrivateKey, status);
        return ApiRequest.fetchJSON<UserUpdateResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Invoke the user device add API with the provided device/signing/transform keys
     * @param {string}       jwtToken      Users authorized JWT token
     * @param {PublicKey}    userPublicKey Users master public key
     * @param {TransformKey} transformKey  Transform key from user master key to device key
     * @param {Uint8Array}   signature     Calculated signature to validate request
     * @param {number}       timestamp     Timestamp of signature generation
     */
    callUserDeviceAdd(jwtToken: string, userPublicKey: PublicKey<Uint8Array>, transformKey: TransformKey, signature: Uint8Array, timestamp: number) {
        const {url, options, errorCode} = userDeviceAdd(userPublicKey, transformKey, signature, timestamp);
        return ApiRequest.fetchJSON<UserUpdateResponseType>(url, errorCode, options, getJwtHeader(jwtToken));
    },

    /**
     * Delete the current users device to deauthorize this browser instance.
     */
    callUserCurrentDeviceDelete() {
        const {id} = ApiState.user();
        const {url, options, errorCode} = deleteCurrentDevice(id);
        return ApiRequest.fetchJSON<{id: number}>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Get a list of public keys for the provided list of users
     * @param {string[]} userList List of user IDs to retrieve
     */
    callUserKeyListApi(userList: string[]): Future<SDKError, UserKeyListResponseType> {
        if (!userList.length) {
            return Future.of({result: []});
        }
        const {url, options, errorCode} = userKeyList(userList);
        return ApiRequest.fetchJSON<UserKeyListResponseType>(url, errorCode, options, getSignatureHeader());
    },
};

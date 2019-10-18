import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import {fromByteArray} from "base64-js";
import Future from "futurejs";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import {publicKeyToBase64, transformKeyToBase64} from "../../lib/Utils";
import {IronCoreRequestInit, makeAuthorizedApiRequest, makeJwtApiRequest} from "../ApiRequest";
import ApiState from "../ApiState";

export type UserKeys = Readonly<{
    publicKey: PublicKey<Uint8Array>;
    privateKey: PrivateKey<Uint8Array>;
    encryptedPrivateKey: PrivateKey<Uint8Array>;
}>;

export type RequestMeta = Readonly<{
    url: string;
    options: IronCoreRequestInit;
    errorCode: ErrorCodes;
}>;

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

export type UserCreationKeys = UserUpdateKeys & Readonly<{userKeys: UserKeys}>;

interface UserVerifyProcessedResult {
    user: ApiUserResponse | undefined;
    jwt: string;
}
type UserVerifyResponseType = ApiUserResponse | undefined;
type UserCreateResponseType = ApiUserResponse;
type UserUpdateResponseType = ApiUserResponse;
export interface UserKeyListResponseType {
    result: {
        id: string;
        userMasterPublicKey: PublicKey<Base64String>;
    }[];
}

/**
 * Generate parameters for the init call with proper URL, options, and error code
 */
const verify = (): RequestMeta => ({
    url: `users/verify?returnKeys=true`,
    options: {
        method: "GET",
    },
    errorCode: ErrorCodes.USER_VERIFY_API_REQUEST_FAILURE,
});

/**
 * Generate API request details for user create request
 * @param  {UserKeys} keys Generated keys. Can either be a full key pair set of public/private keys, or a partial set with only a public key.
 * @return {RequestMeta}                Request object that can be passed to fetch() API
 */
const userCreate = (keys: UserKeys): RequestMeta => {
    const {publicKey, encryptedPrivateKey} = keys;

    const body = {
        userPublicKey: publicKeyToBase64(publicKey),
        userPrivateKey: fromByteArray(encryptedPrivateKey),
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
};

/**
 * Generate API request details for user create request
 * @param  {UserCreationKeys} keys Generated keys. Can either be a full key pair set of public/private keys, or a partial set with only public keys
 * @return {RequestMeta}                Request object that can be passed to fetch() API
 */
const userCreateWithDevice = (keys: UserCreationKeys): RequestMeta => {
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
};

/**
 * Add a new set of device/signing/transform keys to the user
 * @param {string}       jwtToken      Users JWT token
 * @param {PublicKey}    userPublicKey Users master public key
 * @param {TransformKey} transformKey  Device transform key
 * @param {Uint8Array}   signature     Signature for device add request
 * @param {number}       timestamp     Timestamp of signature generation
 * @return {RequestMeta}
 */
const userDeviceAdd = (userPublicKey: PublicKey<Uint8Array>, transformKey: TransformKey, signature: Uint8Array, timestamp: number): RequestMeta => ({
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
});

/**
 * Delete the users current device that is being used to make this request.
 */
const deleteCurrentDevice = (userID: string): RequestMeta => ({
    url: `users/${encodeURIComponent(userID)}/devices/current`,
    options: {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    },
    errorCode: ErrorCodes.USER_DEVICE_DELETE_REQUEST_FAILURE,
});

/**
 * Update a users status and/or their escrowed private key.
 * @param {string}                 userID         ID of user to update
 * @param {PrivateKey<Uint8Array>} userPrivateKey Users encrypted private key to escrow
 * @param {number}                 status         Updated status of user
 */
const userUpdate = (userID: string, userPrivateKey?: PrivateKey<Uint8Array>, status?: number): RequestMeta => ({
    url: `users/${encodeURIComponent(userID)}`,
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
});

/**
 * Generate API request details for user key list request
 * @param {string[]}         userList List of user IDs to retrieve
 */
const userKeyList = (userList: string[]): RequestMeta => ({
    url: `users?id=${encodeURIComponent(userList.join(","))}`,
    options: {
        method: "GET",
    },
    errorCode: ErrorCodes.USER_KEY_LIST_REQUEST_FAILURE,
});

export default {
    /**
     * Invoke user verify API and maps result to determine if we got back a user or not
     * @param {string} jwt JWT token to pass to verify API
     */
    callUserVerifyApi(jwt: string): Future<SDKError, UserVerifyProcessedResult> {
        const {url, options, errorCode} = verify();
        return makeJwtApiRequest<UserVerifyResponseType>(url, errorCode, options, jwt).map((data) => ({
            user: data || undefined,
            jwt,
        }));
    },

    /**
     * Invoke user create API with jwt and users keys
     */
    callUserCreateApi(jwt: string, keys: UserKeys): Future<SDKError, UserCreateResponseType> {
        const {url, options, errorCode} = userCreate(keys);
        return makeJwtApiRequest<UserCreateResponseType>(url, errorCode, options, jwt);
    },

    /**
     * Invoke user create API with jwt and users keys (including a device key set)
     */
    callUserCreateApiWithDevice(jwt: string, creationKeys: UserCreationKeys): Future<SDKError, UserCreateResponseType> {
        const {url, options, errorCode} = userCreateWithDevice(creationKeys);
        return makeJwtApiRequest<UserCreateResponseType>(url, errorCode, options, jwt);
    },

    /**
     * Invoke user update API to either update a users escrowed, encrypted private key and/or update their status.
     * @param {PrivateKey<Uint8Array>} userPrivateKey Encrypted private key to update in escrow
     * @param {number}                 status         Updated status to set for user
     */
    callUserUpdateApi(userPrivateKey?: PrivateKey<Uint8Array>, status?: number): Future<SDKError, UserUpdateResponseType> {
        const {id} = ApiState.user();
        const {url, options, errorCode} = userUpdate(id, userPrivateKey, status);
        return makeAuthorizedApiRequest(url, errorCode, options);
    },

    /**
     * Invoke the user device add API with the provided device/signing/transform keys
     * @param {string}       jwtToken      Users authorized JWT token
     * @param {PublicKey}    userPublicKey Users master public key
     * @param {TransformKey} transformKey  Transform key from user master key to device key
     * @param {Uint8Array}   signature     Calculated signature to validate request
     * @param {number}       timestamp     Timestamp of signature generation
     */
    callUserDeviceAdd(
        jwtToken: string,
        userPublicKey: PublicKey<Uint8Array>,
        transformKey: TransformKey,
        signature: Uint8Array,
        timestamp: number
    ): Future<SDKError, UserUpdateResponseType> {
        const {url, options, errorCode} = userDeviceAdd(userPublicKey, transformKey, signature, timestamp);
        return makeJwtApiRequest(url, errorCode, options, jwtToken);
    },

    /**
     * Delete the current users device to deauthorize this browser instance.
     */
    callUserCurrentDeviceDelete(): Future<SDKError, {id: number}> {
        const {id} = ApiState.user();
        const {url, options, errorCode} = deleteCurrentDevice(id);
        return makeAuthorizedApiRequest(url, errorCode, options);
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
        return makeAuthorizedApiRequest(url, errorCode, options);
    },
};

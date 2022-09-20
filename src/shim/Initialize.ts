import Future from "futurejs";
import {DeviceKeys, SDKInitializationResult, UserCreateResponse} from "ironweb";
import {ErrorCodes} from "../Constants";
import {
    CreateDetachedUserDeviceRequest,
    CreateDetachedUserDeviceResponse,
    CreateUserAndDeviceRequest,
    CreateUserRequest,
    CreateUserResponse,
    GenerateNewDeviceKeysRequest,
    InitApiPasscodeResponse,
    InitApiRequest,
    InitApiSdkResponse,
} from "../FrameMessageTypes";
import SDKError from "../lib/SDKError";
import * as FrameMediator from "./FrameMediator";
import {getParentWindowSymmetricKey, setSDKInitialized, storeParentWindowSymmetricKey} from "./ShimUtils";

//Store reference to the JWT callback in case we need to invoke it again to create user
let userJWTCallback: JWTCallbackToPromise;

/**
 * Retrieve the users JWT token and validate the result
 * @param  {CallbackToPromise} jwtCallback Method that can be used to retrieve the JWT
 */
export function getJWT(jwtCallback: JWTCallbackToPromise): Future<Error, string> {
    return Future.tryP(() => {
        const jwtPromise = jwtCallback();
        if (jwtPromise && typeof jwtPromise.then === "function") {
            return jwtPromise;
        }
        throw new SDKError(new Error("JWT callback did not return a Promise."), ErrorCodes.JWT_FORMAT_FAILURE);
    }).flatMap((jwt: string) => {
        if (typeof jwt === "string" && jwt.length > 0) {
            return Future.of(jwt);
        }
        return Future.reject(new SDKError(new Error(`JWT should be a non-zero length string, but instead got '${jwt}'`), ErrorCodes.JWT_RETRIEVAL_FAILURE));
    });
}

/**
 * Invoke the users passcode callback method. Verifies that we got what looks to be a Promise back from the callback and also verifies that when it resolves
 * we got a non-zero length string as the passcode.
 * @param {PasscodeCallbackToPromise} passcodeCallback User provided passcode callback
 * @param {boolean}                   doesUserExist    Whether the user exists within the IronCore system and we're going to do a new user create or we're adding a new device
 */
function invokePasscodeCallback(passcodeCallback: PasscodeCallbackToPromise, doesUserExist: boolean) {
    return Future.tryP(() => {
        const passcodePromise = passcodeCallback(doesUserExist);
        if (passcodePromise && typeof passcodePromise.then === "function") {
            return passcodePromise;
        }
        throw new SDKError(new Error("Passcode callback did not return a Promise."), ErrorCodes.PASSCODE_FORMAT_FAILURE);
    }).flatMap((passcode: string) => {
        if (typeof passcode === "string" && passcode.length > 0) {
            return Future.of(passcode);
        }
        return Future.reject(
            new SDKError(
                new Error(`User provided passcode should be a non-zero length string, but instead got '${passcode}'`),
                ErrorCodes.PASSCODE_RETRIEVAL_FAILURE
            )
        );
    });
}

/**
 * Handle users passcode entry and either create them as new user or add a new set of device keys for them
 * @param  {boolean} doesUserExist Denotes whether we need to create or update this user
 * @param  {string}  passcode      Users passcode entry
 */
function setUserPasscode(doesUserExist: boolean, passcode: string): Future<Error, SDKInitializationResult> {
    return getJWT(userJWTCallback)
        .flatMap((jwtToken) => {
            const payload = {
                type: doesUserExist ? "GEN_DEVICE_KEYS" : "CREATE_USER_AND_DEVICE",
                message: {passcode, jwtToken},
            };
            return FrameMediator.sendMessage<InitApiSdkResponse>(payload as GenerateNewDeviceKeysRequest | CreateUserAndDeviceRequest);
        })
        .map((sdkResponse: InitApiSdkResponse) => {
            storeParentWindowSymmetricKey(sdkResponse.message.symmetricKey);
            setSDKInitialized();
            return {user: sdkResponse.message.user, groupsNeedingRotation: sdkResponse.message.groupsNeedingRotation};
        });
}

/**
 * Create a new user using a JWT callback. Returns the created user's info if successful.
 */
export const createNewUser = (jwtCallback: JWTCallbackToPromise, passcode: string, needsRotation = false): Promise<UserCreateResponse> =>
    getJWT(jwtCallback)
        .flatMap((jwtToken) => {
            const payload: CreateUserRequest = {type: "CREATE_USER", message: {passcode, jwtToken, needsRotation}};
            return FrameMediator.sendMessage<CreateUserResponse>(payload);
        })
        //Rename a few fields and strip out the users private key and currentKeyId since they'll probably be confusing that they're getting back an encrypted private key
        //eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({message: {id, segmentId, needsRotation, status, userMasterPublicKey}}) => ({
            accountID: id,
            segmentID: segmentId,
            needsRotation,
            status,
            userMasterPublicKey,
        }))
        .toPromise();

/**
 * Create a set of device keys that aren't stored in the browser and are returned to the caller.
 */
export const createUserDeviceKeys = (jwtCallback: JWTCallbackToPromise, passcode: string): Promise<DeviceKeys> =>
    getJWT(jwtCallback)
        .flatMap((jwtToken) => {
            const payload: CreateDetachedUserDeviceRequest = {type: "CREATE_DETATCHED_USER_DEVICE", message: {passcode, jwtToken}};
            return FrameMediator.sendMessage<CreateDetachedUserDeviceResponse>(payload);
        })
        .map(({message}) => message)
        .toPromise();

/**
 * Initialize the API by getting a JWT and verifying the user. Returns either the SDK if the user has their set of
 * device keys, or returns asking for passcode if user needs to be created/updated.
 * @param {JWTCallbackToPromise}      jwtCallback      Method that can be used to retrieve the JWT
 * @param {PasscodeCallbackToPromise} passcodeCallback Method that can be used to get the users escrow passcode
 */
export function initialize(jwtCallback: JWTCallbackToPromise, passcodeCallback: PasscodeCallbackToPromise): Promise<SDKInitializationResult> {
    userJWTCallback = jwtCallback;
    return getJWT(jwtCallback)
        .flatMap((jwtToken) => {
            const payload: InitApiRequest = {
                type: "INIT_SDK",
                message: {
                    jwtToken,
                    symmetricKey: getParentWindowSymmetricKey(),
                },
            };
            return FrameMediator.sendMessage<InitApiPasscodeResponse | InitApiSdkResponse>(payload);
        })
        .flatMap((responsePayload) => {
            if (responsePayload.type === "INIT_PASSCODE_REQUIRED") {
                return invokePasscodeCallback(passcodeCallback, responsePayload.message.doesUserExist).flatMap((passcode: string) =>
                    setUserPasscode(responsePayload.message.doesUserExist, passcode)
                );
            }
            storeParentWindowSymmetricKey(responsePayload.message.symmetricKey);
            setSDKInitialized();
            return Future.of<SDKInitializationResult>({
                user: responsePayload.message.user,
                groupsNeedingRotation: responsePayload.message.groupsNeedingRotation,
            });
        })
        .toPromise();
}

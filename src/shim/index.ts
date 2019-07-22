import * as Init from "./Initialize";
import {SDKInitializationResult, UserCreateResponse} from "../../ironweb";
import {ErrorCode} from "../Constants";
import {checkSDKInitialized} from "./ShimUtils";
import SDKError from "../lib/SDKError";

/**
 * Checks bowser functionality to ensure random number generation is supported.
 */
function supportsRandomNumGen() {
    const nativeCrypto: Crypto = window.msCrypto || window.crypto;
    return typeof nativeCrypto === "object" && typeof nativeCrypto.getRandomValues === "function";
}

export const createNewUser = (jwtCallback: JWTCallbackToPromise, passcode: string): Promise<UserCreateResponse> => {
    if (!jwtCallback || typeof jwtCallback !== "function") {
        throw new Error("You must provide a function which will generate a JWT as the first parameter to 'IronWeb.initialize'.");
    }
    // TODO: find out if this is neccessary for user keygen. Assuming it is.
    if (!supportsRandomNumGen()) {
        return Promise.reject(
            new SDKError(new Error("Request failed due to a lack of browser support for random number generation."), ErrorCode.RANDOM_NUMBER_GENERATION_FAILURE)
        );
    }
    return Init.createNewUser(jwtCallback, passcode);
};

/**
 * Initialize IronWeb SDK with JWT and Passcode callbacks. This will request the verify API (using the JWT token retrieved from the provided JWT callback) to check if
 * the user exists or not. The Promise this returns will be resolved with the IronWeb SDK object.
 * @param {JWTCallbackToPromise}      jwtCallback      Callback which when invoked will return a Promise which will resolve with a valid JWT token
 * @param {PasscodeCallbackToPromise} passcodeCallback Callback which when invoked will return a Promise which will resolve with the users passcode. Will only be invoked if we need the users passcode as part of initialization.
 */
export function initialize(jwtCallback: JWTCallbackToPromise, passcodeCallback: PasscodeCallbackToPromise): Promise<SDKInitializationResult> {
    if (!jwtCallback || typeof jwtCallback !== "function") {
        throw new Error("You must provide a function which will generate a JWT as the first parameter to 'IronWeb.initialize'.");
    }
    if (!passcodeCallback || typeof passcodeCallback !== "function") {
        throw new Error("You must provide a function which will generate the users escrow passcode as the second parameter to 'IronWeb.initialize'.");
    }
    if (!supportsRandomNumGen()) {
        return Promise.reject(
            new SDKError(new Error("Request failed due to a lack of browser support for random number generation."), ErrorCode.RANDOM_NUMBER_GENERATION_FAILURE)
        );
    }
    return Init.initialize(jwtCallback, passcodeCallback);
}

/**
 * Method to determine if the SDK has been initialized and the user/document/group methods are able to be invoked
 */
export function isInitialized() {
    try {
        checkSDKInitialized();
        return true;
    } catch (_) {
        return false;
    }
}

/*
 * Export all SDK methods at the top level
 */
export * from "./SDK";

/**
 * List of SDK Error Codes
 */
export {ErrorCode} from "../Constants";

/**
 * SDK Error which extends normal Error object but adds `code` property which will be one of the ErrorCode from above
 */
export {default as SDKError} from "../lib/SDKError";

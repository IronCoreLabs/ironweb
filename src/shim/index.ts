import {SDKInitializationResult, UserCreateResponse, UserCreateOptions, DeviceAddResponse} from "../../ironweb";
import {ErrorCodes} from "../Constants";
import SDKError from "../lib/SDKError";
import * as Init from "./Initialize";
import {checkSDKInitialized} from "./ShimUtils";

/**
 * Checks bowser functionality to ensure random number generation is supported.
 */
function supportsRandomNumGen() {
    const nativeCrypto: Crypto = window.msCrypto || window.crypto;
    return typeof nativeCrypto === "object" && typeof nativeCrypto.getRandomValues === "function";
}

/**
 * Determine if this browser supports WebAssembly so we know which Recrypt module to load.
 */
function isWebAssemblySupported() {
    return typeof WebAssembly === "object" && WebAssembly && typeof WebAssembly.instantiate === "function";
}

/**
 * Failed Promise for when the users browser doesn't support WebAssembly (IE11 or lower)
 */
const webAssemblyFailure = () =>
    Promise.reject(new SDKError(new Error("Request failed due to a lack of browser support for WebAssembly."), ErrorCodes.WEBASSEMBLY_SUPPORT_FAILURE));

/**
 * Failed Promise for when the users browser can't generate random numbers
 */
const randomGenFailure = () =>
    Promise.reject(
        new SDKError(new Error("Request failed due to a lack of browser support for random number generation."), ErrorCodes.RANDOM_NUMBER_GENERATION_FAILURE)
    );

/**
 * Create a new user from the given JWT callback and passcode. Doesn't create any devices for the new user, and doesn't initialize the SDK.
 * @param {UserCreateOptions}
 */
export function createNewUser(
    jwtCallback: JWTCallbackToPromise,
    passcode: string,
    options: UserCreateOptions = {needsRotation: false}
): Promise<UserCreateResponse> {
    if (!jwtCallback || typeof jwtCallback !== "function") {
        throw new Error("You must provide a function which will generate a JWT as the first parameter to 'IronWeb.createNewUser'.");
    }
    if (!supportsRandomNumGen()) {
        return randomGenFailure();
    }
    if (!isWebAssemblySupported()) {
        return webAssemblyFailure();
    }
    return Init.createNewUser(jwtCallback, passcode, options.needsRotation || false);
}

/**
 * Create a detached set of device keys for an existing user. These keys will not be stored in the browser and will just be returned
 * to the caller to use however they would like.
 */
export function createNewDeviceKeys(jwtCallback: JWTCallbackToPromise, passcode: string): Promise<DeviceAddResponse> {
    if (!jwtCallback || typeof jwtCallback !== "function") {
        throw new Error("You must provide a function which will generate a JWT as the first parameter to 'IronWeb.createNewUser'.");
    }
    if (!supportsRandomNumGen()) {
        return randomGenFailure();
    }
    if (!isWebAssemblySupported()) {
        return webAssemblyFailure();
    }
    return Init.createUserDeviceKeys(jwtCallback, passcode);
}

/**
 * Initialize IronWeb SDK with JWT and Passcode callbacks. This will request the verify API (using the JWT token retrieved from the provided JWT callback) to check if
 * the user exists or not. The Promise this returns will be resolved with the IronWeb SDK object.
 */
export function initialize(jwtCallback: JWTCallbackToPromise, passcodeCallback: PasscodeCallbackToPromise): Promise<SDKInitializationResult> {
    if (!jwtCallback || typeof jwtCallback !== "function") {
        throw new Error("You must provide a function which will generate a JWT as the first parameter to 'IronWeb.initialize'.");
    }
    if (!passcodeCallback || typeof passcodeCallback !== "function") {
        throw new Error("You must provide a function which will generate the users escrow passcode as the second parameter to 'IronWeb.initialize'.");
    }
    if (!supportsRandomNumGen()) {
        return randomGenFailure();
    }
    if (!isWebAssemblySupported()) {
        return webAssemblyFailure();
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
/**
 * List of SDK Error Codes
 */
export {ErrorCodes} from "../Constants";
/**
 * SDK Error which extends normal Error object but adds `code` property which will be one of the ErrorCodes from above
 */
export {default as SDKError} from "../lib/SDKError";
export * from "./SDK";

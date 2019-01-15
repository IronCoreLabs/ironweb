import {CryptoConstants} from "../Constants";

/**
 * Type guard to differentiate between base Errors and SDKErrors. Check if we have a numerical code on the error and that it
 * isn't a generic "OperationError" which already contains codes
 */
function isSDKError(error: SDKError | Error): error is SDKError {
    return typeof (error as SDKError).code === "number" && error.name !== CryptoConstants.NATIVE_DECRYPT_FAILURE_ERROR;
}

/**
 * Custom error class which adds error codes onto normal JS Error objects so we can communicate specific SDK errors out
 * to consumers of the SDK.
 */
export default class SDKError extends Error {
    readonly code: number;
    readonly rawError: Error;

    constructor(error: Error | SDKError, code: number) {
        super(error.message);
        //If we get an SDK error as part of this constructor, then just keep the original error/code and don't overwrite
        if (isSDKError(error)) {
            this.code = error.code;
            this.rawError = error.rawError;
        } else {
            this.code = code;
            this.rawError = error;
        }
        //Fix error inheritence: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, SDKError.prototype);
    }
}

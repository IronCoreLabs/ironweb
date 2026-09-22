/**
 * Custom error class which adds error codes onto normal JS Error objects so we can communicate specific SDK errors out
 * to consumers of the SDK.
 */
export default class SDKError extends Error {
    readonly code: number;
    readonly rawError: Error;

    constructor(error: Error | SDKError, code: number) {
        super(error.message);
        //If we get an SDK error as part of this constructor, then just keep the original error/code and don't overwrite.
        //Don't duck-type on a numeric `code` here: WebCrypto rejects with DOMExceptions, which carry an unrelated
        //legacy numeric `code` that would otherwise be mistaken for one of ours.
        if (error instanceof SDKError) {
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

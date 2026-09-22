import SDKError from "../SDKError";
import {CryptoConstants, ErrorCodes} from "../../Constants";

describe("SDKError", () => {
    describe("constructor", () => {
        it("applies the provided code to a plain Error", () => {
            const rawError = new Error("nope");
            const error = new SDKError(rawError, ErrorCodes.DOCUMENT_DECRYPT_FAILURE);

            expect(error.code).toEqual(ErrorCodes.DOCUMENT_DECRYPT_FAILURE);
            expect(error.rawError).toEqual(rawError);
            expect(error.message).toEqual("nope");
        });

        it("keeps the original code when re-wrapping an SDKError", () => {
            const rawError = new Error("nope");
            const inner = new SDKError(rawError, ErrorCodes.USER_PASSCODE_INCORRECT);
            const outer = new SDKError(inner, ErrorCodes.DOCUMENT_DECRYPT_FAILURE);

            expect(outer.code).toEqual(ErrorCodes.USER_PASSCODE_INCORRECT);
            expect(outer.rawError).toEqual(rawError);
        });

        //Every DOMException carries a legacy numeric `code` (0 for DataError, 15 for InvalidAccessError), which is
        //not an ErrorCodes value — those start at 100. WebCrypto rejects with these directly now that the AES
        //polyfill fallbacks are gone.
        it("applies the provided code to a DOMException rather than its legacy numeric code", () => {
            const rawError = new DOMException("", "DataError");
            const error = new SDKError(rawError, ErrorCodes.DOCUMENT_DECRYPT_FAILURE);

            expect(error.code).toEqual(ErrorCodes.DOCUMENT_DECRYPT_FAILURE);
            expect(error.rawError).toEqual(rawError);
        });

        it("applies the provided code to an OperationError DOMException", () => {
            const rawError = new DOMException("", CryptoConstants.NATIVE_DECRYPT_FAILURE_ERROR);
            const error = new SDKError(rawError, ErrorCodes.USER_DEVICE_KEY_DECRYPTION_FAILURE);

            expect(error.code).toEqual(ErrorCodes.USER_DEVICE_KEY_DECRYPTION_FAILURE);
            expect(error.rawError).toEqual(rawError);
        });

        it("applies the provided code to a non-SDKError that happens to have a numeric code", () => {
            const rawError = Object.assign(new Error("nope"), {code: 15});
            const error = new SDKError(rawError, ErrorCodes.DOCUMENT_DECRYPT_FAILURE);

            expect(error.code).toEqual(ErrorCodes.DOCUMENT_DECRYPT_FAILURE);
            expect(error.rawError).toEqual(rawError);
        });
    });
});

import {ErrorCodes} from "../../Constants";
import * as ApiRequest from "../ApiRequest";
import ApiState from "../ApiState";
import Future from "futurejs";
import {SDKError} from "../../shim";

interface EncryptedDekTransformResponse {
    encryptedSymmetricKey: TransformedEncryptedMessage;
}

/**
 * Generate signature message from current user state
 */
function getSignatureHeader() {
    const {segmentId, id} = ApiState.user();
    return ApiRequest.getRequestSignature(segmentId, id, ApiState.signingKeys());
}

/**
 * Transform one of the edeks for the logged in user.
 * @param {Uint8Array} edeks The encrypted deks to send.
 */
function encryptedDekTransform(protoBytes: Uint8Array) {
    return {
        url: `edeks/transform`,
        options: {
            method: "POST",
            body: protoBytes,
        },
        errorCode: ErrorCodes.DOCUMENT_TRANSFORM_REQUEST_FAILURE,
    };
}

export default {
    /**
     * Invokes the Encrypted DEK transform API
     * @param {Uint8Array}  edeks  The edeks to send to the server. A transformed one will be returned assuming the logged in user has access.
     */
    callEncryptedDekTransformApi(encryptedDeks: Uint8Array): Future<SDKError, EncryptedDekTransformResponse> {
        const {url, options, errorCode} = encryptedDekTransform(encryptedDeks);
        return ApiRequest.fetchJSON(url, errorCode, options, getSignatureHeader());
    },
};

import Future from "futurejs";
import {UserOrGroup} from "ironweb";
import {ErrorCodes} from "../../Constants";
import {SDKError} from "../../shim";
import {makeAuthorizedApiRequest} from "../ApiRequest";

interface EncryptedDekTransformResponse {
    encryptedSymmetricKey: TransformedEncryptedMessage;
    userOrGroup: UserOrGroup;
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
        return makeAuthorizedApiRequest(url, errorCode, options);
    },
};

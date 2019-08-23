import Future from "futurejs";
import SDKError from "../lib/SDKError";
import {ErrorCodes} from "../Constants";
import * as WMT from "../WorkerMessageTypes";
import * as WorkerMediator from "./WorkerMediator";

const SIGNATURE_VERSION = 1;
//The identity API will be on the same domain as where the frame is hosted so we can just use relative URLs
const IRONCORE_ID_API_BASE_URL = "/api/1/";
const CLOUDFLARE_RATE_LIMIT_STATUS_CODE = 429; //support.cloudflare.com/hc/en-us/articles/115001635128-Configuring-Rate-Limiting-in-the-Cloudflare-Dashboard#basic

type ApiErrorList = {
    message: string;
    code: number;
}[];

/**
 * Attempt to parse the first error from the response JSON and convert it into an SDK error with the useful API message and
 * the proper error code for this request.
 * @param {Response} response         API response object from fetch operation
 * @param {number}   failureErrorCode Error code to use when building up SDK Error object
 */
function parseErrorFromFailedResponse(failureResponse: Response, failureErrorCode: number) {
    return Future.tryP(() => failureResponse.json())
        .errorMap(() => new SDKError(new Error(failureResponse.statusText), failureErrorCode))
        .flatMap((errorList: ApiErrorList) => {
            const errorString = errorList && errorList.length > 0 ? errorList[0].message : failureResponse.statusText;
            return Future.reject(new SDKError(new Error(errorString), failureErrorCode));
        });
}

/**
 * Since our ed25519 signing logic is built in within the WASM library, we need to make an async request to generate the signature
 * for all of our requests that we make. This method takes the details necessary to create that signature and requests into our WebWorker
 * to sign the package and return a signature. It then converts that signature into the Authoriazation header string that is required
 * within the ironcore-id API.
 */
export function getRequestSignature(segmentID: number, userID: string, signingKeys: SigningKeyPair) {
    const payload: WMT.SignatureGenerationWorkerRequest = {
        type: "SIGNATURE_GENERATION",
        message: {segmentID, userID, signingKeys, signatureVersion: SIGNATURE_VERSION},
    };

    return WorkerMediator.sendMessage<WMT.SignatureGenerationWorkerResponse>(payload).map(
        ({message}) => `IronCore ${message.version}.${message.message}.${message.signature}`
    );
}

/**
 * Wrap fetch API to automatically decode JSON results before returning since when using the fetch API
 * the JSON parse is async.
 */
export function fetchJSON<ResponseType>(
    url: string,
    failureErrorCode: number,
    options: RequestInit,
    authorizationHeader: Future<Error, string>
): Future<SDKError, ResponseType> {
    return authorizationHeader
        .flatMap((authHeader) => {
            const contentType = options.body instanceof Uint8Array ? "application/octet-stream" : "application/json";
            //Once we have the auth header, add it into the options headers field
            options.headers = {...options.headers, Authorization: authHeader, "Content-Type": contentType};
            return Future.tryP(() => fetch(`${IRONCORE_ID_API_BASE_URL}${url}`, options));
        })
        .errorMap((error) => new SDKError(error, failureErrorCode))
        .flatMap((response: Response) => {
            if (response.ok) {
                if (response.status === 204) {
                    return Future.of(undefined);
                }
                return Future.tryP(() => response.json()).errorMap(
                    () => new SDKError(new Error("Failed to parse successful response JSON."), failureErrorCode)
                );
            }
            if (response.status === CLOUDFLARE_RATE_LIMIT_STATUS_CODE) {
                //Map a Cloudflare rate limit response code to a special error code
                return Future.reject(new SDKError(new Error("Request was rate limited from too many requests."), ErrorCodes.REQUEST_RATE_LIMITED));
            }
            return parseErrorFromFailedResponse(response, failureErrorCode);
        });
}

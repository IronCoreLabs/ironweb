import * as DocumentOperations from "./DocumentOperations";
import ApiState from "../ApiState";
import Future from "futurejs";
import {documentToByteParts} from "../FrameUtils";
import SDKError from "../../lib/SDKError";
import {ErrorCodes} from "../../Constants";
import EncryptedDekEndpoints from "../endpoints/EncryptedDekEndpoints";

interface DecryptedUnmanagedDocumentResponse {
    data: Uint8Array;
}
/**
 * Retrieves sharing/meta information for the provided document ID. Then decrypts the provided data using the current users key and returns formatted doc structure.
 * @param {string}     documentID        Unique lookup key of document to decrypt
 * @param {Uint8Array} encryptedDocument Data of document to decrypt
 */
export function decryptLocalDoc(edeks: Uint8Array, encryptedDocument: Uint8Array): Future<SDKError, DecryptedUnmanagedDocumentResponse> {
    //Early verification to check that the bytes we got appear to be an IronCore encrypted document. We have two versions so reject early if the bytes provided
    //don't match either of those two versions.
    if (encryptedDocument[0] !== 1 && encryptedDocument[0] !== 2) {
        return Future.reject(
            new SDKError(new Error("Provided encrypted document doesn't appear to be valid. Invalid version."), ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE)
        );
    }
    const documentParts = documentToByteParts(encryptedDocument);
    return EncryptedDekEndpoints.callEncryptedDekTransformApi(edeks).flatMap((transformResponse) => {
        const {privateKey} = ApiState.deviceKeys();
        return DocumentOperations.decryptDocument(documentParts, transformResponse.encryptedSymmetricKey, privateKey).map((decryptedDocument) => ({
            data: decryptedDocument,
        }));
    });
}

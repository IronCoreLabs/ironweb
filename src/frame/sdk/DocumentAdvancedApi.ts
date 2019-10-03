import * as DocumentOperations from "./DocumentOperations";
import ApiState from "../ApiState";
import Future from "futurejs";
import {documentToByteParts, combineDocumentParts} from "../FrameUtils";
import SDKError from "../../lib/SDKError";
import {ErrorCodes} from "../../Constants";
import EncryptedDekEndpoints from "../endpoints/EncryptedDekEndpoints";
import {UserOrGroup, Policy} from "ironweb";
import {getKeyListsForUsersAndGroups} from "./DocumentApi";
import * as Protobuf from "../protobuf/index";

interface UnmanagedDecryptResult {
    data: Uint8Array;
    accessVia: UserOrGroup;
}

/**
 * Sends the edeks to the server for transform. Then decrypts the provided data using the current user's key and returns formatted doc structure.
 * @param {Uint8Array} encryptedDocument Data of document to decrypt
 * @param {Uint8Array} edeks             The edeks to use to do the decryption.
 */
export function decryptWithProvidedEdeks(encryptedDocument: Uint8Array, edeks: Uint8Array): Future<SDKError, UnmanagedDecryptResult> {
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
            accessVia: transformResponse.userOrGroup,
        }));
    });
}

/**
 * COLT:
 */
export function encrypt(documentID: string, document: Uint8Array, userGrants: string[], groupGrants: string[], grantToAuthor: boolean, policy?: Policy) {
    return getKeyListsForUsersAndGroups(userGrants, groupGrants, grantToAuthor, policy)
        .flatMap(({userKeys, groupKeys}) => DocumentOperations.encryptNewDocumentToList(document, userKeys, groupKeys, ApiState.signingKeys()))
        .map(({userAccessKeys, groupAccessKeys, encryptedDocument}) => {
            return {
                edeks: Protobuf.encodeEdeks(ApiState.user().segmentId, documentID, userAccessKeys, groupAccessKeys),
                document: combineDocumentParts(documentID, ApiState.user().segmentId, encryptedDocument),
                documentID,
            };
        });
}

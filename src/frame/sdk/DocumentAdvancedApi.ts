import Future from "futurejs";
import {Policy, UserOrGroup} from "ironweb";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import ApiState from "../ApiState";
import EncryptedDekEndpoints from "../endpoints/EncryptedDekEndpoints";
import {combineDocumentParts, documentToByteParts} from "../FrameUtils";
import * as Protobuf from "../protobuf/index";
import {getKeyListsForUsersAndGroups} from "./DocumentApi";
import * as DocumentOperations from "./DocumentOperations";

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
 * Encrypt the provided document but return the EDEKs to the caller instead of storing them within ironcore-id. Only calls to ironcore-id in order to
 * get a list of public keys for the provided users, groups, or policies.
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

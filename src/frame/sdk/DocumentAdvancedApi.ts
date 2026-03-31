import Future from "futurejs";
import {Policy, UserOrGroup} from "ironweb";
import SDKError from "../../lib/SDKError";
import ApiState from "../ApiState";
import EncryptedDekEndpoints from "../endpoints/EncryptedDekEndpoints";
import {combineDocumentParts, documentToByteParts} from "../FrameUtils";
import * as Protobuf from "../protobuf/index";
import {getKeyListsForUsersAndGroups, startStreamEncrypt} from "./DocumentApi";
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
    return documentToByteParts(encryptedDocument).flatMap((documentParts) =>
        EncryptedDekEndpoints.callEncryptedDekTransformApi(edeks).flatMap((transformResponse) => {
            const {privateKey} = ApiState.deviceKeys();
            return DocumentOperations.decryptDocument(documentParts, transformResponse.encryptedSymmetricKey, privateKey).map((decryptedDocument) => ({
                data: decryptedDocument,
                accessVia: transformResponse.userOrGroup,
            }));
        })
    );
}

/**
 * Streaming decrypt with caller-provided EDEKs. Sends EDEKs to the server for transform, then pipes the
 * encrypted stream through the Worker for decryption. On auth tag failure, plaintextStream is aborted.
 */
export function decryptStreamWithProvidedEdeks(
    iv: Uint8Array,
    edeks: Uint8Array,
    encryptedStream: ReadableStream<Uint8Array>,
    plaintextStream: WritableStream<Uint8Array>
): Future<SDKError, {accessVia: UserOrGroup}> {
    return EncryptedDekEndpoints.callEncryptedDekTransformApi(edeks).flatMap((transformResponse) => {
        const {privateKey} = ApiState.deviceKeys();
        return DocumentOperations.decryptDocumentStream(transformResponse.encryptedSymmetricKey, privateKey, iv, encryptedStream, plaintextStream).map(() => ({
            accessVia: transformResponse.userOrGroup,
        }));
    });
}

/**
 * Encrypt the provided document but return the EDEKs to the caller instead of storing them within ironcore-id. Only calls to ironcore-id in order to
 * get a list of public keys for the provided users, groups, or policies.
 */
export function encryptWithProvidedEdeks(
    documentID: string,
    document: Uint8Array,
    userGrants: string[],
    groupGrants: string[],
    grantToAuthor: boolean,
    policy?: Policy
) {
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

/**
 * Streaming encrypt with caller-managed EDEKs. Writes header+IV, encrypts via Worker, returns EDEKs.
 */
export function encryptStreamWithEdeks(
    documentID: string,
    plaintextStream: ReadableStream<Uint8Array>,
    ciphertextStream: WritableStream<Uint8Array>,
    userGrants: string[],
    groupGrants: string[],
    grantToAuthor: boolean,
    policy?: Policy
) {
    return startStreamEncrypt(documentID, plaintextStream, ciphertextStream, userGrants, groupGrants, grantToAuthor, policy).map(
        ({userAccessKeys, groupAccessKeys}) => ({
            edeks: Protobuf.encodeEdeks(ApiState.user().segmentId, documentID, userAccessKeys, groupAccessKeys),
            documentID,
        })
    );
}

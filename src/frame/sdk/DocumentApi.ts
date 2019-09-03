import {
    DocumentIDNameResponse,
    DocumentMetaResponse,
    DocumentListResponse,
    DecryptedDocumentResponse,
    DocumentAccessResponse,
    UserOrGroup,
} from "../../../ironweb";
import * as DocumentOperations from "./DocumentOperations";
import DocumentApiEndpoints, {DocumentAccessResponseType, DocumentMetaGetResponseType} from "../endpoints/DocumentApiEndpoints";
import UserApiEndpoints, {UserKeyListResponseType} from "../endpoints/UserApiEndpoints";
import GroupApiEndpoints, {GroupListResponseType} from "../endpoints/GroupApiEndpoints";
import ApiState from "../ApiState";
import Future from "futurejs";
import * as Utils from "../../lib/Utils";
import {documentToByteParts, combineDocumentParts, encryptedDocumentToBase64} from "../FrameUtils";
import SDKError from "../../lib/SDKError";
import {UserAndGroupTypes, ErrorCodes} from "../../Constants";

/**
 * Get a list of user and group keys for the provided users and then also add in the current user to the list of user keys
 * @param {string[]} userGrants  List of users to get public keys for
 * @param {string[]} groupGrants List of groups to get public keys for
 * @param {boolean}  grantToAuthor If the logged in user should be included in the list of users to encrypt to.
 */
function getKeyListsForUsersAndGroups(
    userGrants: string[],
    groupGrants: string[],
    grantToAuthor: boolean
): Future<SDKError, {userKeys: UserKeyListResponseType; groupKeys: GroupListResponseType}> {
    return Future.gather2(UserApiEndpoints.callUserKeyListApi(userGrants), GroupApiEndpoints.callGroupKeyListApi(groupGrants)).flatMap(
        ([userKeys, groupKeys]) => {
            if (userKeys.result.length !== userGrants.length || groupKeys.result.length !== groupGrants.length) {
                //One of the user or groups in the list here doesn't exist. Fail the create call.
                const existingUserIDs = userKeys.result.map(({id}) => id);
                const existingGroupIDs = groupKeys.result.map(({id}) => id);
                const missingUsers = userGrants.filter((userID) => existingUserIDs.indexOf(userID) === -1).join(",");
                const missingGroups = groupGrants.filter((groupID) => existingGroupIDs.indexOf(groupID) === -1).join(",");
                return Future.reject(
                    new SDKError(
                        new Error(
                            `Failed to create document due to unknown users or groups in access list. Missing user IDs: [${missingUsers}]. Missing group IDs: [${missingGroups}]`
                        ),
                        ErrorCodes.DOCUMENT_CREATE_WITH_ACCESS_FAILURE
                    )
                );
            } else if (userKeys.result.length === 0 && groupKeys.result.length === 0 && !grantToAuthor) {
                return Future.reject(
                    new SDKError(
                        new Error(`Failed to create document due to no users or groups to share with.`),
                        ErrorCodes.DOCUMENT_CREATE_WITH_ACCESS_FAILURE
                    )
                );
            }
            //Add in the current user to the list of users iff we were told to grantToAuthor.
            const maybeCurrentUser = grantToAuthor ? [{id: ApiState.user().id, userMasterPublicKey: Utils.publicKeyToBase64(ApiState.userPublicKey())}] : [];
            return Future.of({
                userKeys: {result: [...userKeys.result, ...maybeCurrentUser]},
                groupKeys,
            });
        }
    );
}

/**
 * Take the result of listing a user/groups public keys and normalize them into a similar structure.
 * @param {UserKeyListResponseType} userKeys  List of user keys from user key list response
 * @param {GroupListResponseType}   groupKeys List of groups from group list response
 */
function normalizeUserAndGroupPublicKeyList(userKeys: UserKeyListResponseType, groupKeys: GroupListResponseType) {
    return [
        userKeys.result.map((user) => ({id: user.id, masterPublicKey: user.userMasterPublicKey})),
        groupKeys.result.map((group) => ({id: group.id, masterPublicKey: group.groupMasterPublicKey})),
    ];
}

/**
 * Common utility method used for both local and hosted docs to decrypt data and conver to the expected response format
 * @param {EncryptedDocument}           document         Document data to decrypt
 * @param {DocumentMetaGetResponseType} documentResponse Document key and metadata
 */
function decryptAndFormatDocument(document: EncryptedDocument, documentResponse: DocumentMetaGetResponseType): Future<SDKError, DecryptedDocumentResponse> {
    const {privateKey} = ApiState.deviceKeys();
    return DocumentOperations.decryptDocument(document, documentResponse.encryptedSymmetricKey, privateKey).map((decryptedDocument) => ({
        documentID: documentResponse.id,
        documentName: documentResponse.name,
        visibleTo: documentResponse.visibleTo,
        data: decryptedDocument,
        association: documentResponse.association.type,
        created: documentResponse.created,
        updated: documentResponse.updated,
    }));
}

/**
 * Take the list of requested access change entities, the list of successful and failed operations, and the type of entity we're dealing with. Then iterate over the list of requested
 * entities to filter out the ones that weren't found in either the success nor failed arrays. Then map that resulting list to an array of objects that represent a failed
 * operation.
 * @param {string[]} entityList     List of entity IDs (users or groups) that the user asked us to grant access to
 * @param {any}      successfulList List of successful operations from the grant access request
 * @param {any}      failureList    List of failed operations from the grant access request
 * @param {string}   type           Type of entity that we're working against.
 */
function missingEntitiesToFailures(
    entityList: string[],
    successfulList: {userOrGroup: UserOrGroup}[],
    failureList: {userOrGroup: UserOrGroup}[],
    type: "user" | "group"
) {
    const matches = (id: string, {userOrGroup}: {userOrGroup: UserOrGroup}) => userOrGroup.type === type && userOrGroup.id === id;

    return entityList
        .filter((id) => {
            const doesMatch = matches.bind(null, id);
            return !successfulList.some(doesMatch) && !failureList.some(doesMatch);
        })
        .map((id) => ({
            id,
            type,
            error: "ID did not exist in the system.",
        }));
}

/**
 * Convert list of successful and failed access changes into mapped result that we expose from the SDK.
 * @param {Array} succeededIDs List of successful access changes
 * @param {Array} failedIDs    List of failed access changes
 */
function accessResultToAccessResponse(
    succeededIDs: {userOrGroup: UserOrGroup}[],
    failedIDs: {userOrGroup: UserOrGroup; errorMessage: string}[]
): DocumentAccessResponse {
    return {
        succeeded: succeededIDs.map(({userOrGroup}) => ({
            id: userOrGroup.id,
            type: userOrGroup.type,
        })),
        failed: failedIDs.map(({userOrGroup, errorMessage}) => ({
            id: userOrGroup.id,
            type: userOrGroup.type,
            error: errorMessage,
        })),
    };
}

/**
 * Format access change response to build up a list of successful and failed access changes. Resulting lists will have both users and groups, discriminated via
 * the type field. All failures will also contain an error string as well as the ID and type.
 * @param {DocumentAccessResponseType} accessChangeResult   Result from document grant/revoke request API
 * @param {string[]}                   requestedUserAccess  List of user IDs the user requested to change access
 * @param {string[]}                   requestedGroupAccess List of groupIDs the user requested to change access
 */
function accessResponseToSDKResult(accessChangeResult: DocumentAccessResponseType, requestedUserAccess: string[], requestedGroupAccess: string[]) {
    const missingUsers = missingEntitiesToFailures(
        requestedUserAccess,
        accessChangeResult.succeededIds,
        accessChangeResult.failedIds,
        UserAndGroupTypes.USER as "user"
    );
    const missingGroups = missingEntitiesToFailures(
        requestedGroupAccess,
        accessChangeResult.succeededIds,
        accessChangeResult.failedIds,
        UserAndGroupTypes.GROUP as "group"
    );

    const mappedResults = accessResultToAccessResponse(accessChangeResult.succeededIds, accessChangeResult.failedIds);
    mappedResults.failed = mappedResults.failed.concat(missingUsers).concat(missingGroups);
    return mappedResults;
}

/**
 * Get a list of all documents that the current user has access to decrypt
 */
export function list(): Future<SDKError, DocumentListResponse> {
    return DocumentApiEndpoints.callDocumentListApi().map((documentList) => ({
        result: documentList.result.map(({id, name, association, created, updated}) => ({
            documentID: id,
            documentName: name,
            association: association.type,
            created,
            updated,
        })),
    }));
}

/**
 * Get the metadata for a specific document. Map the result names to match the SDK output.
 * @param {string} documentID ID of the document to retrieve
 */
export function getDocumentMeta(documentID: string): Future<SDKError, DocumentMetaResponse> {
    return DocumentApiEndpoints.callDocumentMetadataGetApi(documentID).map((docMeta) => ({
        documentID: docMeta.id,
        documentName: docMeta.name,
        association: docMeta.association.type,
        visibleTo: docMeta.visibleTo,
        created: docMeta.created,
        updated: docMeta.updated,
    }));
}

/**
 * Retrieve a document from the IronCore document store with the provided ID. Decrypt the data using the current users key and return formatted doc structure
 * @param {string} documentID Unique lookup key of document to retrieve
 */
export function decryptHostedDoc(documentID: string): Future<SDKError, DecryptedDocumentResponse> {
    return DocumentApiEndpoints.callDocumentGetApi(documentID).flatMap((documentResponse) => {
        return decryptAndFormatDocument(documentToByteParts(documentResponse.data.content), documentResponse);
    });
}

/**
 * Retrieves sharing/meta information for the provided document ID. Then decrypts the provided data using the current users key and returns formatted doc structure.
 * @param {string}     documentID        Unique lookup key of document to decrypt
 * @param {Uint8Array} encryptedDocument Data of document to decrypt
 */
export function decryptLocalDoc(documentID: string, encryptedDocument: Uint8Array): Future<SDKError, DecryptedDocumentResponse> {
    //Early verification to check that the bytes we got appear to be an IronCore encrypted document. We have two versions so reject early if the bytes provided
    //don't match either of those two versions.
    if (encryptedDocument[0] !== 1 && encryptedDocument[0] !== 2) {
        return Future.reject(
            new SDKError(new Error("Provided encrypted document doesn't appear to be valid. Invalid version."), ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE)
        );
    }
    const documentParts = documentToByteParts(encryptedDocument);
    return DocumentApiEndpoints.callDocumentMetadataGetApi(documentID).flatMap((documentResponse) => decryptAndFormatDocument(documentParts, documentResponse));
}

/**
 * Encrypt the provided document to the current user with the provided ID and store it within IronCores document store
 * @param {string}     documentID   Unique lookup key to use for document
 * @param {Uint8Array} document     Document data to store
 * @param {string}     documentName Optional name of the document
 * @param {string[]}   userGrants   List of user IDs to grant access
 * @param {string[]}   groupGrants  List of group IDs to grant access
 */
export function encryptToStore(
    documentID: string,
    document: Uint8Array,
    documentName: string,
    userGrants: string[],
    groupGrants: string[],
    grantToAuthor: boolean
): Future<SDKError, DocumentIDNameResponse> {
    return getKeyListsForUsersAndGroups(userGrants, groupGrants, grantToAuthor)
        .flatMap(({userKeys, groupKeys}) => {
            const [userPublicKeys, groupPublicKeys] = normalizeUserAndGroupPublicKeyList(userKeys, groupKeys);
            return DocumentOperations.encryptNewDocumentToList(document, userPublicKeys, groupPublicKeys, ApiState.signingKeys());
        })
        .flatMap(({userAccessKeys, groupAccessKeys, encryptedDocument}) => {
            return DocumentApiEndpoints.callDocumentCreateApi(
                documentID,
                encryptedDocumentToBase64(documentID, ApiState.user().segmentId, encryptedDocument),
                userAccessKeys,
                groupAccessKeys,
                documentName
            );
        })
        .map(({id, name, updated, created}) => ({documentID: id, documentName: name, updated, created}));
}

/**
 * Encrypt the provided document to the current user with the provided ID, store the sharing/meta info about the document, and return the encrypted document package.
 * @param {string}     documentID   Unique ID of document to create
 * @param {Uint8Array} document     Document content to encrypt
 * @param {string}     documentName Optional name of the document
 * @param {string[]}   userGrants   List of user IDs to grant access
 * @param {string[]}   groupGrants  List of group IDs to grant access
 */
export function encryptLocalDocument(
    documentID: string,
    document: Uint8Array,
    documentName: string,
    userGrants: string[],
    groupGrants: string[],
    grantToAuthor: boolean
) {
    return getKeyListsForUsersAndGroups(userGrants, groupGrants, grantToAuthor)
        .flatMap(({userKeys, groupKeys}) => {
            const [userPublicKeys, groupPublicKeys] = normalizeUserAndGroupPublicKeyList(userKeys, groupKeys);
            return DocumentOperations.encryptNewDocumentToList(document, userPublicKeys, groupPublicKeys, ApiState.signingKeys());
        })
        .flatMap(({userAccessKeys, groupAccessKeys, encryptedDocument}) => {
            return DocumentApiEndpoints.callDocumentCreateApi(documentID, null, userAccessKeys, groupAccessKeys, documentName).map((createdDocument) => ({
                createdDocument,
                encryptedDocument,
            }));
        })
        .map(({createdDocument, encryptedDocument}) => ({
            documentID: createdDocument.id,
            documentName: createdDocument.name,
            document: combineDocumentParts(documentID, ApiState.user().segmentId, encryptedDocument),
            created: createdDocument.created,
            updated: createdDocument.updated,
        }));
}

/**
 * Updates an existing document in the store. Looks up the current document in order to get nonce/symmetric key information, and then encrypts the new data
 * and submits it to the store.
 * @param {string}     documentID      User provided document key
 * @param {Uint8Array} newDocumentData Content of document
 */
export function updateToStore(documentID: string, newDocumentData: Uint8Array): Future<SDKError, DocumentIDNameResponse> {
    const {privateKey} = ApiState.deviceKeys();
    return DocumentApiEndpoints.callDocumentMetadataGetApi(documentID)
        .flatMap((documentResponse) => DocumentOperations.reEncryptDocument(newDocumentData, documentResponse.encryptedSymmetricKey, privateKey))
        .flatMap((newlyEncryptDocument) =>
            DocumentApiEndpoints.callDocumentUpdateApi(documentID, encryptedDocumentToBase64(documentID, ApiState.user().segmentId, newlyEncryptDocument))
        )
        .map(({id, name, created, updated}) => ({documentID: id, documentName: name, created, updated}));
}

/**
 * Update an existing local document given its ID and new data to save.
 * @param {string}     documentID      ID of document to update
 * @param {Uint8Array} newDocumentData New content to encrypt
 */
export function updateLocalDocument(documentID: string, newDocumentData: Uint8Array) {
    const {privateKey} = ApiState.deviceKeys();
    return DocumentApiEndpoints.callDocumentMetadataGetApi(documentID)
        .flatMap((documentResponse) => {
            return DocumentOperations.reEncryptDocument(newDocumentData, documentResponse.encryptedSymmetricKey, privateKey).map((updatedDoc) => ({
                updatedDoc,
                documentResponse,
            }));
        })
        .map(({updatedDoc, documentResponse}) => ({
            documentID: documentResponse.id,
            documentName: documentResponse.name,
            document: combineDocumentParts(documentID, ApiState.user().segmentId, updatedDoc),
            created: documentResponse.created,
            updated: documentResponse.updated,
        }));
}

/**
 * Update an existing documents name. Value passed can be null to cause name field to be cleared.
 * @param {string}      documentID ID of the document to update
 * @param {string|null} name       Value with which to update document name field
 */
export function updateName(documentID: string, name: string | null) {
    return DocumentApiEndpoints.callDocumentUpdateApi(documentID, undefined, name).map((updatedDocument) => ({
        documentID: updatedDocument.id,
        documentName: updatedDocument.name,
        created: updatedDocument.created,
        updated: updatedDocument.updated,
    }));
}

/**
 * Grant access to an existing document with the list of users and/or groups provided.
 * @param {string}   documentID  ID of document to grant access
 * @param {string[]} userGrants  List of user IDs to grant document access to
 * @param {string[]} groupGrants List of group IDs to grant document access to
 */
export function grantDocumentAccess(documentID: string, userGrants: string[], groupGrants: string[]): Future<SDKError, DocumentAccessResponse> {
    const {privateKey} = ApiState.deviceKeys();

    return Future.gather3(
        UserApiEndpoints.callUserKeyListApi(userGrants),
        GroupApiEndpoints.callGroupKeyListApi(groupGrants),
        DocumentApiEndpoints.callDocumentMetadataGetApi(documentID)
    ).flatMap(([userKeys, groupKeys, documentMetadata]) => {
        //If we didn't get back keys for either users or groups, bail early
        if (!userKeys.result.length && !groupKeys.result.length) {
            return Future.of(accessResponseToSDKResult({succeededIds: [], failedIds: []}, userGrants, groupGrants));
        }
        //Otherwise decrypt the document key and encrypt it to each user/group
        const [userPublicKeys, groupPublicKeys] = normalizeUserAndGroupPublicKeyList(userKeys, groupKeys);
        return DocumentOperations.encryptDocumentToKeys(
            documentMetadata.encryptedSymmetricKey,
            userPublicKeys,
            groupPublicKeys,
            privateKey,
            ApiState.signingKeys()
        )
            .flatMap((encryptedKeys) => DocumentApiEndpoints.callDocumentGrantApi(documentID, encryptedKeys.userAccessKeys, encryptedKeys.groupAccessKeys))
            .map((accessResult) => accessResponseToSDKResult(accessResult, userGrants, groupGrants));
    });
}

/**
 * Revoke access to a document for the provided list of users and groups.
 * @param {string}   documentID       ID of document to revoke access
 * @param {string[]} userRevocations  List of users to remove document access from
 * @param {string[]} groupRevocations List of groups to remove document access from
 */
export function revokeDocumentAccess(documentID: string, userRevocations: string[], groupRevocations: string[]) {
    return DocumentApiEndpoints.callDocumentRevokeApi(documentID, userRevocations, groupRevocations).map(({succeededIds, failedIds}) =>
        accessResultToAccessResponse(succeededIds, failedIds)
    );
}

import {DocumentAssociation, UserOrGroup} from "../../../ironweb";
import {ErrorCodes, UserAndGroupTypes} from "../../Constants";
import {publicKeyToBase64} from "../../lib/Utils";
import {makeAuthorizedApiRequest} from "../ApiRequest";
import ApiState from "../ApiState";

interface DocumentMetaApiResponse {
    id: string;
    name: string;
    association: {
        type: DocumentAssociation;
    };
    created: string;
    updated: string;
}

export interface DocumentListResponseType {
    result: DocumentMetaApiResponse[];
}
export interface DocumentMetaGetResponseType extends DocumentMetaApiResponse {
    visibleTo: {
        users: {id: string}[];
        groups: {id: string; name?: string}[];
    };
    encryptedSymmetricKey: TransformedEncryptedMessage;
}
export interface DocumentCreateResponseType {
    id: string;
    name: string;
    created: string;
    updated: string;
}
export type DocumentUpdateResponseType = DocumentMetaGetResponseType;
export interface DocumentAccessResponseType {
    succeededIds: {userOrGroup: UserOrGroup}[];
    failedIds: {userOrGroup: UserOrGroup; errorMessage: string}[];
}

interface DocumentCreatePayload {
    userAccessKeys: EncryptedAccessKey[];
    groupAccessKeys: EncryptedAccessKey[];
    documentName?: string;
    userID: string;
    userPublicKey: PublicKey<Uint8Array>;
}

/**
 * Convert list of encrypted document access keys into format expected for document granting API endpoint
 * @param {EncryptedAccessKey[]} accessKeys    List of encrypted document keys and group/user public keys and ID
 * @param {string}               accessKeyType Type of entity access. Either user or group constant.
 */
function accessKeyToApiFormat(accessKeys: EncryptedAccessKey[], accessKeyType: string) {
    return accessKeys.map((accessKey) => ({
        ...accessKey.encryptedPlaintext,
        userOrGroup: {
            type: accessKeyType,
            id: accessKey.id,
            masterPublicKey: accessKey.publicKey,
        },
    }));
}

/**
 * Get API request details for document list
 */
function documentList() {
    return {
        url: `documents`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.DOCUMENT_LIST_REQUEST_FAILURE,
    };
}

/**
 * Get a document's metadata
 */
function documentGet(documentID: string) {
    return {
        url: `documents/${encodeURIComponent(documentID)}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.DOCUMENT_GET_REQUEST_FAILURE,
    };
}

/**
 * Create a new document record
 */
function documentCreate(documentID: string, payload: DocumentCreatePayload) {
    const userGrantList = accessKeyToApiFormat(payload.userAccessKeys, UserAndGroupTypes.USER);
    const groupGrantList = accessKeyToApiFormat(payload.groupAccessKeys, UserAndGroupTypes.GROUP);
    return {
        url: `documents`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: documentID || undefined,
                value: {
                    name: payload.documentName || undefined,
                    fromUserId: payload.userID,
                    sharedWith: userGrantList.concat(groupGrantList),
                },
            }),
        },
        errorCode: ErrorCodes.DOCUMENT_CREATE_REQUEST_FAILURE,
    };
}

/**
 * Update an existing document's name. Pass null to clear it.
 */
function documentUpdate(documentID: string, name: string | null) {
    return {
        url: `documents/${encodeURIComponent(documentID)}`,
        options: {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({name}),
        },
        errorCode: ErrorCodes.DOCUMENT_UPDATE_REQUEST_FAILURE,
    };
}

/**
 * Grant access to a document with a list of other users and/or groups
 * @param {string}               documentID    ID of document to grant access to
 * @param {Uint8Array}           fromPublicKey Public key of user who is granting document access
 * @param {EncryptedAccessKey[]} userGrants    List of users to grant access to document
 * @param {EncryptedAccessKey[]} groupGrants   List of groups to grant access to document
 */
function documentGrant(documentID: string, fromPublicKey: PublicKey<Uint8Array>, userGrants: EncryptedAccessKey[], groupGrants: EncryptedAccessKey[]) {
    const userGrantList = accessKeyToApiFormat(userGrants, UserAndGroupTypes.USER);
    const groupGrantList = accessKeyToApiFormat(groupGrants, UserAndGroupTypes.GROUP);
    return {
        url: `documents/${encodeURIComponent(documentID)}/access`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fromPublicKey: publicKeyToBase64(fromPublicKey),
                to: userGrantList.concat(groupGrantList),
            }),
        },
        errorCode: ErrorCodes.DOCUMENT_GRANT_ACCESS_REQUEST_FAILURE,
    };
}

/**
 * Revoke access to a document from the provided list of users or groups.
 * @param {string}           documentID       ID of the document to revoke
 * @param {string[]}         userRevocations  List of user IDs from which to revoke document access
 * @param {string[]}         groupRevocations List of group IDs from which to revoke document access
 */
function documentRevoke(documentID: string, userRevocations: string[], groupRevocations: string[]) {
    const users = userRevocations.map((userID) => ({id: userID, type: UserAndGroupTypes.USER}));
    const groups = groupRevocations.map((groupID) => ({id: groupID, type: UserAndGroupTypes.GROUP}));

    return {
        url: `documents/${encodeURIComponent(documentID)}/access`,
        options: {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({userOrGroups: users.concat(groups)}),
        },
        errorCode: ErrorCodes.DOCUMENT_REVOKE_ACCESS_REQUEST_FAILURE,
    };
}

export default {
    /**
     * Invokes the document list API
     */
    callDocumentListApi() {
        const {url, options, errorCode} = documentList();
        return makeAuthorizedApiRequest<DocumentListResponseType>(url, errorCode, options);
    },

    /**
     * Invokes the document create API
     * @param {string}               documentID      Unique ID of document to store
     * @param {EncryptedAccessKey[]} userAccessKeys  List of users that are getting access to the newly created document
     * @param {EncryptedAccessKey[]} groupAccessKeys List of groups that are getting access to the newly created document
     * @param {string}               documentName    Unencrypted name to store with document
     */
    callDocumentCreateApi(documentID: string, userAccessKeys: EncryptedAccessKey[], groupAccessKeys: EncryptedAccessKey[], documentName?: string) {
        const {id} = ApiState.user();
        const {url, options, errorCode} = documentCreate(documentID, {
            userAccessKeys,
            groupAccessKeys,
            documentName,
            userID: id,
            userPublicKey: ApiState.userPublicKey(),
        });
        return makeAuthorizedApiRequest<DocumentCreateResponseType>(url, errorCode, options);
    },

    /**
     * Get document metadata. Returns all document info except for the data and IV fields
     * @param {string} documentID ID of the document to retrieve
     */
    callDocumentMetadataGetApi(documentID: string) {
        const {url, options, errorCode} = documentGet(documentID);
        return makeAuthorizedApiRequest<DocumentMetaGetResponseType>(url, errorCode, options);
    },

    /**
     * Call document update API to change the document name. Null clears the name field.
     */
    callDocumentUpdateApi(documentID: string, name: string | null) {
        const {url, options, errorCode} = documentUpdate(documentID, name);
        return makeAuthorizedApiRequest<DocumentUpdateResponseType>(url, errorCode, options);
    },

    /**
     * Grant access to a document with the list of users and/or groups provided
     * @param {string}               documentID     ID of the document to grant access
     * @param {EncryptedAccessKey[]} userAccessKeys  List of symmetric key IV and public key/encrypted symmetric key for each user access to grant
     * @param {EncryptedAccessKey[]} groupAccessKeys List of symmetric key IV and public key/encrypted symmetric key for each group access to grant
     */
    callDocumentGrantApi(documentID: string, userAccessKeys: EncryptedAccessKey[], groupAccessKeys: EncryptedAccessKey[]) {
        const {url, options, errorCode} = documentGrant(documentID, ApiState.userPublicKey(), userAccessKeys, groupAccessKeys);
        return makeAuthorizedApiRequest<DocumentAccessResponseType>(url, errorCode, options);
    },

    /**
     * Revoke access to a document given its ID from the provided list of user and/or group provided
     * @param {string}   documentID       ID of the document to revoke access
     * @param {string[]} userRevocations  List of user IDs to revoke document access from
     * @param {string[]} groupRevocations List of group IDs to revoke document access from
     */
    callDocumentRevokeApi(documentID: string, userRevocations: string[], groupRevocations: string[]) {
        const {url, options, errorCode} = documentRevoke(documentID, userRevocations, groupRevocations);
        return makeAuthorizedApiRequest<DocumentAccessResponseType>(url, errorCode, options);
    },
};

import {ErrorCodes, UserAndGroupTypes} from "../../Constants";
import {publicKeyToBase64} from "../../lib/Utils";
import * as ApiRequest from "../ApiRequest";
import ApiState from "../ApiState";
import {DocumentAssociation} from "../../../ironweb";

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
        users: Array<{id: string}>;
        groups: Array<{id: string; name?: string}>;
    };
    encryptedSymmetricKey: TransformedEncryptedMessage;
}
export interface DocumentGetResponseType extends DocumentMetaGetResponseType {
    data: {
        content: Base64String;
    };
}
export interface DocumentCreateResponseType {
    id: string;
    name: string;
    created: string;
    updated: string;
}
export type DocumentUpdateResponseType = DocumentGetResponseType;
export interface DocumentAccessResponseType {
    succeededIds: Array<{userOrGroup: UserOrGroup}>;
    failedIds: Array<{userOrGroup: UserOrGroup; errorMessage: string}>;
}

interface DocumentCreatePayload {
    document?: Base64String;
    userAccessKeys: EncryptedAccessKey[];
    groupAccessKeys: EncryptedAccessKey[];
    documentName?: string;
    userID: string;
    userPublicKey: PublicKey<Uint8Array>;
}

/**
 * Generate signature message from current user state
 */
function getSignatureHeader() {
    const {segmentId, id} = ApiState.user();
    return ApiRequest.getRequestSignature(segmentId, id, ApiState.signingKeys());
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
 * Get a specific document by ID
 * @param {MessageSignature} sign           Signature for request validation
 * @param {string}           documentID     ID of document
 * @param {boolean}          includeData    Whether to get content of document. If false only meta data of document will be returned.
 */
function documentGet(documentID: string, includeData: boolean = false) {
    return {
        url: `documents/${encodeURIComponent(documentID)}${includeData ? "?includeData=true" : ""}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.DOCUMENT_GET_REQUEST_FAILURE,
    };
}

/**
 * Create a new document
 * @param {string}                        documentID    ID to use for document
 * @param {EncryptedDocument<Uint8Array>} document      Encrypted document to save
 * @param {EncryptedSymmetricKey}         symmetricKey  Encrypted symmetric key to save with document
 * @param {string|undefined}              documentName  Optional name of document to save
 * @param {Uint8Array}                    userPublicKey Public key to use as document author
 */
function documentCreate(documentID: string, payload: DocumentCreatePayload) {
    const documentContent = payload.document ? {content: payload.document} : undefined;
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
                    data: documentContent,
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
 * Update an existing document. Update either the document data or the name, or both.
 * @param {string}            documentID  ID of document to update
 * @param {EncryptedDocument} document    Encrypted document content
 * @param {string}            name        Optional name to update in document
 */
function documentUpdate(documentID: string, document?: Base64String, name?: string | null) {
    return {
        url: `documents/${encodeURIComponent(documentID)}`,
        options: {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                data: document ? {content: document} : undefined,
                name,
            }),
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
        return ApiRequest.fetchJSON<DocumentListResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Invokes the document create API
     * @param {string}               documentID        Unique ID of document to store
     * @param {Base64String}         encryptedDocument Encrypted document. Optional as data does not have to be stored within ICL store
     * @param {PreEncryptedMessage}  userAccessKeys    Symmetric key to store with doc, encrypted to current user
     * @param {EncryptedAccessKey[]} userAccessKeys    List of users that are getting access to the newly created document
     * @param {EncryptedAccessKey[]} groupAccessKeys   List of groups that are getting access to the newly created document
     * @param {string}               documentName      Unencrypted name to store with document
     */
    callDocumentCreateApi(
        documentID: string,
        encryptedDocument: Base64String | null,
        userAccessKeys: EncryptedAccessKey[],
        groupAccessKeys: EncryptedAccessKey[],
        documentName?: string
    ) {
        const {id} = ApiState.user();
        const {url, options, errorCode} = documentCreate(documentID, {
            document: encryptedDocument || undefined,
            userAccessKeys,
            groupAccessKeys,
            documentName,
            userID: id,
            userPublicKey: ApiState.userPublicKey(),
        });
        return ApiRequest.fetchJSON<DocumentCreateResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Call document get API given the various components that make up the document key
     * @param {string} documentID User provided key of the document
     */
    callDocumentGetApi(documentID: string) {
        const {url, options, errorCode} = documentGet(documentID, true);
        return ApiRequest.fetchJSON<DocumentGetResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Get document metadata. Returns all document info except for the data and IV fields
     * @param {string} documentID ID of the document to retrieve
     */
    callDocumentMetadataGetApi(documentID: string) {
        const {url, options, errorCode} = documentGet(documentID);
        return ApiRequest.fetchJSON<DocumentMetaGetResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Call document update API to update either the document data and/or name. If data is sent we only send the data and IV as we don't update who the
     * document is encrypted to as part of this request. The document name field can also be set as null which will cause the name field to be cleared.
     * @param {string}       documentID        User provided key of the document
     * @param {Base64String} encryptedDocument Optional base64 encoded bytes of the encrypted document
     * @param {string}       name              Optional document name to update
     */
    callDocumentUpdateApi(documentID: string, encryptedDocument?: Base64String, name?: string | null) {
        const {url, options, errorCode} = documentUpdate(documentID, encryptedDocument, name);
        return ApiRequest.fetchJSON<DocumentUpdateResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Grant access to a document with the list of users and/or groups provided
     * @param {string}               documentID     ID of the document to grant access
     * @param {EncryptedAccessKey[]} userAccessKeys  List of symmetric key IV and public key/encrypted symmetric key for each user access to grant
     * @param {EncryptedAccessKey[]} groupAccessKeys List of symmetric key IV and public key/encrypted symmetric key for each group access to grant
     */
    callDocumentGrantApi(documentID: string, userAccessKeys: EncryptedAccessKey[], groupAccessKeys: EncryptedAccessKey[]) {
        const {url, options, errorCode} = documentGrant(documentID, ApiState.userPublicKey(), userAccessKeys, groupAccessKeys);
        return ApiRequest.fetchJSON<DocumentAccessResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Revoke access to a document given its ID from the provided list of user and/or group provided
     * @param {string}   documentID       ID of the document to revoke access
     * @param {string[]} userRevocations  List of user IDs to revoke document access from
     * @param {string[]} groupRevocations List of group IDs to revoke document access from
     */
    callDocumentRevokeApi(documentID: string, userRevocations: string[], groupRevocations: string[]) {
        const {url, options, errorCode} = documentRevoke(documentID, userRevocations, groupRevocations);
        return ApiRequest.fetchJSON<DocumentAccessResponseType>(url, errorCode, options, getSignatureHeader());
    },
};

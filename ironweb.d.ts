//UMD module global export
//eslint-disable-next-line no-undef
export as namespace ironweb;

export type RFC3339Timestamp = string;
export type Base64String = string;

/**
 * SDK parameter object shapes
 */
export type JWTCallback = () => Promise<string>;
export type PasscodeCallback = (doesUserExist: boolean) => Promise<string>;
export interface DocumentCreateOptions {
    documentID?: string;
    documentName?: string;
    accessList?: DocumentAccessList;
}
export interface GroupCreateOptions {
    groupID?: string;
    groupName?: string;
    addAsMember?: boolean;
}
export interface GroupUpdateOptions {
    groupName: string | null;
}
export interface DocumentAccessList {
    users?: {id: string}[];
    groups?: {id: string}[];
}

/**
 * Document meta interfaces
 */
export type DocumentAssociation = "owner" | "fromUser" | "fromGroup";
export interface DocumentVisibilityList {
    users: {id: string}[];
    groups: {id: string; name?: string}[];
}

/**
 * Document SDK response types
 */
export interface DocumentIDNameResponse {
    documentID: string;
    documentName: string | null;
    created: RFC3339Timestamp;
    updated: RFC3339Timestamp;
}
export interface DocumentAssociationResponse extends DocumentIDNameResponse {
    association: DocumentAssociation;
}
export interface DocumentListResponse {
    result: DocumentAssociationResponse[];
}
export interface DocumentMetaResponse extends DocumentAssociationResponse {
    visibleTo: DocumentVisibilityList;
}
export interface DecryptedDocumentResponse extends DocumentMetaResponse {
    data: Uint8Array;
}
export interface DecryptedUnmanagedDocumentResponse {
    documentID: string;
    data: Uint8Array;
    accessVia: UserOrGroup;
}
export interface EncryptedDocumentResponse extends DocumentIDNameResponse {
    document: Uint8Array;
}
export interface DocumentAccessResponse {
    succeeded: UserOrGroup[];
    failed: {
        id: string;
        type: "user" | "group";
        error: string;
    }[];
}

/**
 * Group SDK response types
 */
export interface GroupMetaResponse {
    groupID: string;
    groupName: string | null;
    isAdmin: boolean;
    isMember: boolean;
    created: RFC3339Timestamp;
    updated: RFC3339Timestamp;
}
export interface GroupListResponse {
    result: GroupMetaResponse[];
}
export interface GroupDetailResponse extends GroupMetaResponse {
    groupAdmins: string[];
    groupMembers: string[];
}
export interface GroupUserEditResponse {
    succeeded: string[];
    failed: {
        id: string;
        error: string;
    }[];
}

/**
 * User SDK response types
 */
export interface PublicKey<T> {
    x: T;
    y: T;
}
export type PrivateKey<T> = T;
export interface UserCreateResponse {
    accountID: string;
    segmentID: number;
    status: number;
    userMasterPublicKey: PublicKey<Base64String>;
}
export interface DeviceKeys {
    accountId: string;
    segmentId: number;
    devicePrivateKey: PrivateKey<Base64String>;
    signingPrivateKey: PrivateKey<Base64String>;
}

/**
 * SDK Namespaces
 */

export interface User {
    deauthorizeDevice(): Promise<{transformKeyDeleted: boolean}>;
    changePasscode(currentPasscode: string, newPasscode: string): Promise<void>;
}

export interface Document {
    list(): Promise<DocumentListResponse>;
    getMetadata(documentID: string): Promise<DocumentMetaResponse>;
    getDocumentIDFromBytes(encryptedDocument: Uint8Array): Promise<string | null>;
    decrypt(documentID: string, encryptedDocument: Uint8Array): Promise<DecryptedDocumentResponse>;
    decryptFromStore(documentID: string): Promise<DecryptedDocumentResponse>;
    encrypt(documentData: Uint8Array, options?: DocumentCreateOptions): Promise<EncryptedDocumentResponse>;
    encryptToStore(documentData: Uint8Array, options?: DocumentCreateOptions): Promise<DocumentIDNameResponse>;
    updateEncryptedData(documentID: string, newDocumentData: Uint8Array): Promise<EncryptedDocumentResponse>;
    updateEncryptedDataInStore(documentID: string, newDocumentData: Uint8Array): Promise<DocumentIDNameResponse>;
    updateName(documentID: string, name: string | null): Promise<DocumentIDNameResponse>;
    grantAccess(documentID: string, grantList: DocumentAccessList): Promise<DocumentAccessResponse>;
    revokeAccess(documentID: string, revokeList: DocumentAccessList): Promise<DocumentAccessResponse>;
    advanced: {
        decryptUnmanaged(data: Uint8Array, edeks: Uint8Array): Promise<DecryptedUnmanagedDocumentResponse>;
    };
}

export interface Group {
    list(): Promise<GroupListResponse>;
    get(groupID: string): Promise<GroupMetaResponse | GroupDetailResponse>;
    create(options?: GroupCreateOptions): Promise<GroupDetailResponse>;
    update(groupID: string, options: GroupUpdateOptions): Promise<GroupMetaResponse>;
    deleteGroup(groupID: string): Promise<{id: string}>;
    addAdmins(groupID: string, adminList: string[]): Promise<GroupUserEditResponse>;
    removeAdmins(groupID: string, adminList: string[]): Promise<GroupUserEditResponse>;
    addMembers(groupID: string, userList: string[]): Promise<GroupUserEditResponse>;
    removeMembers(groupID: string, userList: string[]): Promise<GroupUserEditResponse>;
    removeSelfAsMember(groupID: string): Promise<void>;
}

export interface Codec {
    utf8: {
        toBytes(utf8String: string): Uint8Array;
        fromBytes(bytes: Uint8Array): string;
    };
    base64: {
        toBytes(base64String: string): Uint8Array;
        fromBytes(bytes: Uint8Array): string;
    };
}

export interface InitializedUser {
    id: string;
    status: number;
}

export interface SDKInitializationResult {
    user: InitializedUser;
}

export class SDKError extends Error {
    constructor(error: Error, code: number);
    code: number;
    rawError: Error;
}

export interface UserOrGroup {
    type: "user" | "group";
    id: string;
}

//Unfortunately dupliated here, to be fixed in #20
export interface ErrorCodes {
    JWT_FORMAT_FAILURE: 100;
    JWT_RETRIEVAL_FAILURE: 101;
    VERIFY_API_REQUEST_FAILURE: 102;
    BROWSER_FRAME_MESSAGE_FAILURE: 103;
    RANDOM_NUMBER_GENERATION_FAILURE: 104;
    PASSCODE_FORMAT_FAILURE: 105;
    PASSCODE_RETRIEVAL_FAILURE: 106;
    SIGNATURE_GENERATION_FAILURE: 107;
    USER_NOT_SYNCED_FAILURE: 108;
    USER_VERIFY_API_REQUEST_FAILURE: 200;
    USER_CREATE_REQUEST_FAILURE: 201;
    USER_UPDATE_REQUEST_FAILURE: 202;
    USER_PASSCODE_INCORRECT: 203;
    USER_KEY_LIST_REQUEST_FAILURE: 204;
    USER_DEVICE_ADD_REQUEST_FAILURE: 205;
    USER_MASTER_KEY_GENERATION_FAILURE: 206;
    USER_DEVICE_KEY_GENERATION_FAILURE: 207;
    USER_DEVICE_KEY_DECRYPTION_FAILURE: 208;
    USER_PASSCODE_CHANGE_FAILURE: 209;
    USER_DEVICE_DELETE_REQUEST_FAILURE: 210;
    DOCUMENT_LIST_REQUEST_FAILURE: 300;
    DOCUMENT_GET_REQUEST_FAILURE: 301;
    DOCUMENT_CREATE_REQUEST_FAILURE: 302;
    DOCUMENT_UPDATE_REQUEST_FAILURE: 303;
    DOCUMENT_GRANT_ACCESS_REQUEST_FAILURE: 304;
    DOCUMENT_REVOKE_ACCESS_REQUEST_FAILURE: 305;
    DOCUMENT_DECRYPT_FAILURE: 306;
    DOCUMENT_ENCRYPT_FAILURE: 307;
    DOCUMENT_REENCRYPT_FAILURE: 308;
    DOCUMENT_GRANT_ACCESS_FAILURE: 309;
    DOCUMENT_MAX_SIZE_EXCEEDED: 310;
    DOCUMENT_CREATE_WITH_ACCESS_FAILURE: 311;
    DOCUMENT_HEADER_PARSE_FAILURE: 312;
    DOCUMENT_TRANSFORM_REQUEST_FAILURE: 313;
    GROUP_LIST_REQUEST_FAILURE: 400;
    GROUP_GET_REQUEST_FAILURE: 401;
    GROUP_CREATE_REQUEST_FAILURE: 402;
    GROUP_ADD_MEMBERS_REQUEST_FAILURE: 403;
    GROUP_ADD_MEMBER_NOT_ADMIN_FAILURE: 404;
    GROUP_REMOVE_MEMBERS_REQUEST_FAILURE: 405;
    GROUP_REMOVE_SELF_REQUEST_FAILURE: 406;
    GROUP_KEY_GENERATION_FAILURE: 407;
    GROUP_MEMBER_KEY_ENCRYPTION_FAILURE: 408;
    GROUP_ADD_ADMINS_NOT_ADMIN_FAILURE: 409;
    GROUP_ADD_ADMINS_REQUEST_FAILURE: 410;
    GROUP_KEY_DECRYPTION_FAILURE: 411;
    GROUP_REMOVE_ADMINS_REQUEST_FAILURE: 412;
    GROUP_UPDATE_REQUEST_FAILURE: 413;
    GROUP_DELETE_REQUEST_FAILURE: 414;
    REQUEST_RATE_LIMITED: 500;
}

export const ErrorCodes: ErrorCodes;
export const document: Document;
export const codec: Codec;
export const user: User;
export const group: Group;

export function initialize(jwtCallback: JWTCallback, passcodeCallback: PasscodeCallback): Promise<SDKInitializationResult>;
export function createNewUser(jwtCallback: JWTCallback, passcode: string): Promise<UserCreateResponse>;
export function createNewDeviceKeys(jwtCallback: JWTCallback, passcode: string): Promise<DeviceKeys>;
export function isInitialized(): boolean;

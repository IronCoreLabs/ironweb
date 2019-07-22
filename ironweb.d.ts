//UMD module global export
//eslint-disable-next-line no-undef
export as namespace ironweb;

type RFC3339Timestamp = string;

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
export interface EncryptedDocumentResponse extends DocumentIDNameResponse {
    document: Uint8Array;
}
export interface DocumentAccessResponse {
    succeeded: {
        id: string;
        type: "user" | "group";
    }[];
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
export interface UserMetaResponse {
    accountId: string;
    segmentId: number;
    status: number;
    userMasterPublicKey: PublicKey<Base64String>;
    userPrivateKey: PrivateKey<Base64String>;
}
export type UserCreateResponse = UserMetaResponse;

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

export const ErrorCodes: {[key: string]: number};
export const document: Document;
export const codec: Codec;
export const user: User;
export const group: Group;

export function initialize(jwtCallback: JWTCallback, passcodeCallback: PasscodeCallback): Promise<SDKInitializationResult>;
export const createNewUser: () => Promise<UserCreateResponse>;
export function isInitialized(): boolean;

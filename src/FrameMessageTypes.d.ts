import {
    DecryptedDocumentResponse,
    DeviceKeys,
    DocumentAccessResponse,
    DocumentIDNameResponse,
    DocumentListResponse as ExposedDocumentListResponse,
    DocumentMetaResponse,
    GroupDetailResponse,
    GroupListResponse as GroupListResult,
    GroupMetaResponse,
    GroupUserEditResponse,
    Policy,
    UserOrGroup,
} from "../ironweb";
import {InteralGroupCreateOptions} from "./frame/sdk/GroupApi";

export interface FrameLoadedRequest {
    type: "FRAME_LOADED_CHECK";
}
export interface FrameLoadedResponse {
    type: "FRAME_LOADED_CHECK_RESPONSE";
}
/*
 * Initialization request/response messages
 */
export interface InitApiRequest {
    type: "INIT_SDK";
    message: {
        jwtToken: string;
        symmetricKey?: string;
    };
}
export interface InitApiPasscodeResponse {
    type: "INIT_PASSCODE_REQUIRED";
    message: {doesUserExist: boolean};
}
export interface InitApiSdkResponse {
    type: "FULL_SDK_RESPONSE";
    message: {
        user: {
            id: string;
            status: number;
        };
        symmetricKey?: string;
    };
}
export interface CreateUserRequest {
    type: "CREATE_USER";
    message: {passcode: string; jwtToken: string};
}
export interface CreateUserResponse {
    type: "CREATE_USER_RESPONSE";
    message: ApiUserResponse;
}
export interface CreateUserAndDeviceRequest {
    type: "CREATE_USER_AND_DEVICE";
    message: {passcode: string; jwtToken: string};
}
export interface GenerateNewDeviceKeysRequest {
    type: "GEN_DEVICE_KEYS";
    message: {passcode: string; jwtToken: string};
}
export interface CreateDetachedUserDeviceRequest {
    type: "CREATE_DETATCHED_USER_DEVICE";
    message: {passcode: string; jwtToken: string};
}
export interface CreateDetachedUserDeviceResponse {
    type: "CREATE_DETATCHED_USER_DEVICE_RESPONSE";
    message: DeviceKeys;
}

/**
 * Document request/response messages
 */
export interface DocumentListRequest {
    type: "DOCUMENT_LIST";
    message?: null;
}
export interface DocumentListResponse {
    type: "DOCUMENT_LIST_RESPONSE";
    message: ExposedDocumentListResponse;
}

/* Get/Decrypt */
export interface DocumentMetaGetRequest {
    type: "DOCUMENT_META_GET";
    message: {
        documentID: string;
    };
}
export interface DocumentMetaGetResponse {
    type: "DOCUMENT_META_GET_RESPONSE";
    message: DocumentMetaResponse;
}

export interface DocumentStoreDecryptRequest {
    type: "DOCUMENT_STORE_DECRYPT";
    message: {
        documentID: string;
    };
}

export interface DocumentStoreDecryptResponse {
    type: "DOCUMENT_STORE_DECRYPT_RESPONSE";
    message: DecryptedDocumentResponse;
}

export interface DocumentDecryptRequest {
    type: "DOCUMENT_DECRYPT";
    message: {
        documentID: string;
        documentData: Uint8Array;
    };
}

export interface DocumentDecryptResponse {
    type: "DOCUMENT_DECRYPT_RESPONSE";
    message: DecryptedDocumentResponse;
}

export interface DocumentUnmanagedDecryptRequest {
    type: "DOCUMENT_UNMANAGED_DECRYPT";
    message: {
        edeks: Uint8Array;
        documentData: Uint8Array;
    };
}
export interface DocumentUnmanagedDecryptResponse {
    type: "DOCUMENT_UNMANAGED_DECRYPT_RESPONSE";
    message: {
        data: Uint8Array;
        accessVia: UserOrGroup;
    };
}

/* Create/Encrypt */
export interface DocumentStoreEncryptRequest {
    type: "DOCUMENT_STORE_ENCRYPT";
    message: {
        documentID: string;
        documentData: Uint8Array;
        documentName: string;
        userGrants: string[];
        groupGrants: string[];
        grantToAuthor: boolean;
        policy?: Policy;
    };
}
export interface DocumentStoreEncryptResponse {
    type: "DOCUMENT_STORE_ENCRYPT_RESPONSE";
    message: DocumentIDNameResponse;
}

export interface DocumentEncryptRequest {
    type: "DOCUMENT_ENCRYPT";
    message: {
        documentID: string;
        documentData: Uint8Array;
        documentName: string;
        userGrants: string[];
        groupGrants: string[];
        grantToAuthor: boolean;
        policy?: Policy;
    };
}
export interface DocumentEncryptResponse {
    type: "DOCUMENT_ENCRYPT_RESPONSE";
    message: {
        documentID: string;
        documentName: string | null;
        document: Uint8Array;
        created: string;
        updated: string;
    };
}
export interface DocumentUnmanagedEncryptRequest {
    type: "DOCUMENT_UNMANAGED_ENCRYPT";
    message: {
        documentID: string;
        documentData: Uint8Array;
        userGrants: string[];
        groupGrants: string[];
        grantToAuthor: boolean;
        policy?: Policy;
    };
}
export interface DocumentUnmanagedEncryptResponse {
    type: "DOCUMENT_UNMANAGED_ENCRYPT_RESPONSE";
    message: {
        documentID: string;
        edeks: Uint8Array;
        document: Uint8Array;
    };
}

/* Update/reencrypt */
export interface DocumentStoreUpdateDataRequest {
    type: "DOCUMENT_STORE_UPDATE_DATA";
    message: {
        documentID: string;
        documentData: Uint8Array;
    };
}
export interface DocumentStoreUpdateDataResponse {
    type: "DOCUMENT_STORE_UPDATE_DATA_RESPONSE";
    message: DocumentIDNameResponse;
}

export interface DocumentUpdateDataRequest {
    type: "DOCUMENT_UPDATE_DATA";
    message: {
        documentID: string;
        documentData: Uint8Array;
    };
}
export interface DocumentUpdateDataResponse {
    type: "DOCUMENT_UPDATE_DATA_RESPONSE";
    message: {
        documentID: string;
        documentName: string | null;
        document: Uint8Array;
        updated: string;
        created: string;
    };
}

export interface DocumentUpdateNameRequest {
    type: "DOCUMENT_UPDATE_NAME";
    message: {
        documentID: string;
        name: string | null;
    };
}
export interface DocumentUpdateNameResponse {
    type: "DOCUMENT_UPDATE_NAME_RESPONSE";
    message: DocumentIDNameResponse;
}

/* Document access */
export interface DocumentGrantRequest {
    type: "DOCUMENT_GRANT";
    message: {
        documentID: string;
        userGrants: string[];
        groupGrants: string[];
    };
}
export interface DocumentGrantResponse {
    type: "DOCUMENT_GRANT_RESPONSE";
    message: DocumentAccessResponse;
}

export interface DocumentRevokeRequest {
    type: "DOCUMENT_REVOKE";
    message: {
        documentID: string;
        userRevocations: string[];
        groupRevocations: string[];
    };
}
export interface DocumentRevokeResponse {
    type: "DOCUMENT_REVOKE_RESPONSE";
    message: DocumentAccessResponse;
}

/* Group */
export interface GroupListRequest {
    type: "GROUP_LIST";
    message?: null;
}
export interface GroupListResponse {
    type: "GROUP_LIST_RESPONSE";
    message: GroupListResult;
}

export interface GroupGetRequest {
    type: "GROUP_GET";
    message: {
        groupID: string;
    };
}
export interface GroupGetResponse {
    type: "GROUP_GET_RESPONSE";
    message: GroupMetaResponse | GroupDetailResponse;
}

export interface GroupCreateRequest {
    type: "GROUP_CREATE";
    message: InteralGroupCreateOptions;
}
export interface GroupCreateResponse {
    type: "GROUP_CREATE_RESPONSE";
    message: GroupDetailResponse;
}

export interface GroupUpdateRequest {
    type: "GROUP_UPDATE";
    message: {
        groupID: string;
        groupName: string | null;
    };
}
export interface GroupUpdateResponse {
    type: "GROUP_UPDATE_RESPONSE";
    message: GroupMetaResponse;
}

export interface GroupAddAdminRequest {
    type: "GROUP_ADD_ADMINS";
    message: {
        groupID: string;
        userList: string[];
    };
}
export interface GroupAddAdminResponse {
    type: "GROUP_ADD_ADMINS_RESPONSE";
    message: GroupUserEditResponse;
}

export interface GroupRemoveAdminRequest {
    type: "GROUP_REMOVE_ADMINS";
    message: {
        groupID: string;
        userList: string[];
    };
}
export interface GroupRemoveAdminResponse {
    type: "GROUP_REMOVE_ADMINS_RESPONSE";
    message: GroupUserEditResponse;
}

export interface GroupAddMemberRequest {
    type: "GROUP_ADD_MEMBERS";
    message: {
        groupID: string;
        userList: string[];
    };
}
export interface GroupAddMemberResponse {
    type: "GROUP_ADD_MEMBERS_RESPONSE";
    message: GroupUserEditResponse;
}

export interface GroupRemoveMemberRequest {
    type: "GROUP_REMOVE_MEMBERS";
    message: {
        groupID: string;
        userList: string[];
    };
}
export interface GroupRemoveMemberResponse {
    type: "GROUP_REMOVE_MEMBERS_RESPONSE";
    message: GroupUserEditResponse;
}

export interface GroupRemoveSelfAsMemberRequest {
    type: "GROUP_REMOVE_SELF_AS_MEMBER";
    message: {
        groupID: string;
    };
}
export interface GroupRemoveSelfAsMemberResponse {
    type: "GROUP_REMOVE_SELF_AS_MEMBER_RESPONSE";
    message: null;
}

export interface GroupDeleteRequest {
    type: "GROUP_DELETE";
    message: {
        groupID: string;
    };
}
export interface GroupDeleteResponse {
    type: "GROUP_DELETE_RESPONSE";
    message: {
        id: string;
    };
}

/* User */
export interface ChangeUserPasscode {
    type: "CHANGE_USER_PASSCODE";
    message: {
        currentPasscode: string;
        newPasscode: string;
    };
}
export interface ChangeUserPasscodeResponse {
    type: "CHANGE_USER_PASSCODE_RESPONSE";
    message: null;
}
export interface DeauthorizeDevice {
    type: "DEAUTHORIZE_DEVICE";
    message: null;
}
export interface DeauthorizeDeviceResponse {
    type: "DEAUTHORIZE_DEVICE_RESPONSE";
    message: boolean;
}

export interface ErrorResponse {
    type: "ERROR_RESPONSE";
    message: {
        code: number;
        text: string;
    };
}

export type RequestMessage =
    | FrameLoadedRequest
    | InitApiRequest
    | CreateUserRequest
    | CreateUserAndDeviceRequest
    | GenerateNewDeviceKeysRequest
    | CreateDetachedUserDeviceRequest
    | DocumentListRequest
    | DocumentMetaGetRequest
    | DocumentStoreDecryptRequest
    | DocumentDecryptRequest
    | DocumentStoreEncryptRequest
    | DocumentEncryptRequest
    | DocumentStoreUpdateDataRequest
    | DocumentUpdateDataRequest
    | DocumentUpdateNameRequest
    | DocumentGrantRequest
    | DocumentRevokeRequest
    | GroupListRequest
    | GroupGetRequest
    | GroupCreateRequest
    | GroupUpdateRequest
    | GroupAddAdminRequest
    | GroupRemoveAdminRequest
    | GroupAddMemberRequest
    | GroupRemoveMemberRequest
    | GroupRemoveSelfAsMemberRequest
    | GroupDeleteRequest
    | ChangeUserPasscode
    | DeauthorizeDevice
    | DocumentUnmanagedDecryptRequest
    | DocumentUnmanagedEncryptRequest;

export type ResponseMessage =
    | FrameLoadedResponse
    | InitApiPasscodeResponse
    | InitApiSdkResponse
    | DocumentListResponse
    | DocumentMetaGetResponse
    | DocumentStoreDecryptResponse
    | DocumentDecryptResponse
    | DocumentStoreEncryptResponse
    | DocumentEncryptResponse
    | DocumentStoreUpdateDataResponse
    | DocumentUpdateDataResponse
    | DocumentUpdateNameResponse
    | DocumentGrantResponse
    | DocumentRevokeResponse
    | ChangeUserPasscodeResponse
    | CreateUserResponse
    | CreateDetachedUserDeviceResponse
    | DeauthorizeDeviceResponse
    | GroupListResponse
    | GroupGetResponse
    | GroupCreateResponse
    | GroupUpdateResponse
    | GroupAddAdminResponse
    | GroupRemoveAdminResponse
    | GroupAddMemberResponse
    | GroupRemoveMemberResponse
    | GroupRemoveSelfAsMemberResponse
    | GroupDeleteResponse
    | ErrorResponse
    | DocumentUnmanagedDecryptResponse
    | DocumentUnmanagedEncryptResponse;

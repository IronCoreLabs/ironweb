import {UserCreationKeys, UserKeys, UserUpdateKeys} from "./frame/endpoints/UserApiEndpoints";
import {TransformKeyGrant} from "./frame/worker/crypto/recrypt";

export interface NewUserKeygenWorkerRequest {
    type: "NEW_USER_KEYGEN";
    message: {
        passcode: string;
    };
}
export interface NewUserKeygenWorkerResponse {
    type: "NEW_USER_KEYGEN_RESPONSE";
    message: UserKeys;
}

export interface NewUserAndDeviceKeygenWorkerRequest {
    type: "NEW_USER_AND_DEVICE_KEYGEN";
    message: {
        passcode: string;
    };
}
export interface NewUserAndDeviceKeygenWorkerResponse {
    type: "NEW_USER_AND_DEVICE_KEYGEN_RESPONSE";
    message: {
        userKeys: UserCreationKeys;
        encryptedDeviceAndSigningKeys: EncryptedLocalKeys;
    };
}

export interface DeviceKeygenWorkerRequest {
    type: "USER_DEVICE_KEYGEN";
    message: {
        jwtToken: string;
        passcode: string;
        encryptedPrivateUserKey: Uint8Array;
        publicUserKey: PublicKey<Uint8Array>;
        keySalt: Uint8Array;
    };
}
export interface DeviceKeygenWorkerResponse {
    type: "USER_DEVICE_KEYGEN_RESPONSE";
    message: {
        userKeys: UserUpdateKeys;
        encryptedDeviceAndSigningKeys: EncryptedLocalKeys;
        deviceSignature: {
            signature: Uint8Array;
            ts: number;
        };
    };
}

export interface DecryptLocalKeysWorkerRequest {
    type: "DECRYPT_LOCAL_KEYS";
    message: {
        encryptedDeviceKey: Uint8Array;
        encryptedSigningKey: Uint8Array;
        symmetricKey: Uint8Array;
        nonce: Uint8Array;
    };
}
export interface DecryptLocalKeysWorkerResponse {
    type: "DECRYPT_LOCAL_KEYS_RESPONSE";
    message: {
        deviceKeys: {
            publicKey: PublicKey<Uint8Array>;
            privateKey: Uint8Array;
        };
        signingKeys: {
            publicKey: SigningPublicKey<Uint8Array>;
            privateKey: Uint8Array;
        };
    };
}

export interface RotateUserPrivateKeyWorkerRequest {
    type: "ROTATE_USER_PRIVATE_KEY";
    message: {
        passcode: string;
        encryptedPrivateUserKey: Uint8Array;
    };
}

export interface RotateUserPrivateKeyWorkerResponse {
    type: "ROTATE_USER_PRIVATE_KEY_RESPONSE";
    message: {
        newEncryptedPrivateUserKey: Uint8Array;
        augmentationFactor: Uint8Array;
    };
}

export interface ChangeUserPasscodeWorkerRequest {
    type: "CHANGE_USER_PASSCODE";
    message: {
        currentPasscode: string;
        newPasscode: string;
        encryptedPrivateUserKey: Uint8Array;
    };
}
export interface ChangeUserPasscodeWorkerResponse {
    type: "CHANGE_USER_PASSCODE_RESPONSE";
    message: {
        encryptedPrivateUserKey: Uint8Array;
    };
}

export interface EncryptDocumentWorkerRequest {
    type: "DOCUMENT_ENCRYPT";
    message: {
        document: Uint8Array;
        userKeyList: UserOrGroupPublicKey[];
        groupKeyList: UserOrGroupPublicKey[];
        signingKeys: SigningKeyPair;
    };
}
export interface EncryptDocumentWorkerResponse {
    type: "DOCUMENT_ENCRYPT_RESPONSE";
    message: {
        userAccessKeys: EncryptedAccessKey[];
        groupAccessKeys: EncryptedAccessKey[];
        encryptedDocument: EncryptedDocument;
    };
}

export interface DecryptDocumentWorkerRequest {
    type: "DOCUMENT_DECRYPT";
    message: {
        document: EncryptedDocument;
        encryptedSymmetricKey: TransformedEncryptedMessage;
        privateKey: PrivateKey<Uint8Array>;
    };
}
export interface DecryptDocumentWorkerResponse {
    type: "DOCUMENT_DECRYPT_RESPONSE";
    message: {
        decryptedDocument: Uint8Array;
    };
}

export interface ReencryptDocumentWorkerRequest {
    type: "DOCUMENT_REENCRYPT";
    message: {
        document: Uint8Array;
        privateKey: PrivateKey<Uint8Array>;
        existingDocumentSymmetricKey: TransformedEncryptedMessage;
    };
}
export interface ReencryptDocumentWorkerResponse {
    type: "DOCUMENT_REENCRYPT_RESPONSE";
    message: {
        encryptedDocument: EncryptedDocument;
    };
}

export interface DocumentEncryptToKeysWorkerRequest {
    type: "DOCUMENT_ENCRYPT_TO_KEYS";
    message: {
        symmetricKey: TransformedEncryptedMessage;
        userKeyList: UserOrGroupPublicKey[];
        groupKeyList: UserOrGroupPublicKey[];
        privateKey: PrivateKey<Uint8Array>;
        signingKeys: SigningKeyPair;
    };
}
export interface DocumentEncryptToKeysWorkerResponse {
    type: "DOCUMENT_ENCRYPT_TO_KEYS_RESPONSE";
    message: {
        userAccessKeys: EncryptedAccessKey[];
        groupAccessKeys: EncryptedAccessKey[];
    };
}
export interface RotateGroupPrivateKeyWorkerRequest {
    type: "ROTATE_GROUP_PRIVATE_KEY";
    message: {
        encryptedGroupKey: TransformedEncryptedMessage;
        adminList: UserOrGroupPublicKey[];
        adminPrivateKey: PrivateKey<Uint8Array>;
        signingKeys: SigningKeyPair;
    };
}

export interface RotateGroupPrivateKeyWorkerResponse {
    type: "ROTATE_GROUP_PRIVATE_KEY_RESPONSE";
    message: {
        encryptedAccessKeys: EncryptedAccessKey[];
        augmentationFactor: Uint8Array;
    };
}
export interface GroupCreateWorkerRequest {
    type: "GROUP_CREATE";
    message: {
        signingKeys: SigningKeyPair;
        memberList: UserOrGroupPublicKey[];
        adminList: UserOrGroupPublicKey[];
    };
}
export interface GroupCreateWorkerResponse {
    type: "GROUP_CREATE_RESPONSE";
    message: {
        encryptedAccessKeys: EncryptedAccessKey[];
        groupPublicKey: PublicKey<Uint8Array>;
        transformKeyGrantList: TransformKeyGrant[];
    };
}

export interface GroupAddAdminWorkerRequest {
    type: "GROUP_ADD_ADMINS";
    message: {
        encryptedGroupKey: TransformedEncryptedMessage;
        groupID: string;
        groupPublicKey: PublicKey<string>;
        userKeyList: UserOrGroupPublicKey[];
        adminPrivateKey: PrivateKey<Uint8Array>;
        signingKeys: SigningKeyPair;
    };
}
export interface GroupAddAdminWorkerResponse {
    type: "GROUP_ADD_ADMINS_RESPONSE";
    message: {
        encryptedAccessKey: EncryptedAccessKey[];
        signature: Uint8Array;
    };
}

export interface GroupAddMemberWorkerRequest {
    type: "GROUP_ADD_MEMBERS";
    message: {
        encryptedGroupKey: TransformedEncryptedMessage;
        groupID: string;
        groupPublicKey: PublicKey<string>;
        userKeyList: UserOrGroupPublicKey[];
        adminPrivateKey: PrivateKey<Uint8Array>;
        signingKeys: SigningKeyPair;
    };
}
export interface GroupAddMemberWorkerResponse {
    type: "GROUP_ADD_MEMBERS_RESPONSE";
    message: {
        transformKeyGrant: TransformKeyGrant[];
        signature: Uint8Array;
    };
}

export interface SignatureGenerationWorkerRequest {
    type: "SIGNATURE_GENERATION";
    message: {
        segmentID: number;
        userID: string;
        signingKeys: SigningKeyPair;
        url: string;
        method: string;
        body?: BodyInit | null;
    };
}
export interface SignatureGenerationWorkerResponse {
    type: "SIGNATURE_GENERATION_RESPONSE";
    message: MessageSignature;
}

export interface ErrorResponse {
    type: "ERROR_RESPONSE";
    message: {
        code: number;
        text: string;
    };
}

export type RequestMessage =
    | RotateGroupPrivateKeyWorkerRequest
    | RotateUserPrivateKeyWorkerRequest
    | EncryptDocumentWorkerRequest
    | ReencryptDocumentWorkerRequest
    | DecryptDocumentWorkerRequest
    | DocumentEncryptToKeysWorkerRequest
    | NewUserKeygenWorkerRequest
    | NewUserAndDeviceKeygenWorkerRequest
    | DeviceKeygenWorkerRequest
    | ChangeUserPasscodeWorkerRequest
    | GroupCreateWorkerRequest
    | DecryptLocalKeysWorkerRequest
    | GroupAddAdminWorkerRequest
    | GroupAddMemberWorkerRequest
    | SignatureGenerationWorkerRequest;

export type ResponseMessage =
    | RotateGroupPrivateKeyWorkerResponse
    | RotateUserPrivateKeyWorkerResponse
    | EncryptDocumentWorkerResponse
    | ReencryptDocumentWorkerResponse
    | DecryptDocumentWorkerResponse
    | DocumentEncryptToKeysWorkerResponse
    | NewUserKeygenWorkerResponse
    | NewUserAndDeviceKeygenWorkerResponse
    | DeviceKeygenWorkerResponse
    | DecryptLocalKeysWorkerResponse
    | ChangeUserPasscodeWorkerResponse
    | GroupCreateWorkerResponse
    | GroupAddAdminWorkerResponse
    | GroupAddMemberWorkerResponse
    | SignatureGenerationWorkerResponse
    | ErrorResponse;

//These two interfaces are for handling random number generation if it needs to happen outside of a WebWorker. They aren't part of the
//main list of request/resonse types as they're special.
export interface GenerateRandomBytesFrameRequest {
    type: "RANDOM_BYTES_REQUEST";
    message: {
        size: number;
    };
}
export interface GenerateRandomBytesWorkerResponse {
    type: "RANDOM_BYTES_RESPONSE";
    message: {
        bytes: Uint8Array;
    };
}

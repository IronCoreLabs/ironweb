import * as Init from "./initialization";
import * as UserApi from "./sdk/UserApi";
import * as DocumentApi from "./sdk/DocumentApi";
import * as GroupApi from "./sdk/GroupApi";
import SDKError from "../lib/SDKError";
import FrameMessenger from "./FrameMessenger";
import {RequestMessage, ResponseMessage, ErrorResponse} from "../FrameMessageTypes";
//Polyfill Promises and fetch for browsers which don't support them
import "es6-promise/auto";
import "whatwg-fetch";

/**
 * Generic method to convert SDK error messages down into the message/code parts for transfer back to the parent window
 */
function errorResponse(callback: (response: ErrorResponse) => void, error: SDKError) {
    callback({
        type: "ERROR_RESPONSE",
        message: {
            code: error.code,
            text: error.message,
        },
    });
}

/* tslint:disable cyclomatic-complexity */
function onParentPortMessage(data: RequestMessage, callback: (message: ResponseMessage, transferList?: Uint8Array[]) => void) {
    const errorHandler = errorResponse.bind(null, callback);

    switch (data.type) {
        case "INIT_SDK":
            return Init.initialize(data.message.jwtToken, data.message.symmetricKey).engage(errorHandler, callback);
        case "CREATE_USER":
            return Init.createUser(data.message.jwtToken, data.message.passcode).engage(errorHandler, callback);
        case "CREATE_USER_AND_DEVICE":
            return Init.createUserAndDevice(data.message.jwtToken, data.message.passcode).engage(errorHandler, callback);
        case "GEN_DEVICE_KEYS":
            return Init.generateUserNewDeviceKeys(data.message.jwtToken, data.message.passcode).engage(errorHandler, callback);
        case "CREATE_DETATCHED_USER_DEVICE":
            return Init.createDetachedUserDevice(data.message.jwtToken, data.message.passcode).engage(errorHandler, (result) =>
                callback({type: "CREATE_DETATCHED_USER_DEVICE_RESPONSE", message: result})
            );
        case "DEAUTHORIZE_DEVICE":
            return UserApi.deauthorizeDevice().engage(errorHandler, (result) => callback({type: "DEAUTHORIZE_DEVICE_RESPONSE", message: result}));
        case "CHANGE_USER_PASSCODE":
            return UserApi.changeUsersPasscode(data.message.currentPasscode, data.message.newPasscode).engage(errorHandler, () =>
                callback({type: "CHANGE_USER_PASSCODE_RESPONSE", message: null})
            );
        case "DOCUMENT_LIST":
            return DocumentApi.list().engage(errorHandler, (documents) => callback({type: "DOCUMENT_LIST_RESPONSE", message: documents}));
        case "DOCUMENT_META_GET":
            return DocumentApi.getDocumentMeta(data.message.documentID).engage(errorHandler, (meta) =>
                callback({type: "DOCUMENT_META_GET_RESPONSE", message: meta})
            );
        case "DOCUMENT_STORE_DECRYPT":
            return DocumentApi.decryptHostedDoc(data.message.documentID).engage(errorHandler, (documentData) =>
                callback({type: "DOCUMENT_STORE_DECRYPT_RESPONSE", message: documentData}, [documentData.data])
            );
        case "DOCUMENT_DECRYPT":
            return DocumentApi.decryptLocalDoc(data.message.documentID, data.message.documentData).engage(errorHandler, (documentData) =>
                callback({type: "DOCUMENT_DECRYPT_RESPONSE", message: documentData}, [documentData.data])
            );
        case "DOCUMENT_STORE_ENCRYPT":
            return DocumentApi.encryptToStore(
                data.message.documentID,
                data.message.documentData,
                data.message.documentName,
                data.message.userGrants,
                data.message.groupGrants
            ).engage(errorHandler, (documentMeta) => callback({type: "DOCUMENT_STORE_ENCRYPT_RESPONSE", message: documentMeta}));
        case "DOCUMENT_ENCRYPT":
            return DocumentApi.encryptLocalDocument(
                data.message.documentID,
                data.message.documentData,
                data.message.documentName,
                data.message.userGrants,
                data.message.groupGrants
            ).engage(errorHandler, (encryptedDoc) => callback({type: "DOCUMENT_ENCRYPT_RESPONSE", message: encryptedDoc}, [encryptedDoc.document]));
        case "DOCUMENT_STORE_UPDATE_DATA":
            return DocumentApi.updateToStore(data.message.documentID, data.message.documentData).engage(errorHandler, (documentMeta) =>
                callback({type: "DOCUMENT_STORE_UPDATE_DATA_RESPONSE", message: documentMeta})
            );
        case "DOCUMENT_UPDATE_DATA":
            return DocumentApi.updateLocalDocument(data.message.documentID, data.message.documentData).engage(errorHandler, (encryptedDoc) =>
                callback({type: "DOCUMENT_UPDATE_DATA_RESPONSE", message: encryptedDoc}, [encryptedDoc.document])
            );
        case "DOCUMENT_UPDATE_NAME":
            return DocumentApi.updateName(data.message.documentID, data.message.name).engage(errorHandler, (docIDAndName) =>
                callback({type: "DOCUMENT_UPDATE_NAME_RESPONSE", message: docIDAndName})
            );
        case "DOCUMENT_GRANT":
            return DocumentApi.grantDocumentAccess(data.message.documentID, data.message.userGrants, data.message.groupGrants).engage(
                errorHandler,
                (grantResponse) => callback({type: "DOCUMENT_GRANT_RESPONSE", message: grantResponse})
            );
        case "DOCUMENT_REVOKE":
            return DocumentApi.revokeDocumentAccess(data.message.documentID, data.message.userRevocations, data.message.groupRevocations).engage(
                errorHandler,
                (revokeResponse) => callback({type: "DOCUMENT_REVOKE_RESPONSE", message: revokeResponse})
            );
        case "GROUP_LIST":
            return GroupApi.list().engage(errorHandler, (groupList) => callback({type: "GROUP_LIST_RESPONSE", message: groupList}));
        case "GROUP_GET":
            return GroupApi.get(data.message.groupID).engage(errorHandler, (group) => callback({type: "GROUP_GET_RESPONSE", message: group}));
        case "GROUP_CREATE":
            return GroupApi.create(data.message.groupID, data.message.groupName, data.message.addAsMember).engage(errorHandler, (newGroup) =>
                callback({type: "GROUP_CREATE_RESPONSE", message: newGroup})
            );
        case "GROUP_UPDATE":
            return GroupApi.update(data.message.groupID, data.message.groupName).engage(errorHandler, (updatedGroup) =>
                callback({type: "GROUP_UPDATE_RESPONSE", message: updatedGroup})
            );
        case "GROUP_ADD_ADMINS":
            return GroupApi.addAdmins(data.message.groupID, data.message.userList).engage(errorHandler, (addResult) =>
                callback({type: "GROUP_ADD_ADMINS_RESPONSE", message: addResult})
            );
        case "GROUP_REMOVE_ADMINS":
            return GroupApi.removeAdmins(data.message.groupID, data.message.userList).engage(errorHandler, (removeResult) =>
                callback({type: "GROUP_REMOVE_ADMINS_RESPONSE", message: removeResult})
            );
        case "GROUP_ADD_MEMBERS":
            return GroupApi.addMembers(data.message.groupID, data.message.userList).engage(errorHandler, (addResult) =>
                callback({type: "GROUP_ADD_MEMBERS_RESPONSE", message: addResult})
            );
        case "GROUP_REMOVE_MEMBERS":
            return GroupApi.removeMembers(data.message.groupID, data.message.userList).engage(errorHandler, (removeResult) =>
                callback({type: "GROUP_REMOVE_MEMBERS_RESPONSE", message: removeResult})
            );
        case "GROUP_REMOVE_SELF_AS_MEMBER":
            return GroupApi.removeSelfAsMember(data.message.groupID).engage(errorHandler, () =>
                callback({type: "GROUP_REMOVE_SELF_AS_MEMBER_RESPONSE", message: null})
            );
        case "GROUP_DELETE":
            return GroupApi.deleteGroup(data.message.groupID).engage(errorHandler, (deleteResult) =>
                callback({type: "GROUP_DELETE_RESPONSE", message: deleteResult})
            );
        default:
            //Force TS to tell us if we ever create a new request type that we don't handle here
            const exhaustiveCheck: never = data;
            return exhaustiveCheck;
    }
}
/* tslint:enable cyclomatic-complexity */

export const messenger = new FrameMessenger(onParentPortMessage);

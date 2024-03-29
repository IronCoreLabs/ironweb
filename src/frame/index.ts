import {ErrorResponse, GroupCreateRequest, RequestMessage, ResponseMessage} from "../FrameMessageTypes";
import SDKError from "../lib/SDKError";
import ApiState from "./ApiState";
import FrameMessenger from "./FrameMessenger";
import * as Init from "./initialization";
import * as DocumentAdvancedApi from "./sdk/DocumentAdvancedApi";
import * as DocumentApi from "./sdk/DocumentApi";
import * as GroupApi from "./sdk/GroupApi";
import * as SearchApi from "./sdk/SearchApi";
import * as UserApi from "./sdk/UserApi";

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
/**
 * Resolves GroupCreateRequests down to a standard form, fixing options not available in earlier versions to fixed values to allow for backwards compatibility
 */
function convertGroupCreateOptionsToFixedValues(data: GroupCreateRequest) {
    const groupCreator = [ApiState.user().id];
    const addAsAdmin = data.message.addAsAdmin !== false;
    const maybeAddCreatorAsAdmin = addAsAdmin ? groupCreator : [];
    // In the case addAsAdmin is false, an earlier check insures an ownerUserId was provided so defaultAdmins will have at-least one userId.
    let adminList = data.message.ownerUserId ? [data.message.ownerUserId].concat(maybeAddCreatorAsAdmin) : maybeAddCreatorAsAdmin;
    let memberList = data.message.addAsMember ? groupCreator : [];
    if (data.message.userLists) {
        adminList = data.message.userLists.adminList.length > 0 ? adminList.concat(data.message.userLists.adminList) : adminList;
        memberList = data.message.userLists.memberList.length > 0 ? data.message.userLists.memberList.concat(memberList) : memberList;
    }
    return {
        groupID: data.message.groupID,
        groupName: data.message.groupName,
        adminList: adminList,
        memberList: memberList,
        ownerUserId: data.message.ownerUserId, // If ownerUserId is undefined an owner will not be sent to the server resulting the creator being the owner by defult
        needsRotation: data.message.needsRotation === true,
    };
}

/* tslint:disable cyclomatic-complexity */
function onParentPortMessage(data: RequestMessage, callback: (message: ResponseMessage, transferList?: Uint8Array[]) => void) {
    const errorHandler = errorResponse.bind(null, callback);

    switch (data.type) {
        case "ROTATE_USER_PRIVATE_KEY":
            return UserApi.rotateUserMasterKey(data.message.passcode).engage(errorHandler, () =>
                callback({
                    type: "ROTATE_USER_PRIVATE_KEY_RESPONSE",
                    message: null,
                })
            );
        case "FRAME_LOADED_CHECK":
            return callback({type: "FRAME_LOADED_CHECK_RESPONSE"});
        case "INIT_SDK":
            return Init.initialize(data.message.jwtToken, data.message.symmetricKey).engage(errorHandler, callback);
        case "CREATE_USER":
            return Init.createUser(data.message.jwtToken, data.message.passcode, data.message.needsRotation).engage(errorHandler, callback);
        case "CREATE_USER_AND_DEVICE":
            return Init.createUserAndDevice(data.message.jwtToken, data.message.passcode).engage(errorHandler, callback);
        case "GEN_DEVICE_KEYS":
            return Init.generateUserNewDeviceKeys(data.message.jwtToken, data.message.passcode).engage(errorHandler, callback);
        case "CREATE_DETATCHED_USER_DEVICE":
            return Init.createDetachedUserDevice(data.message.jwtToken, data.message.passcode).engage(errorHandler, (result) =>
                callback({type: "CREATE_DETATCHED_USER_DEVICE_RESPONSE", message: result})
            );
        case "DELETE_DEVICE":
            return UserApi.deleteDevice(data.message).engage(errorHandler, (result) => callback({type: "DELETE_DEVICE_RESPONSE", message: result}));
        case "DELETE_DEVICE_BY_SIGNING_KEY":
            return UserApi.deleteDeviceBySigningKey(data.message).engage(errorHandler, (result) => callback({type: "DELETE_DEVICE_RESPONSE", message: result}));
        case "DELETE_DEVICE_BY_SIGNING_KEY_JWT":
            return UserApi.deleteDeviceBySigningKeyWithJwt(data.message.jwtToken, data.message.publicSigningKey).engage(errorHandler, (result) =>
                callback({type: "DELETE_DEVICE_RESPONSE", message: result})
            );
        case "CHANGE_USER_PASSCODE":
            return UserApi.changeUsersPasscode(data.message.currentPasscode, data.message.newPasscode).engage(errorHandler, () =>
                callback({type: "CHANGE_USER_PASSCODE_RESPONSE", message: null})
            );
        case "LIST_DEVICES":
            return UserApi.listDevices().engage(errorHandler, (result) => callback({type: "LIST_DEVICES_RESPONSE", message: result}));
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
        case "DOCUMENT_UNMANAGED_DECRYPT":
            return DocumentAdvancedApi.decryptWithProvidedEdeks(data.message.documentData, data.message.edeks).engage(errorHandler, (documentData) =>
                callback({type: "DOCUMENT_UNMANAGED_DECRYPT_RESPONSE", message: documentData}, [documentData.data])
            );
        case "DOCUMENT_STORE_ENCRYPT":
            return DocumentApi.encryptToStore(
                data.message.documentID,
                data.message.documentData,
                data.message.documentName,
                data.message.userGrants,
                data.message.groupGrants,
                //Explcitly check against false because earlier versions of the shim won't pass this argument to updated
                //versions of the frame. We want to coerce all falsey values to make this option true and only set this
                //to false when directly passed false.
                data.message.grantToAuthor !== false,
                data.message.policy
            ).engage(errorHandler, (documentMeta) => callback({type: "DOCUMENT_STORE_ENCRYPT_RESPONSE", message: documentMeta}));
        case "DOCUMENT_ENCRYPT":
            return DocumentApi.encryptLocalDocument(
                data.message.documentID,
                data.message.documentData,
                data.message.documentName,
                data.message.userGrants,
                data.message.groupGrants,
                //Explcitly check against false because earlier versions of the shim won't pass this argument to updated
                //versions of the frame. We want to coerce all falsey values to make this option true and only set this
                //to false when directly passed false.
                data.message.grantToAuthor !== false,
                data.message.policy
            ).engage(errorHandler, (encryptedDoc) => callback({type: "DOCUMENT_ENCRYPT_RESPONSE", message: encryptedDoc}, [encryptedDoc.document]));
        case "DOCUMENT_UNMANAGED_ENCRYPT":
            return DocumentAdvancedApi.encrypt(
                data.message.documentID,
                data.message.documentData,
                data.message.userGrants,
                data.message.groupGrants,
                data.message.grantToAuthor,
                data.message.policy
            ).engage(errorHandler, (encryptedDoc) => callback({type: "DOCUMENT_UNMANAGED_ENCRYPT_RESPONSE", message: encryptedDoc}, [encryptedDoc.document]));
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
            const standardFormResult = convertGroupCreateOptionsToFixedValues(data);
            return GroupApi.create(
                standardFormResult.groupID,
                standardFormResult.groupName,
                standardFormResult.needsRotation,
                standardFormResult.memberList,
                standardFormResult.adminList,
                standardFormResult.ownerUserId
            ).engage(errorHandler, (newGroup) => callback({type: "GROUP_CREATE_RESPONSE", message: newGroup}));
        case "ROTATE_GROUP_PRIVATE_KEY":
            return GroupApi.rotateGroupPrivateKey(data.message.groupID).engage(errorHandler, (updateGroupKey) =>
                callback({
                    type: "ROTATE_GROUP_PRIVATE_KEY_RESPONSE",
                    message: updateGroupKey,
                })
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
        case "BLIND_SEARCH_INDEX_CREATE":
            return SearchApi.createBlindSearchIndex(data.message.groupId).engage(errorHandler, (message) =>
                callback({type: "BLIND_SEARCH_INDEX_CREATE_RESPONSE", message})
            );
        case "BLIND_SEARCH_INDEX_INIT":
            return SearchApi.initializeBlindSearchIndex(data.message.searchIndexEncryptedSalt, data.message.searchIndexEdeks).engage(errorHandler, (message) =>
                callback({type: "BLIND_SEARCH_INDEX_INIT_RESPONSE", message: {searchIndexId: message}})
            );
        case "BLIND_SEARCH_INDEX_TOKENIZE_DATA":
            return SearchApi.tokenizeData(data.message.searchIndexId, data.message.data, data.message.partitionId).engage(errorHandler, (message) =>
                callback({type: "BLIND_SEARCH_INDEX_TOKENIZE_DATA_RESPONSE", message})
            );
        case "BLIND_SEARCH_INDEX_TOKENIZE_QUERY":
            return SearchApi.tokenizeQuery(data.message.searchIndexId, data.message.query, data.message.partitionId).engage(errorHandler, (message) =>
                callback({type: "BLIND_SEARCH_INDEX_TOKENIZE_QUERY_RESPONSE", message})
            );
        case "SEARCH_TRANSLITERATE_STRING":
            return SearchApi.transliterateString(data.message).engage(errorHandler, (message) =>
                callback({type: "SEARCH_TRANSLITERATE_STRING_RESPONSE", message})
            );
        default:
            //Force TS to tell us if we ever create a new request type that we don't handle here
            const exhaustiveCheck: never = data;
            return exhaustiveCheck;
    }
}
/* tslint:enable cyclomatic-complexity */

export const messenger = new FrameMessenger(onParentPortMessage);

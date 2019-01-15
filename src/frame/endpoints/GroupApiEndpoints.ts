import Future from "futurejs";
import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import {ErrorCodes} from "../../Constants";
import {transformKeyToBase64, publicKeyToBase64} from "../../lib/Utils";
import ApiState from "../ApiState";
import * as ApiRequest from "../ApiRequest";
import {TransformKeyGrant} from "../worker/crypto/recrypt";
import SDKError from "../../lib/SDKError";

export interface GroupListResponseType {
    result: GroupApiFullResponse[];
}
type GroupGetResponseType = GroupApiBasicResponse | GroupApiFullDetailResponse;
type GroupCreateResponseType = GroupApiFullDetailResponse;
interface GroupCreatePayload {
    userID: string;
    groupPublicKey: PublicKey<Uint8Array>;
    groupEncryptedPrivateKey: PREEncryptedMessage;
    userPublicKey: PublicKey<Uint8Array>;
    name?: string;
    transformKey?: TransformKey;
}
export interface GroupMemberModifyResponseType {
    succeededIds: Array<{userId: string}>;
    failedIds: Array<{userId: string; errorMessage: string}>;
}

/**
 * Generate signature message from current user state
 */
function getSignatureHeader() {
    const {segmentId, id} = ApiState.user();
    return ApiRequest.getRequestSignature(segmentId, id, ApiState.signingKeys());
}

/**
 * Get API request details for group list
 * @param {string[]}         groupIDList Optional list of group IDs to retrieve. If omitted all groups will be returned.
 */
function groupList(groupIDList: string[] = []) {
    const groupFilter = groupIDList.length ? `?id=${groupIDList.map(encodeURIComponent).join(",")}` : "";
    return {
        url: `groups${groupFilter}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.GROUP_LIST_REQUEST_FAILURE,
    };
}

/**
 * Get a specific group by ID
 * @param {string}           groupID ID of group
 */
function groupGet(groupID: string) {
    return {
        url: `groups/${encodeURIComponent(groupID)}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.GROUP_GET_REQUEST_FAILURE,
    };
}

/**
 * Create a new group
 * @param {string}             groupID       Client provided ID for group
 * @param {GroupCreatePayload} createPayload Group content including keys, optional group name, and current user info to be added as group admin
 */
function groupCreate(groupID: string, createPayload: GroupCreatePayload) {
    const userPublicKeyString = publicKeyToBase64(createPayload.userPublicKey);
    let memberList;
    if (createPayload.transformKey) {
        memberList = [
            {
                userId: createPayload.userID,
                userMasterPublicKey: userPublicKeyString,
                transformKey: transformKeyToBase64(createPayload.transformKey),
            },
        ];
    }

    return {
        url: `groups`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: groupID || undefined,
                name: createPayload.name || undefined,
                groupPublicKey: publicKeyToBase64(createPayload.groupPublicKey),
                admins: [
                    {
                        ...createPayload.groupEncryptedPrivateKey,
                        user: {
                            userId: createPayload.userID,
                            userMasterPublicKey: userPublicKeyString,
                        },
                    },
                ],
                members: memberList,
            }),
        },
        errorCode: ErrorCodes.GROUP_CREATE_REQUEST_FAILURE,
    };
}

/**
 * Update a group. Currently only supports updating a group's name to a new value or clearing it.
 * @param {string}           groupID   ID of the group to update
 * @param {string|null}      groupName New name of the group or null to clear
 */
function groupUpdate(groupID: string, groupName: string | null) {
    return {
        url: `groups/${encodeURIComponent(groupID)}`,
        options: {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: groupName,
            }),
        },
        errorCode: ErrorCodes.GROUP_UPDATE_REQUEST_FAILURE,
    };
}

/**
 * Add the list of admins to the group by sending in their encrypted access keys
 * @param {string}               groupID     ID of the group to add admins
 * @param {EncryptedAccessKey[]} addedAdmins List of admin encrypted access keys to add
 */
function addAdmins(groupID: string, addedAdmins: EncryptedAccessKey[]) {
    return {
        url: `groups/${encodeURIComponent(groupID)}/admins`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                admins: addedAdmins.map((admin) => ({
                    user: {
                        userId: admin.id,
                        userMasterPublicKey: admin.publicKey,
                    },
                    ...admin.encryptedPlaintext,
                })),
            }),
        },
        errorCode: ErrorCodes.GROUP_ADD_ADMINS_REQUEST_FAILURE,
    };
}

/**
 * Remove the provided list of user IDs as admins from the group.
 * @param {string}           groupID       ID of the group to remove admins from
 * @param {string[]}         removedAdmins List of admins to remove from the group
 */
function removeAdmins(groupID: string, removedAdmins: string[]) {
    return {
        url: `groups/${encodeURIComponent(groupID)}/admins`,
        options: {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                users: removedAdmins.map((userId) => ({userId})),
            }),
        },
        errorCode: ErrorCodes.GROUP_REMOVE_ADMINS_REQUEST_FAILURE,
    };
}

/**
 * Add the list of members to the group by sending in their transformed keys
 * @param {string}              groupID      ID of group to add members to
 * @param {TransformKeyGrant[]} addedMembers List of member transform keys to add
 */
function addMembers(groupID: string, addedMembers: TransformKeyGrant[]) {
    return {
        url: `groups/${encodeURIComponent(groupID)}/users`,
        options: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                users: addedMembers.map((member) => ({
                    userId: member.id,
                    userMasterPublicKey: member.publicKey,
                    transformKey: transformKeyToBase64(member.transformKey),
                })),
            }),
        },
        errorCode: ErrorCodes.GROUP_ADD_MEMBERS_REQUEST_FAILURE,
    };
}

/**
 * Remove the list of members from the group by sending in all their IDs.
 * @param {string}           groupID        ID of group to remove members from
 * @param {string[]}         removedMembers List of user IDs to remove from group
 */
function removeMembers(groupID: string, removedMembers: string[]) {
    return {
        url: `groups/${encodeURIComponent(groupID)}/users`,
        options: {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                users: removedMembers.map((userId) => ({userId})),
            }),
        },
        errorCode: ErrorCodes.GROUP_REMOVE_MEMBERS_REQUEST_FAILURE,
    };
}

/**
 * Delete a group given its ID
 */
function groupDelete(groupID: string) {
    return {
        url: `groups/${encodeURIComponent(groupID)}`,
        options: {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        },
        errorCode: ErrorCodes.GROUP_DELETE_REQUEST_FAILURE,
    };
}

export default {
    /**
     * Invokes the group list API
     */
    callGroupListApi() {
        const {url, options, errorCode} = groupList();
        return ApiRequest.fetchJSON<GroupListResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Eventually this will allow us to get a filtered list of groups based on the provided list of group IDs. But for now it's
     * just getting the entire list of groups available to the current user.
     * @param {string[]} groupIDs List of group IDs to retrieve
     */
    callGroupKeyListApi(groupIDs: string[]): Future<SDKError, GroupListResponseType> {
        if (!groupIDs.length) {
            return Future.of({result: []});
        }
        const {url, options, errorCode} = groupList(groupIDs);
        return ApiRequest.fetchJSON<GroupListResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Call group get API
     * @param {string} groupID ID of the group to retrieve
     */
    callGroupGetApi(groupID: string) {
        const {url, options, errorCode} = groupGet(groupID);
        return ApiRequest.fetchJSON<GroupGetResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Call group create API and map results to group response
     * @param {string}                groupID                  Client provided ID of group to create
     * @param {PublicKey<Uint8Array>} groupPublicKey           Public key for new group
     * @param {PREEncryptedMessage}   groupEncryptedPrivateKey Encrypted group private key content
     * @param {string}                groupName                Optional name to set for group
     */
    callGroupCreateApi(
        groupID: string,
        groupPublicKey: PublicKey<Uint8Array>,
        groupEncryptedPrivateKey: PREEncryptedMessage,
        groupName?: string,
        transformKey?: TransformKey
    ) {
        const {url, options, errorCode} = groupCreate(groupID, {
            userID: ApiState.user().id,
            groupPublicKey,
            groupEncryptedPrivateKey,
            userPublicKey: ApiState.userPublicKey(),
            name: groupName,
            transformKey,
        });
        return ApiRequest.fetchJSON<GroupCreateResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Update a groups name to a new value or clear it's current value by providing null.
     */
    callGroupUpdateApi(groupID: string, groupName: string | null) {
        const {url, options, errorCode} = groupUpdate(groupID, groupName);
        return ApiRequest.fetchJSON<GroupApiBasicResponse>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Call the group add member API and map results to success/failed IDs
     * @param {string}               groupID   ID of group to add admins to
     * @param {EncryptedAccessKey[]} adminList List of admin users to add to the group
     */
    callAddAdminsApi(groupID: string, adminList: EncryptedAccessKey[]) {
        const {url, options, errorCode} = addAdmins(groupID, adminList);
        return ApiRequest.fetchJSON<GroupMemberModifyResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Invoke the group admin remove API and map results to success/failure IDs
     * @param {string}   groupID   ID of group to modify
     * @param {string[]} adminList List of the admins to remove
     */
    callRemoveAdminsApi(groupID: string, adminList: string[]) {
        const {url, options, errorCode} = removeAdmins(groupID, adminList);
        return ApiRequest.fetchJSON<GroupMemberModifyResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Invoke the group add member API and map results to success/failed IDs
     * @param {string}              groupID    ID of the group to add members to
     * @param {TransformKeyGrant[]} memberList List of users and transform keys to add to group
     */
    callAddMembersApi(groupID: string, memberList: TransformKeyGrant[]) {
        const {url, options, errorCode} = addMembers(groupID, memberList);
        return ApiRequest.fetchJSON<GroupMemberModifyResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Invoke the group remove member API and map results to success/failure IDs
     * @param {string}   groupID    ID of group to modify
     * @param {string[]} memberList List of IDs of users to remove
     */
    callRemoveMembersApi(groupID: string, memberList: string[]) {
        const {url, options, errorCode} = removeMembers(groupID, memberList);
        return ApiRequest.fetchJSON<GroupMemberModifyResponseType>(url, errorCode, options, getSignatureHeader());
    },

    /**
     * Delete a group given its ID
     * @param {string} groupID ID of group to delete
     */
    callGroupDeleteApi(groupID: string) {
        const {url, options, errorCode} = groupDelete(groupID);
        return ApiRequest.fetchJSON<{id: string}>(url, errorCode, options, getSignatureHeader());
    },
};

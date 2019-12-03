import Future from "futurejs";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import {publicKeyToBase64, transformKeyToBase64} from "../../lib/Utils";
import {makeAuthorizedApiRequest} from "../ApiRequest";
import {TransformKeyGrant} from "../worker/crypto/recrypt";
import {fromByteArray} from "base64-js";

export interface GroupListResponseType {
    result: GroupApiFullResponse[];
}
type GroupGetResponseType = GroupApiBasicResponse | GroupApiFullDetailResponse;
type GroupCreateResponseType = GroupApiFullDetailResponse;
interface GroupCreatePayload {
    groupPublicKey: PublicKey<Uint8Array>;
    encryptedAccessKeys: EncryptedAccessKey[];
    transformKeyGrantList: TransformKeyGrant[];
    name?: string;
    ownerUserId?: string;
}
export interface GroupMemberModifyResponseType {
    succeededIds: {userId: string}[];
    failedIds: {userId: string; errorMessage: string}[];
}

/**
 * Get API request details for group list
 * @param {string[]} groupIDList Optional list of group IDs to retrieve. If omitted all groups will be returned.
 */
function groupList(groupIDList: string[] = []) {
    const groupFilter = groupIDList.length ? `?id=${encodeURIComponent(groupIDList.join(","))}` : "";
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
 * @param {boolean}            needsRotation Flag for seting the groups needsRotation statues
 */
function groupCreate(groupID: string, createPayload: GroupCreatePayload, needsRotation: boolean) {
    let memberList;

    if (createPayload.transformKeyGrantList.length > 0) {
        memberList = createPayload.transformKeyGrantList.map((member) => ({
            userId: member.id,
            userMasterPublicKey: member.publicKey,
            transformKey: transformKeyToBase64(member.transformKey),
        }));
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
                owner: createPayload.ownerUserId || undefined,
                groupPublicKey: publicKeyToBase64(createPayload.groupPublicKey),
                admins: createPayload.encryptedAccessKeys.map((admin) => ({
                    user: {
                        userId: admin.id,
                        userMasterPublicKey: admin.publicKey,
                    },
                    ...admin.encryptedPlaintext,
                })),
                members: memberList,
                needsRotation,
            }),
        },
        errorCode: ErrorCodes.GROUP_CREATE_REQUEST_FAILURE,
    };
}

function groupPrivateKeyUpdate(groupID: string, encryptedAccessKeys: EncryptedAccessKey[], augmentationFactor: Uint8Array, keyID: number) {
    return {
        url: `groups/${encodeURIComponent(groupID)}/keys/${keyID}`,
        options: {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                augmentationFactor: fromByteArray(augmentationFactor),
                admins: encryptedAccessKeys.map((admin) => ({
                    user: {
                        userId: admin.id,
                        userMasterPublicKey: admin.publicKey,
                    },
                    ...admin.encryptedPlaintext,
                })),
            }),
        },
        errorCode: ErrorCodes.GROUP_UPDATE_KEY_REQUEST_FAILURE,
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
function addAdmins(groupID: string, addedAdmins: EncryptedAccessKey[], signature: Uint8Array) {
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
                signature: fromByteArray(signature),
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
function addMembers(groupID: string, addedMembers: TransformKeyGrant[], signature: Uint8Array) {
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
                signature: fromByteArray(signature),
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
        return makeAuthorizedApiRequest<GroupListResponseType>(url, errorCode, options);
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
        return makeAuthorizedApiRequest<GroupListResponseType>(url, errorCode, options);
    },

    /**
     * Call group get API
     * @param {string} groupID ID of the group to retrieve
     */
    callGroupGetApi(groupID: string) {
        const {url, options, errorCode} = groupGet(groupID);
        return makeAuthorizedApiRequest<GroupGetResponseType>(url, errorCode, options);
    },

    /**
     * Call group create API and map results to group response
     * @param {string}                groupID                  Client provided ID of group to create
     * @param {PublicKey<Uint8Array>} groupPublicKey           Public key for new group
     * @param {PREEncryptedMessage}   groupEncryptedPrivateKey Encrypted group private key content
     * @param {boolean}               needsRotation            NeedsRotation flag
     * @param {TransformKeyGrant[]}   transformKeyGrantList    List of users to initialize as members on greap creation
     * @param {string}                groupName                Optional name to set for group
     */
    callGroupCreateApi(
        groupID: string,
        groupPublicKey: PublicKey<Uint8Array>,
        encryptedAccessKeys: EncryptedAccessKey[],
        needsRotation: boolean,
        transformKeyGrantList: TransformKeyGrant[],
        ownerUserId?: string,
        groupName?: string
    ): Future<SDKError, GroupCreateResponseType> {
        const {url, options, errorCode} = groupCreate(
            groupID,
            {
                groupPublicKey,
                encryptedAccessKeys,
                transformKeyGrantList,
                name: groupName,
                ownerUserId,
            },
            needsRotation
        );
        return makeAuthorizedApiRequest<GroupCreateResponseType>(url, errorCode, options);
    },

    callGroupPrivateKeyUpdateApi(groupID: string, encryptedAccessKeys: EncryptedAccessKey[], augmentationFactor: Uint8Array, keyID: number) {
        const {url, options, errorCode} = groupPrivateKeyUpdate(groupID, encryptedAccessKeys, augmentationFactor, keyID);
        return makeAuthorizedApiRequest<GroupMemberModifyResponseType>(url, errorCode, options);
    },

    /**
     * Update a groups name to a new value or clear it's current value by providing null.
     */
    callGroupUpdateApi(groupID: string, groupName: string | null) {
        const {url, options, errorCode} = groupUpdate(groupID, groupName);
        return makeAuthorizedApiRequest<GroupApiBasicResponse>(url, errorCode, options);
    },

    /**
     * Call the group add member API and map results to success/failed IDs
     * @param {string}               groupID   ID of group to add admins to
     * @param {EncryptedAccessKey[]} adminList List of admin users to add to the group
     */
    callAddAdminsApi(groupID: string, adminList: EncryptedAccessKey[], signature: Uint8Array) {
        const {url, options, errorCode} = addAdmins(groupID, adminList, signature);
        return makeAuthorizedApiRequest<GroupMemberModifyResponseType>(url, errorCode, options);
    },

    /**
     * Invoke the group admin remove API and map results to success/failure IDs
     * @param {string}   groupID   ID of group to modify
     * @param {string[]} adminList List of the admins to remove
     */
    callRemoveAdminsApi(groupID: string, adminList: string[]) {
        const {url, options, errorCode} = removeAdmins(groupID, adminList);
        return makeAuthorizedApiRequest<GroupMemberModifyResponseType>(url, errorCode, options);
    },

    /**
     * Invoke the group add member API and map results to success/failed IDs
     * @param {string}              groupID    ID of the group to add members to
     * @param {TransformKeyGrant[]} memberList List of users and transform keys to add to group
     */
    callAddMembersApi(groupID: string, memberList: TransformKeyGrant[], signature: Uint8Array) {
        const {url, options, errorCode} = addMembers(groupID, memberList, signature);
        return makeAuthorizedApiRequest<GroupMemberModifyResponseType>(url, errorCode, options);
    },

    /**
     * Invoke the group remove member API and map results to success/failure IDs
     * @param {string}   groupID    ID of group to modify
     * @param {string[]} memberList List of IDs of users to remove
     */
    callRemoveMembersApi(groupID: string, memberList: string[]) {
        const {url, options, errorCode} = removeMembers(groupID, memberList);
        return makeAuthorizedApiRequest<GroupMemberModifyResponseType>(url, errorCode, options);
    },

    /**
     * Delete a group given its ID
     * @param {string} groupID ID of group to delete
     */
    callGroupDeleteApi(groupID: string) {
        const {url, options, errorCode} = groupDelete(groupID);
        return makeAuthorizedApiRequest<{id: string}>(url, errorCode, options);
    },
};

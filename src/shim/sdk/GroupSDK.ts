import * as FrameMediator from "../FrameMediator";
import * as MT from "../../FrameMessageTypes";
import * as ShimUtils from "../ShimUtils";
import {GroupCreateOptions, GroupUpdateOptions} from "../../../ironweb";

/**
 * List all groups that the current user is either an admin or member of.
 */
export function list() {
    ShimUtils.checkSDKInitialized();
    return FrameMediator.sendMessage<MT.GroupListResponse>({type: "GROUP_LIST"})
        .map(({message}) => message)
        .toPromise();
}

/**
 * Get details about a specific group given it's ID.
 * @param {string} groupID ID of group to retrieve
 */
export function get(groupID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    const payload: MT.GroupGetRequest = {
        type: "GROUP_GET",
        message: {
            groupID,
        },
    };
    return FrameMediator.sendMessage<MT.GroupGetResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Create a new group. Takes an options object which allow for specifying an optional, unencrypted ID and name for the group.
 * @param {GroupCreateOptions} options Group creation options
 */
export function create(options: GroupCreateOptions = {groupName: "", addAsMember: true}) {
    ShimUtils.checkSDKInitialized();
    if (options.groupID) {
        ShimUtils.validateID(options.groupID);
    }
    const payload: MT.GroupCreateRequest = {
        type: "GROUP_CREATE",
        message: {
            groupID: options.groupID || "",
            groupName: options.groupName || "",
            addAsMember: options.addAsMember !== false,
            userList: options.userList,
        },
    };
    return FrameMediator.sendMessage<MT.GroupCreateResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Update a group. Currently only supports updating the group name to a new value or clearing it out by passing in null.
 * @param {string}             groupID ID of the group to update.
 * @param {GroupUpdateOptions} options Update options.
 */
export function update(groupID: string, options: GroupUpdateOptions) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    if (options.groupName === null || (typeof options.groupName === "string" && options.groupName.length)) {
        const payload: MT.GroupUpdateRequest = {
            type: "GROUP_UPDATE",
            message: {
                groupID,
                groupName: options.groupName,
            },
        };
        return FrameMediator.sendMessage<MT.GroupUpdateResponse>(payload)
            .map(({message}) => message)
            .toPromise();
    }
    throw new Error("Group update must provide a new name which is either a non-zero length string or null.");
}

/**
 * Add list of users as admins to an existing group.
 * @param {string}   groupID  ID of gropu to add admins to.
 * @param {string[]} userList List of user IDs to add as admins to the group
 */
export function addAdmins(groupID: string, userList: string[]) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    ShimUtils.validateIDList(userList);
    const payload: MT.GroupAddAdminRequest = {
        type: "GROUP_ADD_ADMINS",
        message: {
            groupID,
            userList: ShimUtils.dedupeArray(userList, true),
        },
    };
    return FrameMediator.sendMessage<MT.GroupAddAdminResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Remove list of users as admins from the provided Group ID. This operation can only be performed by an admin of the group. Also note
 * that the group creator cannot be removed as an admin from the group.
 * @param {string}   groupID  ID of the group to remove admins from
 * @param {string[]} userList List of users to remove as admins from the group
 */
export function removeAdmins(groupID: string, userList: string[]) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    ShimUtils.validateIDList(userList);
    const payload: MT.GroupRemoveAdminRequest = {
        type: "GROUP_REMOVE_ADMINS",
        message: {
            groupID,
            userList: ShimUtils.dedupeArray(userList, true),
        },
    };
    return FrameMediator.sendMessage<MT.GroupRemoveAdminResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Add list of users as members to an existing group. This operation can only be performed by an admin of the group.
 * @param {string}   groupID  ID of the group to add members to.
 * @param {string[]} userList List of user IDs to add as members to the group
 */
export function addMembers(groupID: string, userList: string[]) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    ShimUtils.validateIDList(userList);
    const payload: MT.GroupAddMemberRequest = {
        type: "GROUP_ADD_MEMBERS",
        message: {
            groupID,
            userList: ShimUtils.dedupeArray(userList, true),
        },
    };
    return FrameMediator.sendMessage<MT.GroupAddMemberResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Remove list of users as members from an existing group. This operation can only be performed by an admin of the group.
 * @param {string}   groupID  ID of the group to remove members from.
 * @param {string[]} userList List of user IDs to remove as members from the group.
 */
export function removeMembers(groupID: string, userList: string[]) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    ShimUtils.validateIDList(userList);
    const payload: MT.GroupRemoveMemberRequest = {
        type: "GROUP_REMOVE_MEMBERS",
        message: {
            groupID,
            userList: ShimUtils.dedupeArray(userList, true),
        },
    };
    return FrameMediator.sendMessage<MT.GroupRemoveMemberResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Remove the currently authenticated user as a member from the provided group.
 * @param {string} groupID ID of the group to remove the current user from.
 */
export function removeSelfAsMember(groupID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    const payload: MT.GroupRemoveSelfAsMemberRequest = {
        type: "GROUP_REMOVE_SELF_AS_MEMBER",
        message: {groupID},
    };
    return FrameMediator.sendMessage<MT.GroupRemoveMemberResponse>(payload)
        .map(() => undefined)
        .toPromise();
}

/**
 * Delete a group given its ID. WARNING: Deleting a group is permanment and will cause all documents that are encrypted only to the group
 * to be undecryptable.
 * @param {string} groupID ID of the group to delete
 */
export function deleteGroup(groupID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupID);
    const payload: MT.GroupDeleteRequest = {
        type: "GROUP_DELETE",
        message: {groupID},
    };
    return FrameMediator.sendMessage<MT.GroupDeleteResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

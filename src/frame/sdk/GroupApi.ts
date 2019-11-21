import {GroupListResponse, GroupMetaResponse, GroupDetailResponse, GroupCreateOptions, GroupUserEditResponse} from "../../../ironweb";
import ApiState from "../ApiState";
import * as GroupOperations from "./GroupOperations";
import GroupApiEndpoints from "../endpoints/GroupApiEndpoints";
import UserApiEndpoints, {UserKeyListResponseType} from "../endpoints/UserApiEndpoints";
import {GroupPermissions, ErrorCodes} from "../../Constants";
import Future from "futurejs";
import SDKError from "../../lib/SDKError";
import {publicKeyToBase64} from "../../lib/Utils";

export interface InternalGroupCreateOptions extends GroupCreateOptions {
    groupID: string;
    groupName: string;
    owner: string;
    addAsMember: boolean;
    addAsAdmin: boolean;
    needsRotation: boolean;
    userLists?: {
        memberList: string[];
        adminList: string[];
    };
}

/**
 * Type guard to determine if provided group contains the full response meaning the user is either an admin or member.
 */
function isFullGroupResponse(group: GroupApiBasicResponse | GroupApiFullDetailResponse): group is GroupApiFullDetailResponse {
    return Array.isArray((group as GroupApiFullDetailResponse).adminIds);
}

/**
 * Map the results of a group operation which involes multiple IDs into the expected success/failure lists. This method takes the original list of user IDs that were
 * requested by the user, the list of successes from the server, and the list of failures and provides a list of success/failure entities for each item. The original
 * request list is passed in to make sure that we have a result (good or bad) for every user that was requested. For example, if they asked to add 3 users and 1 was
 * successful, one failed, but the last couldn't be found, this method ensures the result includes a failure for the user who could not be found.
 */
function mapOperationToSuccessAndFailureList(
    requestedList: string[],
    succeededIds: {userId: string}[],
    failedIDs: {userId: string; errorMessage: string}[]
): GroupUserEditResponse {
    const missingUserList = requestedList
        .filter((id) => {
            return !succeededIds.some(({userId}) => id === userId) && !failedIDs.some(({userId}) => id === userId);
        })
        .map((id) => ({id, error: "ID did not exist in the system."}));

    return {
        succeeded: succeededIds.map(({userId}) => userId),
        failed: failedIDs.map(({userId, errorMessage}) => ({id: userId, error: errorMessage})).concat(missingUserList),
    };
}

/**
 * Convert the internal detailed group representation into the external group representation that we expose out to clients.
 * @param {GroupResponse} group Detailed internal group representation returned from create or get
 */
function formatDetailedGroupResponse(group: GroupApiBasicResponse | GroupApiFullDetailResponse): GroupMetaResponse | GroupDetailResponse {
    const groupBase = {
        groupID: group.id,
        groupName: group.name,
        isAdmin: group.permissions.indexOf(GroupPermissions.ADMIN) !== -1,
        isMember: group.permissions.indexOf(GroupPermissions.MEMBER) !== -1,
        created: group.created,
        updated: group.updated,
    };

    if (isFullGroupResponse(group)) {
        return {
            ...groupBase,
            groupAdmins: group.adminIds,
            groupMembers: group.memberIds,
            needsRotation: typeof group.needsRotation === "boolean" ? group.needsRotation : undefined,
        };
    }
    return groupBase;
}

/**
 * Get a list of all groups that the current user is either a member or admin of.
 */
export function list(): Future<SDKError, GroupListResponse> {
    return GroupApiEndpoints.callGroupListApi().map((groups) => ({
        result: groups.result.map(formatDetailedGroupResponse),
    }));
}

/**
 * Get a specific group based on ID and return the meta info for the group
 * @param {string} groupID ID of group to retrieve
 */
export function get(groupID: string) {
    return GroupApiEndpoints.callGroupGetApi(groupID).map(formatDetailedGroupResponse);
}

/**
 * Create the error strings for missing users
 */
function getListOfMissingUsersFromKeyResponse(userKeysResponse: UserKeyListResponseType, memberList: string[]) {
    const existingUserIDs = userKeysResponse.result.map(({id}) => id);
    return memberList.filter((userID) => !existingUserIDs.includes(userID)).join(", ");
}

/**
 * Checkes that all members listed in member list are existing members
 */
function getCompleteListOfUserPublicKeys(userList: string[]): Future<SDKError, UserOrGroupPublicKey[]> {
    return UserApiEndpoints.callUserKeyListApi(userList).flatMap((userKeysResponse) => {
        if (userKeysResponse.result.length !== userList.length) {
            const missingUsersString = getListOfMissingUsersFromKeyResponse(userKeysResponse, userList);
            return Future.reject(
                new SDKError(
                    new Error(`Failed to create group due to unknown users in user list. Missing user IDs: [${missingUsersString}]`),
                    ErrorCodes.GROUP_CREATE_WITH_MEMBERS_OR_ADMINS_FAILURE
                )
            );
        }
        return Future.of(userKeysResponse.result.map((user) => ({id: user.id, masterPublicKey: user.userMasterPublicKey})));
    });
}

/**
 * Retrieves the master public keys for users in the memberList, adminList and owner. This will return new members list and admin list
 * with the owner (if specified) added to the adminlist if it was not already on it.
 * @param memberList
 * @param adminList
 */
function validateUsers(memberList: string[], adminList: string[], owner: string[]): Future<SDKError, UserOrGroupPublicKey[][]> {
    const uniqueUsers = Array.from(new Set([...memberList, ...adminList, ...owner]).values());
    return memberList.length > 0 || adminList.length > 0
        ? getCompleteListOfUserPublicKeys(uniqueUsers).map((userList) => {
              return [
                  userList.filter((user) => memberList.includes(user.id)),
                  userList.filter((user) => adminList.includes(user.id) || owner.includes(user.id)),
              ];
          })
        : Future.of([[], []]);
}
/**
 * Validates that either an owner was specified or addAsAdmin is true allowing the creator to be the default owner.
 * An error will be returned if no owner is specified and the group creator is not going to be an admin.
 */
function validateOwnership(addAsAdmin: boolean, maybeOwner: string): Future<SDKError, string[]> {
    if (maybeOwner === "" && !addAsAdmin) {
        return Future.reject(
            new SDKError(
                new Error(`Failed to create group because group ownership must be held by a group adminastrator`),
                ErrorCodes.GROUP_CREATE_WITH_MEMBERS_OR_ADMINS_FAILURE
            )
        );
    }
    if (maybeOwner !== "") {
        return Future.of([maybeOwner]);
    }
    // If no owner is specified and addAsAdmin is true an empty array is returned.
    // This will result in the group creator becoming the owner on the server side.
    else return Future.of([]);
}

/**
 * Create a new group with the provided ID and options
 * @param {string}  groupID Client provided optional group ID
 * @param {string}  groupName Client provide optonal group name
 * @param {boolean} addAsMember Whether the group creator shoudl be added as a member upon create
 * @param {boolean} needsRotation Whether the group needs to rotate it private key
 */
export function create(
    groupID: string,
    groupName: string,
    maybeOwner: string,
    addAsMember: boolean,
    addAsAdmin: boolean,
    needsRotation: boolean,
    userLists?: {memberList: string[]; adminList: string[]}
): Future<SDKError, GroupDetailResponse> {
    const creatorID = ApiState.user().id;
    const creatorMemberKey = addAsMember ? [{id: creatorID, masterPublicKey: publicKeyToBase64(ApiState.userPublicKey())}] : [];

    // creatorAdminKey will later be added to the admins list. If the group creator requested to be an admin and placed
    // themselves in the admins list, creatorAdminKey will evaluate to an empty array to prevent the group creator appearing on the admin list twice.

    const creatorAdminKey =
        addAsAdmin && (userLists === undefined || !userLists.adminList.includes(creatorID))
            ? [{id: ApiState.user().id, masterPublicKey: publicKeyToBase64(ApiState.userPublicKey())}]
            : [];
    const isMemberList = userLists !== undefined ? userLists.memberList : [];
    const isAdminList = userLists !== undefined ? userLists.adminList : [];
    return validateOwnership(addAsAdmin, maybeOwner)
        .flatMap((owner) =>
            validateUsers(isMemberList, isAdminList, owner)
                .flatMap(([memberKeys, adminKeys]) => {
                    return GroupOperations.groupCreate(ApiState.signingKeys(), creatorMemberKey.concat(memberKeys), creatorAdminKey.concat(adminKeys));
                })
                .flatMap(({encryptedAccessKeys, groupPublicKey, transformKeyGrantList}) =>
                    GroupApiEndpoints.callGroupCreateApi(groupID, groupPublicKey, owner, encryptedAccessKeys, needsRotation, transformKeyGrantList, groupName)
                )
        )
        .map((createdGroup) => formatDetailedGroupResponse(createdGroup) as GroupDetailResponse);
}

/**
 * Update a group. Currently only allows updating the group name to a new value or clearing it via null.
 */
export function update(groupID: string, groupName: string | null) {
    return GroupApiEndpoints.callGroupUpdateApi(groupID, groupName).map(formatDetailedGroupResponse);
}

/**
 * Add the provided list of user IDs as admins to the group ID provided. Ensures that the calling user is an admin before allowing additional admins
 * to be added.
 * @param {string}   groupID  ID of the group to add admins to
 * @param {string[]} userList List of user IDs to add as admins
 */
export function addAdmins(groupID: string, userList: string[]) {
    const {privateKey} = ApiState.deviceKeys();
    return Future.gather2(GroupApiEndpoints.callGroupGetApi(groupID), UserApiEndpoints.callUserKeyListApi(userList)).flatMap<GroupUserEditResponse>(
        ([group, userKeys]) => {
            //If none of the users they asked to add exist, return a success with each user in the list of failures
            if (userKeys.result.length === 0) {
                return Future.of(mapOperationToSuccessAndFailureList(userList, [], []));
            }
            if (!isFullGroupResponse(group) || !group.encryptedPrivateKey) {
                return Future.reject(
                    new SDKError(
                        new Error("Current user not allowed to add admins as they are not an admin of the group."),
                        ErrorCodes.GROUP_ADD_ADMINS_NOT_ADMIN_FAILURE
                    )
                );
            }
            const userPublicKeys = userKeys.result.map((user) => ({id: user.id, masterPublicKey: user.userMasterPublicKey}));
            return GroupOperations.encryptGroupPrivateKeyToList(
                group.encryptedPrivateKey,
                group.groupMasterPublicKey,
                groupID,
                userPublicKeys,
                privateKey,
                ApiState.signingKeys()
            )
                .flatMap(({encryptedAccessKey, signature}) => GroupApiEndpoints.callAddAdminsApi(groupID, encryptedAccessKey, signature))
                .map(({failedIds, succeededIds}) => mapOperationToSuccessAndFailureList(userList, succeededIds, failedIds));
        }
    );
}

/**
 * Remove the provided list of admin users as admins of the provided group.
 * @param {string}   groupID  Group ID from which to remove admins
 * @param {string[]} userList List of user IDs to remove as admins from the group
 */
export function removeAdmins(groupID: string, userList: string[]) {
    return GroupApiEndpoints.callRemoveAdminsApi(groupID, userList).map(({failedIds, succeededIds}) =>
        mapOperationToSuccessAndFailureList(userList, succeededIds, failedIds)
    );
}

/**
 * Add list of members to the group. Gets the group private key and list of users public keys and generates a transform key from the
 * group private key to each member public key. Will fail if the requesting user is not an admin for the group
 * @param {string}   groupID  ID of group to add members to
 * @param {string[]} userList List of user IDs to add to group
 */
export function addMembers(groupID: string, userList: string[]) {
    const {privateKey} = ApiState.deviceKeys();
    return Future.gather2(GroupApiEndpoints.callGroupGetApi(groupID), UserApiEndpoints.callUserKeyListApi(userList)).flatMap<GroupUserEditResponse>(
        ([group, userKeys]) => {
            //If none of the users they asked to add exist, return a success with each user in the list of failures
            if (userKeys.result.length === 0) {
                return Future.of(mapOperationToSuccessAndFailureList(userList, [], []));
            }
            if (!isFullGroupResponse(group) || !group.encryptedPrivateKey) {
                return Future.reject(
                    new SDKError(
                        new Error("Current user not allowed to add members as they are not an admin of the group."),
                        ErrorCodes.GROUP_ADD_MEMBER_NOT_ADMIN_FAILURE
                    )
                );
            }
            const userPublicKeys = userKeys.result.map((user) => ({id: user.id, masterPublicKey: user.userMasterPublicKey}));
            return GroupOperations.generateGroupTransformKeyToList(
                group.encryptedPrivateKey,
                group.groupMasterPublicKey,
                groupID,
                userPublicKeys,
                privateKey,
                ApiState.signingKeys()
            )
                .flatMap(({transformKeyGrant, signature}) => GroupApiEndpoints.callAddMembersApi(groupID, transformKeyGrant, signature))
                .map(({failedIds, succeededIds}) => mapOperationToSuccessAndFailureList(userList, succeededIds, failedIds));
        }
    );
}

/**
 * Remove list of users from a group. All we have to do is pass the list of user IDs to the API and then map the success/failure IDs appropriately.
 * @param {string}   groupID  ID of group to remove members from
 * @param {string[]} userList List of members to remove
 */
export function removeMembers(groupID: string, userList: string[]) {
    return GroupApiEndpoints.callRemoveMembersApi(groupID, userList).map(({failedIds, succeededIds}) =>
        mapOperationToSuccessAndFailureList(userList, succeededIds, failedIds)
    );
}

/**
 * Remove the current user from the provided group. Invokes the remove members API endpoint, just with the current users ID. Then maps
 * the result since we don't need to return a list of success/failure IDs.
 * @param {string} groupID ID of the group to remove the current user from
 */
export function removeSelfAsMember(groupID: string) {
    const {id} = ApiState.user();
    return removeMembers(groupID, [id]).flatMap((removeResult) => {
        if (removeResult.failed.length > 0) {
            return Future.reject(new SDKError(new Error("User could not be removed from group."), ErrorCodes.GROUP_REMOVE_SELF_REQUEST_FAILURE));
        }
        return Future.of(removeResult.succeeded[0]);
    });
}

/**
 * Delete a group given its ID.
 */
export function deleteGroup(groupID: string) {
    return GroupApiEndpoints.callGroupDeleteApi(groupID);
}

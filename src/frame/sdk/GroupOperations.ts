import * as WorkerMediator from "../WorkerMediator";
import * as WMT from "../../WorkerMessageTypes";

/**
 * Send message to worker to create a new group.
 * @param {SigningKeyPair}              signingKeys   Current users signing keys
 * @param {UserOrGroupPublicKey[]}      memberList    List of users to be initalized as members when the group is created
 * @param {UserOrGroupPublicKey[]}      adminList     List of users to be initalized as admins when the group is created
 */
export function groupCreate(signingKeys: SigningKeyPair, memberList: UserOrGroupPublicKey[], adminList: UserOrGroupPublicKey[]) {
    const payload: WMT.GroupCreateWorkerRequest = {
        type: "GROUP_CREATE",
        message: {signingKeys, memberList, adminList},
    };
    return WorkerMediator.sendMessage<WMT.GroupCreateWorkerResponse>(payload).map(({message}) => message);
}

/**
 * Send message to the worker to rotate the group private key and encrypt the new private key to the provided list of admins
 */
export function rotateAndEncryptNewGroupPrivateKeyToList(
    encryptedGroupKey: TransformedEncryptedMessage,
    adminList: UserOrGroupPublicKey[],
    userPrivateMasterKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    const payload: WMT.RotateGroupPrivateKeyWorkerRequest = {
        type: "ROTATE_GROUP_PRIVATE_KEY",
        message: {
            encryptedGroupKey,
            adminList,
            userPrivateMasterKey,
            signingKeys,
        },
    };
    return WorkerMediator.sendMessage<WMT.RotateGroupPrivateKeyWorkerResponse>(payload).map(({message}) => message);
}

/**
 * Send message to worker to decrypt the groups priavte key and encrypt it to the provided list of user public keys. Used to add additional admins
 * to the group.
 * @param {TransformedEncryptedMessage} encryptedGroupPrivateKey Private key for group
 * @param {PublicKey<string>}           groupPublicKey           Group public key of the group being added to
 * @param {string}                      groupID                  Group Id of the group being added to
 * @param {UserOrGroupPublicKey[]}      userKeyList              List of public keys to encrypt key to
 * @param {PrivateKey<Uint8Array>}      myPrivateKey             Private key of current, admin user
 * @param {SigningKeyPair}              signingKeys              Current users signing keys
 */
export function encryptGroupPrivateKeyToList(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    groupPublicKey: PublicKey<string>,
    groupID: string,
    userKeyList: UserOrGroupPublicKey[],
    myPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    const payload: WMT.GroupAddAdminWorkerRequest = {
        type: "GROUP_ADD_ADMINS",
        message: {
            encryptedGroupKey: encryptedGroupPrivateKey,
            groupPublicKey,
            groupID,
            userKeyList,
            adminPrivateKey: myPrivateKey,
            signingKeys,
        },
    };
    return WorkerMediator.sendMessage<WMT.GroupAddAdminWorkerResponse>(payload).map(({message}) => message);
}

/**
 * Send message to worker to decrypt the groups private key and generate transform keys from it to the list of user public keys provided.
 * @param {TransformedEncryptedMessage} encryptedGroupPrivateKey Response from group GET call
 * @param {PublicKey<string>}           groupPublicKey           Group public key of the group being added to
 * @param {string}                      groupID                  Group Id of the group being added to
 * @param {UserOrGroupPublicKey[]}      userKeyList              List of public keys to generate transform keys to
 * @param {PrivateKey<Uint8Array>}      myPrivateKey             Private key of current, admin user
 * @param {SigningKeyPair}              signingKeys              Current users signing keys
 */
export function generateGroupTransformKeyToList(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    groupPublicKey: PublicKey<string>,
    groupID: string,
    userKeyList: UserOrGroupPublicKey[],
    myPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    const payload: WMT.GroupAddMemberWorkerRequest = {
        type: "GROUP_ADD_MEMBERS",
        message: {
            encryptedGroupKey: encryptedGroupPrivateKey,
            groupPublicKey,
            groupID,
            userKeyList,
            adminPrivateKey: myPrivateKey,
            signingKeys,
        },
    };
    return WorkerMediator.sendMessage<WMT.GroupAddMemberWorkerResponse>(payload).map(({message}) => message);
}

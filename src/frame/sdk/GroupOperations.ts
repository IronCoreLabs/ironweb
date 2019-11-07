import * as WorkerMediator from "../WorkerMediator";
import * as WMT from "../../WorkerMessageTypes";

/**
 * Send message to worker to create a new group.
 * @param {PublicKey<Uint8Array>} userPublicKey Users public key to encrypt document key to. The user who is creating this group will become the first group admin
 * @param {SigningKeyPair}        signingKeys   Current users signing keys
 * @param {boolean}               addAsMember   Whether to also add user who is creating group as a member of the group
 */
export function groupCreate(userPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair, addAsMember: boolean) {
    const payload: WMT.GroupCreateWorkerRequest = {
        type: "GROUP_CREATE",
        message: {userPublicKey, signingKeys, addAsMember},
    };
    return WorkerMediator.sendMessage<WMT.GroupCreateWorkerResponse>(payload).map(({message}) => message);
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
 * @param {UserOrGroupPublicKey[]}      userKeyList              List of public keys to generate transform keys to
 * @param {PrivateKey<Uint8Array>}      myPrivateKey             Private key of current, admin user
 * @param {SigningKeyPair}              signingKeys              Current users signing keys
 */
export function generateGroupTransformKeyToList(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    userKeyList: UserOrGroupPublicKey[],
    myPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    const payload: WMT.GroupAddMemberWorkerRequest = {
        type: "GROUP_ADD_MEMBERS",
        message: {
            encryptedGroupKey: encryptedGroupPrivateKey,
            userKeyList,
            adminPrivateKey: myPrivateKey,
            signingKeys,
        },
    };
    return WorkerMediator.sendMessage<WMT.GroupAddMemberWorkerResponse>(payload).map(({message}) => message);
}

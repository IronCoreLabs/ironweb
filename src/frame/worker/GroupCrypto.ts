import loadRecrypt from "./crypto/recrypt";
import Future from "futurejs";
import SDKError from "../../lib/SDKError";
import {ErrorCodes} from "../../Constants";
import {publicKeyToBytes} from "../../lib/Utils";

/**
 * Create the keys for a new group. Generates a new keypair for the group and encrypts the value used to generate the
 * group private key to the provided user public key
 * @param {PublicKey<Uint8Array>} userPublicKey Public key of groups created and first admin
 * @param {SigningKeyPair}        signingKeys   Current users signing keys used to sign transform key
 * @param {boolean}               addAsMember   Whether to add the current group admin as a member
 */
export function createGroup(userPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair, memberList: UserOrGroupPublicKey[]) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Recrypt.generateGroupKeyPair().flatMap(({publicKey, plaintext, privateKey}) => {
                return Future.gather2(
                    Recrypt.encryptPlaintext(plaintext, userPublicKey, signingKeys),
                    Recrypt.generateTransformKeyToList(privateKey, memberList, signingKeys)
                ).map(([encryptedGroupKey, transformKeyGrantList]) => ({
                    encryptedGroupKey,
                    groupPublicKey: publicKey,
                    transformKeyGrantList,
                }));
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_KEY_GENERATION_FAILURE));
}

/**
 * Generate schnorr siganture and encrypted access keys to the groups private key for the provided list of users in order to make them admins of the group.
 * @param {TransformedEncryptedMessage} encryptedGroupPrivateKey Groups encrypted private key
 * @param {PublicKey<string>}           groupPublicKey           Group public key of the group being added to
 * @param {string}                      groupID                  Group Id of the group being added to
 * @param {UserOrGroupPublicKey[]}      userKeyList              List of user public keys to encrypt group private key to
 * @param {PrivateKey<Uint8Array>}      adminPrivateKey          Private key for the admin who is adding the other admins. The current user performing this operation.
 * @param {SigningKeyPair}              signingKeys              Signing keys for the admin adding the other admins. The current user performing this operation.
 */
export function addAdminsToGroup(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    groupPublicKey: PublicKey<string>,
    groupID: string,
    userKeyList: UserOrGroupPublicKey[],
    adminPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Recrypt.decryptPlaintext(encryptedGroupPrivateKey, adminPrivateKey).flatMap(([plaintext, key]) => {
                return Recrypt.encryptPlaintextToList(plaintext, userKeyList, signingKeys).map((encryptedAccessKey) => ({
                    encryptedAccessKey,
                    signature: Recrypt.schnorrSignUtf8String(key, publicKeyToBytes(groupPublicKey), groupID),
                }));
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_KEY_DECRYPTION_FAILURE));
}

/**
 * Decrypt the provided group private key and use it to generate Schnorr signature and transform keys to each public user key provided.
 * @param {TransformedEncryptedMessage} groupPrivateKey Encrypted private key for group
 * @param {PublicKey<string>}           groupPublicKey  Group public key of the group being added to
 * @param {string}                      groupID         Group Id of the group being added to
 * @param {UserOrGroupPublicKey[]}      userKeyList     List of user public keys to generate transform keys to
 * @param {PrivateKey<Uint8Array>}      adminPrivateKey Private key of the group add who is adding these new members.
 * @param {SigningKeyPair}              signingKeys     Current users signing keys used to sign transform key
 */
export function addMembersToGroup(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    groupPublicKey: PublicKey<string>,
    groupID: string,
    userKeyList: UserOrGroupPublicKey[],
    adminPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Recrypt.decryptPlaintext(encryptedGroupPrivateKey, adminPrivateKey).flatMap(([_, key]) => {
                return Recrypt.generateTransformKeyToList(key, userKeyList, signingKeys).map((transformKeyGrant) => ({
                    transformKeyGrant,
                    signature: Recrypt.schnorrSignUtf8String(key, publicKeyToBytes(groupPublicKey), groupID),
                }));
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_MEMBER_KEY_ENCRYPTION_FAILURE));
}

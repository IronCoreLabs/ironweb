import loadRecrypt from "./crypto/recrypt";
import Future from "futurejs";
import SDKError from "../../lib/SDKError";
import {ErrorCodes} from "../../Constants";

/**
 * Create the keys for a new group. Generates a new keypair for the group and encrypts the value used to generate the
 * group private key to the provided user public key
 * @param {PublicKey<Uint8Array>} userPublicKey Public key of groups created and first admin
 * @param {SigningKeyPair}        signingKeys   Current users signing keys used to sign transform key
 * @param {boolean}               addAsMember   Whether to add the current group admin as a member
 */
export function createGroup(userPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair, addAsMember: boolean) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Recrypt.generateGroupKeyPair().flatMap(({publicKey, plaintext, privateKey}) => {
                return Future.gather2(
                    Recrypt.encryptPlaintext(plaintext, userPublicKey, signingKeys),
                    addAsMember ? Recrypt.generateTransformKey(privateKey, userPublicKey, signingKeys) : Future.of(undefined)
                ).map(([encryptedGroupKey, transformKey]) => ({
                    encryptedGroupKey,
                    groupPublicKey: publicKey,
                    transformKey,
                }));
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_KEY_GENERATION_FAILURE));
}

/**
 * Generate encrypted access keys to the groups private key for the provided list of users in order to make them admins of the group.
 * @param {TransformedEncryptedMessage} encryptedGroupPrivateKey Groups encrypted private key
 * @param {UserOrGroupPublicKey[]}      userKeyList              List of user public keys to encrypt group private key to
 * @param {PrivateKey<Uint8Array>}      adminPrivateKey          Private key for the admin who is adding the other admins. The current user performing this operation.
 * @param {SigningKeyPair}              signingKeys              Signing keys for the admin adding the other admins. The current user performing this operation.
 */
export function addAdminsToGroup(
    encryptedGroupPrivateKey: TransformedEncryptedMessage,
    userKeyList: UserOrGroupPublicKey[],
    adminPrivateKey: PrivateKey<Uint8Array>,
    signingKeys: SigningKeyPair
) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Recrypt.decryptPlaintext(encryptedGroupPrivateKey, adminPrivateKey).flatMap(([plaintext]) =>
                Recrypt.encryptPlaintextToList(plaintext, userKeyList, signingKeys)
            );
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_KEY_DECRYPTION_FAILURE));
}

/**
 * Decrypt the provided group private key and use it to generate transform keys to each public user key provided.
 * @param {TransformedEncryptedMessage} groupPrivateKey Encrypted private key for group
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
                return Future.gather2(
                    Recrypt.generateTransformKeyToList(key, userKeyList, signingKeys),
                    Recrypt.generateAddMemberSignature(key, groupPublicKey, groupID)
                ).map(([transformKeyGrant, signature]) => ({
                    transformKeyGrant,
                    signature,
                }));
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.GROUP_MEMBER_KEY_ENCRYPTION_FAILURE));
}

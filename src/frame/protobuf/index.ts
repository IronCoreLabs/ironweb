import {toByteArray} from "base64-js";
import {publicKeyToBytes} from "../../lib/Utils";
import {ironcorelabs} from "./EncryptedDeks";
const {
    EncryptedDeks: PBEDeks,
    EncryptedDek: PBEDek,
    PublicKey: PBPublicKey,
    UserOrGroup: PBUserOrGroup,
    EncryptedDekData: PBEncryptedDekData,
} = ironcorelabs.proto;

/**
 * Take the provided PublicKey and encode it into a protobuf PublicKey
 */
const convertPublicKey = (key: PublicKey<string>) => new PBPublicKey(publicKeyToBytes(key));

/**
 * Encode the provided EncryptedAccessKey to protobuf depending on whether the key is for a user or a group.
 */
const convertEncryptedAccessKey = (userOrGroup: "userId" | "groupId") => (key: EncryptedAccessKey) => {
    const masterPublicKey = convertPublicKey(key.publicKey);
    const userOrGroupPB = new PBUserOrGroup(userOrGroup === "userId" ? {userId: key.id, masterPublicKey} : {groupId: key.id, masterPublicKey});
    const encryptedDekData = convertEncryptedMessage(key.encryptedPlaintext);
    return new PBEDek({userOrGroup: userOrGroupPB, encryptedDekData});
};

/**
 * Create a new EDEK data protobuf encoding from the provided Recrypt encrypted message.
 */
const convertEncryptedMessage = (encryptedPlaintext: PREEncryptedMessage) =>
    new PBEncryptedDekData({
        encryptedBytes: toByteArray(encryptedPlaintext.encryptedMessage),
        ephemeralPublicKey: convertPublicKey(encryptedPlaintext.ephemeralPublicKey),
        signature: toByteArray(encryptedPlaintext.signature),
        authHash: toByteArray(encryptedPlaintext.authHash),
        publicSigningKey: toByteArray(encryptedPlaintext.publicSigningKey),
    });

/**
 * Take the provided information and encode it into our EDEK protobuf structure.
 */
export const encodeEdeks = (segmentId: number, documentId: string, userKeys: EncryptedAccessKey[], groupKeys: EncryptedAccessKey[]): Uint8Array => {
    const userDeks = userKeys.map(convertEncryptedAccessKey("userId"));
    const groupDeks = groupKeys.map(convertEncryptedAccessKey("groupId"));
    return PBEDeks.encode(new PBEDeks({edeks: [...groupDeks, ...userDeks], segmentId, documentId})).finish();
};

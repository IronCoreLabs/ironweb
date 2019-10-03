import {ironcorelabs} from "./EncryptedDeks";
import {publicKeyToBytes} from "../../lib/Utils";
import {toByteArray} from "base64-js";
const protoEdeks = ironcorelabs.proto.EncryptedDeks;
const protoEdek = ironcorelabs.proto.EncryptedDek;
const protoPublicKey = ironcorelabs.proto.PublicKey;
const protoUserOrGroup = ironcorelabs.proto.UserOrGroup;
const protoEncryptedDekData = ironcorelabs.proto.EncryptedDekData;

/**
 * TODO
 */
export const encodeEdeks = (segmentId: number, documentId: string, userKeys: EncryptedAccessKey[], groupKeys: EncryptedAccessKey[]): Uint8Array => {
    const userDeks = userKeys.map(convertEncryptedAccessKey("userId"));
    const groupDeks = groupKeys.map(convertEncryptedAccessKey("groupId"));
    const edeks = [...groupDeks, ...userDeks];
    return protoEdeks.encode(new protoEdeks({edeks, segmentId, documentId})).finish();
};

const convertEncryptedAccessKey = (userOrGroup2: "userId" | "groupId") => (key: EncryptedAccessKey) => {
    const userOrGroup = convertUserOrGroup(userOrGroup2, key.id, key.publicKey);
    const encryptedDekData = convertEncryptedMessage(key.encryptedPlaintext);
    return new protoEdek({userOrGroup, encryptedDekData});
};

const convertEncryptedMessage = (encryptedPlaintext: PREEncryptedMessage) =>
    new protoEncryptedDekData({
        encryptedBytes: toByteArray(encryptedPlaintext.encryptedMessage),
        ephemeralPublicKey: convertPublicKey(encryptedPlaintext.ephemeralPublicKey),
        signature: toByteArray(encryptedPlaintext.signature),
        authHash: toByteArray(encryptedPlaintext.authHash),
        publicSigningKey: toByteArray(encryptedPlaintext.publicSigningKey),
    });

const convertUserOrGroup = (userOrGroup: "userId" | "groupId", id: string, publicKey: PublicKey<string>) => {
    const masterPublicKey = convertPublicKey(publicKey);
    //TODO I'm sure this could be better, Ernie and Murph help.
    if (userOrGroup === "userId") {
        return new protoUserOrGroup({userId: id, masterPublicKey});
    } else {
        return new protoUserOrGroup({groupId: id, masterPublicKey});
    }
};

const convertPublicKey = (key: PublicKey<string>) => {
    const bytesKey = publicKeyToBytes(key);
    return new protoPublicKey({x: bytesKey.x, y: bytesKey.y});
};

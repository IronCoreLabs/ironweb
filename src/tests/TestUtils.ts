import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import {toByteArray, fromByteArray} from "base64-js";
import {DocumentMetaGetResponseType, DocumentGetResponseType} from "../frame/endpoints/DocumentApiEndpoints";

export const userPublicXString = "upkx";
export const userPublicYString = "upky";
export const devicePublicXString = "dpkx";
export const devicePublicYString = "dpky";
export const userSigningKeyString = "spk=";

export const userPublicBytes = {x: toByteArray(userPublicXString), y: toByteArray(userPublicYString)};
export const devicePublicBytes = {x: toByteArray(devicePublicXString), y: toByteArray(devicePublicYString)};
export const userSigningKeyBytes = toByteArray(userSigningKeyString);

export function getFullUser(): ApiUserResponse {
    return {
        id: "user-10",
        segmentId: 1,
        status: 1,
        userMasterPublicKey: {x: userPublicXString, y: userPublicYString},
        userPrivateKey: "",
        needsRotation: false,
        keyId: 1,
    };
}

export function getEncryptedDocument(): EncryptedDocument {
    return {
        iv: new Uint8Array([110, 111, 110, 99, 101]),
        content: new Uint8Array([98, 97, 115, 101]),
    };
}

export function getEncryptedSymmetricKey(): PREEncryptedMessage {
    return {
        encryptedMessage:
            "A07omAmqXrgQafLY3OW4H0oZXysTYtTyf+tY67SKu1UUnvBeHceh8Nn5CqTFu4kxTChQ2ep8+OcnSDEMP6VVf47SQ6O2ZkBpVENes+aHtY5s12hHOag9raaZp6AfMmcJBw70jt5pWDBUid253Ky16lt3p7RoMK1um5hPFcYZr412PsMSY92wdNmhdByLgkXVLqFnQTC5mVsr207xkadqI3LU8YP2a990TBJSxsorSY6bIy+HADcoVLQW/XkU5T+0Fb09coQnAhSLnBDP8NdnylNws9pIIYhyHAwEIxifAMltUD/Jq9luxoKA1bZThe0/ZZZGnX3COZEkvtrYIp/xLHG/xRkBr7eSxSkTR8xIZTFywz5kFxLQYhxnTzR5VmsoK5vTKqKBVmHmU1LyOktbUhV+HNYNP8BiUhQypBLGvyNMhwPEvsTRtc50Qa0kMwxhWSPrKnqPWUFzB1jML+p8TlBHECTIsOjCTLpDQMgth2vfsMA2Uv9gHfu982L3zX7F",
        ephemeralPublicKey: {
            x: "H3upGv7w+Ac5qrwNewRyLP+GYtFpQery27P6H/gXaKU=",
            y: "Alm3/nVs6d/mmoBZ28EL3NEKUCB66GsCRBmxRZjjT9U=",
        },
        authHash: fromByteArray(new Uint8Array(128)),
        publicSigningKey: fromByteArray(new Uint8Array(32)),
        signature: fromByteArray(new Uint8Array(64)),
    };
}

export function getTransformedSymmetricKey(): TransformedEncryptedMessage {
    return {
        ...getEncryptedSymmetricKey(),
        transformBlocks: [
            {
                encryptedTempKey: "",
                publicKey: {x: "", y: ""},
                randomTransformEncryptedTempKey: "",
                randomTransformPublicKey: {x: "", y: ""},
            },
        ],
    };
}

export function getEncryptedDocumentMetaResponse(): DocumentMetaGetResponseType {
    return {
        encryptedSymmetricKey: getTransformedSymmetricKey(),
        id: "docID",
        name: "my doc",
        visibleTo: {
            users: [{id: "user-11"}, {id: "user-33"}],
            groups: [{id: "group-34", name: "ICL"}],
        },
        association: {
            type: "owner",
        },
        created: "2018-11-28T00:20:16.617Z",
        updated: "2018-12-04T15:50:01.837Z",
    };
}

export function getEncryptedDocumentResponse(): DocumentGetResponseType {
    return {
        ...getEncryptedDocumentMetaResponse(),
        data: {content: "AcWcpFrbKJ6h5+HpBsMcjVJdXTWKX84YycFJs2z7pbvjC3qRKfwbj/z8WA=="},
    };
}

export function getEmptyPublicKey(): PublicKey<Uint8Array> {
    return {
        x: new Uint8Array(32),
        y: new Uint8Array(32),
    };
}

export function getEmptyPublicKeyString(): PublicKey<string> {
    return {
        x: fromByteArray(new Uint8Array(32)),
        y: fromByteArray(new Uint8Array(32)),
    };
}

export function getEmptyKeyPair(): KeyPair {
    return {
        privateKey: new Uint8Array(32),
        publicKey: getEmptyPublicKey(),
    };
}

export function getSigningKeyPair() {
    return {
        privateKey: new Uint8Array(64),
        publicKey: new Uint8Array(32),
    };
}

export function getTransformKey(): TransformKey {
    return {
        ephemeralPublicKey: getEmptyPublicKey(),
        toPublicKey: getEmptyPublicKey(),
        encryptedTempKey: new Uint8Array(384),
        hashedTempKey: new Uint8Array(128),
        publicSigningKey: new Uint8Array(32),
        signature: new Uint8Array(64),
    };
}

/*
 * Augment global objects
 */
interface Window {
    Promise: PromiseConstructor;
    msCrypto: Crypto;
    User: {
        id: string;
        name: string;
    };
}

/*
 * Declare types for modules without build in types
 */
declare module "utf-8" {
    export function setBytesFromString(val: string): number[];
    export function getStringFromBytes(bytes: Uint8Array): string;
}

declare module "worker-loader?*" {
    const content: any;
    export = content;
}
declare const _WORKER_PATH_LOCATION_: string;

/*
 * Common types and object shapes
 */
type Base64String = string;
type PrivateKey<T> = T;
type SigningPublicKey<T> = T;
type AugmentationFactor<T> = T;
type JWTCallbackToPromise = () => Promise<string>;
type PasscodeCallbackToPromise = (userExists: boolean) => Promise<string>;
type DerivedKey = CryptoKey | Uint8Array;

interface PublicKey<T> {
    x: T;
    y: T;
}
interface DerivedKeyResults {
    key: DerivedKey;
    salt: Uint8Array;
}
interface MessageSignature {
    userContextHeader: string;
    requestHeaderSignature: string;
    authHeaderSignature: string;
}
interface KeyPair {
    publicKey: PublicKey<Uint8Array>;
    privateKey: PrivateKey<Uint8Array>;
}
interface SigningKeyPair {
    publicKey: SigningPublicKey<Uint8Array>;
    privateKey: PrivateKey<Uint8Array>;
}
interface KeyPairSet {
    userKeys: KeyPair;
    deviceKeys: KeyPair;
    signingKeys: SigningKeyPair;
}
interface EncryptedDocument {
    iv: Uint8Array;
    content: Uint8Array;
}
interface PREEncryptedMessage {
    encryptedMessage: Base64String;
    ephemeralPublicKey: PublicKey<Base64String>;
    authHash: Base64String;
    publicSigningKey: Base64String;
    signature: Base64String;
}
interface TransformBlock {
    encryptedTempKey: Base64String;
    publicKey: PublicKey<Base64String>;
    randomTransformEncryptedTempKey: Base64String;
    randomTransformPublicKey: PublicKey<Base64String>;
}
interface TransformedEncryptedMessage extends PREEncryptedMessage {
    transformBlocks: TransformBlock[];
}
interface EncryptedLocalKeys {
    encryptedDeviceKey: Uint8Array;
    encryptedSigningKey: Uint8Array;
    symmetricKey: Uint8Array;
    iv: Uint8Array;
}
interface WorkerEvent<T> {
    replyID: number;
    data: T;
}
interface EncryptedAccessKey {
    encryptedPlaintext: PREEncryptedMessage;
    publicKey: PublicKey<string>;
    id: string;
}
interface DocumentHeader {
    _did_: string;
    _sid_: number;
}

/*
 * API response types
 */
interface ApiUserResponse {
    id: string;
    segmentId: number;
    status: number;
    userMasterPublicKey: PublicKey<Base64String>;
    userPrivateKey: PrivateKey<Base64String>;
    keyId: number;
    needsRotation: boolean;
}
interface UserOrGroupPublicKey {
    id: string;
    masterPublicKey: PublicKey<Base64String>;
}
interface GroupApiBasicResponse {
    id: string;
    name: string | null;
    status: number;
    permissions: string[];
    created: string;
    updated: string;
}
interface GroupApiFullResponse extends GroupApiBasicResponse {
    groupMasterPublicKey: PublicKey<string>;
    encryptedPrivateKey?: TransformedEncryptedMessage;
}
interface GroupApiFullDetailResponse extends GroupApiFullResponse {
    adminIds: string[];
    memberIds: string[];
}

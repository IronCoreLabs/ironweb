import * as Recrypt from "@ironcorelabs/recryptjs";
import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import * as ed25519 from "@stablelib/ed25519";
import {codec, hash} from "sjcl";
import {fromByteArray, toByteArray} from "base64-js";
import Future from "futurejs";
import {TransformKeyGrant} from "./index";
import {publicKeyToBytes, publicKeyToBase64, utf8StringToArrayBuffer, concatArrayBuffers} from "../../../../lib/Utils";
import {CryptoConstants} from "../../../../Constants";
import {generateRandomBytes} from "../CryptoUtils";
import * as pbkdf2Polyfill from "../pbkdf2/polyfill";

type Plaintext = Uint8Array;
type DocumentSymmetricKey = Uint8Array;

const randomByteGenerator = Recrypt.callbackToIO<Uint8Array>((resolve, reject) => {
    generateRandomBytes(CryptoConstants.AES_SYMMETRIC_KEY_LENGTH).engage(reject, resolve);
});

/**
 * SHA-256 hash function which will be provided to Recrypt API library
 * @param {Uint8Array} hashBytes Bytes to hash
 */
const sha256Hash = (hashBytes: Uint8Array) => {
    const valueAsBits = codec.base64.toBits(fromByteArray(hashBytes));
    const hashed = hash.sha256.hash(valueAsBits);
    return toByteArray(codec.base64.fromBits(hashed));
};

/**
 * ed25519 signing wrapper function to pass into recrypt so it can invoke it when necessary.
 */
const signingFunction = (privateSigningKey: Recrypt.BytesProperty, message: Uint8Array) => {
    return {bytes: ed25519.sign(privateSigningKey.bytes, message)};
};

/**
 * ed25519 verify wrapper function to pass into recrypt to it can invoke it when necessary.
 * @type {[type]}
 */
const verifyFunction = (publicSigningKey: Recrypt.PublicSigningKey, message: Uint8Array, signature: Recrypt.Signature) => {
    return ed25519.verify(publicSigningKey.bytes, message, signature.bytes);
};

const API = new Recrypt.Api(randomByteGenerator, sha256Hash, signingFunction, verifyFunction);

/**
 * Convert an action of type IO into a future
 */
function ioToFuture<T>(action: Recrypt.IO<T>) {
    return new Future((reject: (e: Error) => void, resolve: (result: T) => void) => {
        Recrypt.ioToFunc<T>(action, reject, resolve);
    });
}

/**
 * Convert the components of an encrypted symmetric key into base64 strings for submission to the API
 * @param {EncryptedValue} encryptedValue Encrypted value to transform
 */
function encryptedValueToBase64(encryptedValue: Recrypt.EncryptedValue): PREEncryptedMessage {
    return {
        encryptedMessage: fromByteArray(encryptedValue.encryptedMessage.bytes),
        ephemeralPublicKey: publicKeyToBase64(encryptedValue.ephemeralPublicKey),
        authHash: fromByteArray(encryptedValue.authHash.bytes),
        publicSigningKey: fromByteArray(encryptedValue.publicSigningKey.bytes),
        signature: fromByteArray(encryptedValue.signature.bytes),
    };
}

/**
 * Convert the parts of an encrypted plaintext string representation into a EncryptedValue that is expected
 * by the PRE library.
 * @param {TransformedEncryptedMessage} encryptedKey Symmetric key object to convert from string to bytes
 */
function transformedPlaintextToEncryptedValue(encryptedKey: TransformedEncryptedMessage): Recrypt.EncryptedValue {
    return {
        encryptedMessage: {bytes: toByteArray(encryptedKey.encryptedMessage)},
        ephemeralPublicKey: publicKeyToBytes(encryptedKey.ephemeralPublicKey),
        publicSigningKey: {bytes: toByteArray(encryptedKey.publicSigningKey)},
        authHash: {bytes: toByteArray(encryptedKey.authHash)},
        signature: {bytes: toByteArray(encryptedKey.signature)},
        transformBlocks: encryptedKey.transformBlocks.map((transformBlock) => ({
            encryptedTempKey: {bytes: toByteArray(transformBlock.encryptedTempKey)},
            publicKey: publicKeyToBytes(transformBlock.publicKey),
            randomTransformEncryptedTempKey: {bytes: toByteArray(transformBlock.randomTransformEncryptedTempKey)},
            randomTransformPublicKey: publicKeyToBytes(transformBlock.randomTransformPublicKey),
        })),
    };
}

export function instantiateApi() {
    //Nothing to do here for JS, but this needs to exist to match the WASM shim implementation
}

/**
 * Use SJCL to generate a PBKDF2 derived key from the provided passcode and salt
 * @param  passcode   Users passcode
 * @param  salt       Salt converted into bits
 * @return {BitArray} Derived key as bits
 */
export function generatePasswordDerivedKey(password: string, saltUsedDuringPriorDerivation?: Uint8Array) {
    return pbkdf2Polyfill.generatePasswordDerivedKey(password, saltUsedDuringPriorDerivation);
}

/**
 * Generate a new PRE key pair and do some post processing to convert structure. Also temporarily generates a curve25519 signing
 * key pair until we have device keys working.
 */
export function generateKeyPair(): Future<Error, KeyPair> {
    return ioToFuture(API.generateKeyPair).map((keyPair) => ({
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey.bytes,
    }));
}

/**
 * Generate a new ed25519 signing key pair and map the field names to public/private keys.
 */
export function generateSigningKeyPair(): Future<Error, SigningKeyPair> {
    return generateRandomBytes(ed25519.SEED_LENGTH).map((seed) => {
        const signingKeys = ed25519.generateKeyPairFromSeed(seed);
        return {
            publicKey: signingKeys.publicKey,
            privateKey: signingKeys.secretKey,
        };
    });
}

/**
 * Extract the signing public key from it's associated private key.
 */
export function getPublicSigningKeyFromPrivate(privateSigningKey: PrivateKey<Uint8Array>) {
    return Future.of(ed25519.extractPublicKeyFromSecretKey(privateSigningKey));
}

/**
 * Generate a set of user, device, and signing keys for new user creation
 */
export function generateNewUserKeySet(): Future<Error, KeyPairSet> {
    return Future.gather3(ioToFuture(API.generateKeyPair), ioToFuture(API.generateKeyPair), generateSigningKeyPair()).map(
        ([userKeys, deviceKeys, signingKeys]) => ({
            userKeys: {
                publicKey: userKeys.publicKey,
                privateKey: userKeys.privateKey.bytes,
            },
            deviceKeys: {
                publicKey: deviceKeys.publicKey,
                privateKey: deviceKeys.privateKey.bytes,
            },
            signingKeys,
        })
    );
}

/**
 * Generate a three-tuple of a new group private/public key and plaintext
 */
export function generateGroupKeyPair() {
    return ioToFuture(API.generatePlaintext).flatMap((plaintext) => {
        const privateKey = API.deriveSymmetricKey(plaintext);
        return ioToFuture(API.computePublicKey(privateKey)).map((publicKey) => ({
            privateKey: privateKey.bytes,
            publicKey,
            plaintext: plaintext.bytes,
        }));
    });
}

/**
 * Given a PRE private key, derive the public key
 */
export function derivePublicKey(privateKey: PrivateKey<Uint8Array>) {
    return ioToFuture(API.computePublicKey({bytes: privateKey}));
}

/**
 * Generate a new transform key from the provided private key to the provided public key
 * @param {PrivateKey<Uint8Array>} fromPrivateKey Private key to generate transform key from
 * @param {PublicKey<Uint8Array>}  toPublicKey    Public key to generate a transform to
 * @param {SigningKeyPair}         signingKeys    Current users signing keys used to sign transform key
 */
export function generateTransformKey(
    fromPrivateKey: PrivateKey<Uint8Array>,
    toPublicKey: PublicKey<Uint8Array>,
    signingKeys: SigningKeyPair
): Future<Error, TransformKey> {
    return ioToFuture(API.generateTransformKey({bytes: fromPrivateKey}, toPublicKey, {bytes: signingKeys.publicKey}, {bytes: signingKeys.privateKey})).map(
        (transformKey) => {
            //Remove all of the `bytes` sub properties so that this structure matches the same one that we use within wasm
            return {
                ...transformKey,
                encryptedTempKey: transformKey.encryptedTempKey.bytes,
                hashedTempKey: transformKey.hashedTempKey.bytes,
                publicSigningKey: transformKey.publicSigningKey.bytes,
                signature: transformKey.signature.bytes,
            };
        }
    );
}

/**
 * Generate a new transform key from the provided private key to each of the provided public keys
 * @param {Uint8Array}             fromPrivateKey Private key to generate transform key from
 * @param {UserOrGroupPublicKey[]} publicKeyList  List of public keys to generate a transform to
 * @param {SigningKeyPair}         signingKeys    Current users signing k eys used to sign transform keys
 */
export function generateTransformKeyToList(
    fromPrivateKey: Uint8Array,
    publicKeyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair
): Future<Error, TransformKeyGrant[]> {
    if (!publicKeyList.length) {
        return Future.of<TransformKeyGrant[]>([]);
    }
    const transformKeyFutures = publicKeyList.map(({masterPublicKey, id}) => {
        return generateTransformKey(fromPrivateKey, publicKeyToBytes(masterPublicKey), signingKeys).map((transformKey) => ({
            transformKey,
            publicKey: masterPublicKey,
            id,
        }));
    });
    return Future.all(transformKeyFutures);
}

/**
 * Generate a new document PRE symmetric key
 */
export function generateDocumentKey() {
    return ioToFuture(API.generatePlaintext).map<[Plaintext, DocumentSymmetricKey]>((documentKeyPlaintext) => [
        documentKeyPlaintext.bytes,
        API.deriveSymmetricKey(documentKeyPlaintext).bytes,
    ]);
}

/**
 * Encrypt the provided plaintext to the public key provided
 * @param {Plaintext}             plaintext     PRE generated document symmetric key plaintext
 * @param {PublicKey<Uint8Array>} userPublicKey Public key to encrypt to
 * @param {SigningKeyPair}        signingKeys   Current users signing keys used to sign transform key
 */
export function encryptPlaintext(plaintext: Plaintext, userPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair): Future<Error, PREEncryptedMessage> {
    return ioToFuture(API.encrypt({bytes: plaintext}, userPublicKey, {bytes: signingKeys.publicKey}, {bytes: signingKeys.privateKey})).map((encryptedValue) =>
        encryptedValueToBase64(encryptedValue)
    );
}

/**
 * Encrypt the provided plaintext to each of the public keys provided in the list
 * @param {Plaintext}               plaintext   PRE generated document symmetric key to encrypt
 * @param {UserPublicKeyResponse[]} keyList     List of public keys (either user or group) who we will encrypt the document to using their public key
 * @param {SigningKeyPair}          signingKeys Current users signing keys used to sign transform key
 */
export function encryptPlaintextToList(
    plaintext: Plaintext,
    keyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair
): Future<Error, EncryptedAccessKey[]> {
    if (!keyList.length) {
        return Future.of<EncryptedAccessKey[]>([]);
    }
    const encryptKeyFutures = keyList.map(({masterPublicKey, id}) => {
        return encryptPlaintext(plaintext, publicKeyToBytes(masterPublicKey), signingKeys).map((encryptedPlaintext) => ({
            encryptedPlaintext,
            publicKey: masterPublicKey,
            id,
        }));
    });
    return Future.all(encryptKeyFutures);
}

/**
 * Decrypt a PRE encrypted plaintext using the provided private key
 * @param {TransformedEncryptedMessage} encryptedPlaintext Encrypted plaintext key to decrypt
 * @param {PrivateKey<Uint8Array>}      userPrivateKey     Users private key to decrypt
 */
export function decryptPlaintext(encryptedPlaintext: TransformedEncryptedMessage, userPrivateKey: PrivateKey<Uint8Array>) {
    return ioToFuture(API.decrypt(transformedPlaintextToEncryptedValue(encryptedPlaintext), {bytes: userPrivateKey})).map<[Plaintext, DocumentSymmetricKey]>(
        (decryptedPlaintext) => [decryptedPlaintext.bytes, API.deriveSymmetricKey(decryptedPlaintext).bytes]
    );
}

/**
 * Create a message signature of the current time, segment ID, user ID, and public signing key. Encode that as a base64 string and sign it
 * using ed25519.
 */
export function createRequestSignature(segmentID: number, userID: string, signingKeys: SigningKeyPair, signatureVersion: number): MessageSignature {
    const payload = utf8StringToArrayBuffer(
        JSON.stringify({
            ts: Date.now(),
            sid: segmentID,
            uid: userID,
            x: fromByteArray(signingKeys.publicKey),
        })
    );
    return {
        version: signatureVersion,
        message: fromByteArray(payload),
        signature: fromByteArray(ed25519.sign(signingKeys.privateKey, payload)),
    };
}

/**
 * Generate a signature to be used as part of a device add operation
 * @param {String}       jwtToken          JWT token authorizing the current user
 * @param {KeyPair}      userMasterKeyPair Users public/private master keys
 * @param {TransformKey} deviceTransform   Device transform key
 */
export function generateDeviceAddSignature(jwtToken: string, userMasterKeyPair: KeyPair, deviceTransform: TransformKey) {
    const ts = Date.now();
    const transformKey = {
        ...deviceTransform,
        encryptedTempKey: {bytes: deviceTransform.encryptedTempKey},
        hashedTempKey: {bytes: deviceTransform.hashedTempKey},
        publicSigningKey: {bytes: deviceTransform.publicSigningKey},
        signature: {bytes: deviceTransform.signature},
    };
    return ioToFuture(API.createTransformKeyBytes(transformKey))
        .flatMap(({bytes}) => {
            const signatureMessage = concatArrayBuffers(
                utf8StringToArrayBuffer(`${ts}`),
                bytes,
                utf8StringToArrayBuffer(jwtToken),
                userMasterKeyPair.publicKey.x,
                userMasterKeyPair.publicKey.y
            );
            return ioToFuture(API.schnorrSign({bytes: userMasterKeyPair.privateKey}, userMasterKeyPair.publicKey, {bytes: signatureMessage}));
        })
        .map((signature) => ({signature: signature.bytes, ts}));
}

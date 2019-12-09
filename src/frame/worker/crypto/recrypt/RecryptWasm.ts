//Polyfill TextEncoder/TextDecoder for MSEdge
import * as Recrypt from "@ironcorelabs/recrypt-wasm-binding";
import {encode} from "@stablelib/utf8";
import {fromByteArray, toByteArray} from "base64-js";
import "fast-text-encoding";
import Future from "futurejs";
import {CryptoConstants} from "../../../../Constants";
import {concatArrayBuffers, publicKeyToBase64, publicKeyToBytes, utf8StringToArrayBuffer} from "../../../../lib/Utils";
import {generateRandomBytes, getCryptoSubtleApi} from "../CryptoUtils";
import * as PBKDF2 from "../pbkdf2/native";
import {TransformKeyGrant} from "./index";
const {SALT_LENGTH, PBKDF2_ITERATIONS} = CryptoConstants;

type Plaintext = Uint8Array;
let RecryptApi: Recrypt.Api256;

/**
 * Convert the components of an encrypted symmetric key into base64 strings for submission to the API
 * @param {EncryptedValue} encryptedValue Encrypted value to transform
 */
const encryptedValueToBase64 = (encryptedValue: Recrypt.EncryptedValue): PREEncryptedMessage => ({
    encryptedMessage: fromByteArray(encryptedValue.encryptedMessage),
    ephemeralPublicKey: publicKeyToBase64(encryptedValue.ephemeralPublicKey),
    authHash: fromByteArray(encryptedValue.authHash),
    publicSigningKey: fromByteArray(encryptedValue.publicSigningKey),
    signature: fromByteArray(encryptedValue.signature),
});

/**
 * Convert the parts of an encrypted plaintext string representation into a EncryptedValue that is expected
 * by the PRE library.
 * @param {TransformedEncryptedMessage} encryptedKey Symmetric key object to convert from string to bytes
 */
const transformedPlaintextToEncryptedValue = (encryptedKey: TransformedEncryptedMessage): Recrypt.EncryptedValue => ({
    encryptedMessage: toByteArray(encryptedKey.encryptedMessage),
    ephemeralPublicKey: publicKeyToBytes(encryptedKey.ephemeralPublicKey),
    publicSigningKey: toByteArray(encryptedKey.publicSigningKey),
    authHash: toByteArray(encryptedKey.authHash),
    signature: toByteArray(encryptedKey.signature),
    transformBlocks: encryptedKey.transformBlocks.map((transformBlock) => ({
        encryptedTempKey: toByteArray(transformBlock.encryptedTempKey),
        publicKey: publicKeyToBytes(transformBlock.publicKey),
        randomTransformEncryptedTempKey: toByteArray(transformBlock.randomTransformEncryptedTempKey),
        randomTransformPublicKey: publicKeyToBytes(transformBlock.randomTransformPublicKey),
    })),
});

/**
 * Exported so unit tests can get access to the Recrypt instance for spying.
 */
export const getApi = () => RecryptApi;

/**
 * Use PBKDF2 with SHA-256 to derive a key from the provided password. We'll either use the provided salt or generate a new salt
 * depending on whether we're deriving a new key or verifying an existing key. Uses the WebCrypto API if available or otherwise
 * falls back to a WASM function for MSEdge.
 */
export const generatePasswordDerivedKey = (password: string, saltUsedDuringPriorDerivation?: Uint8Array) => {
    const saltGeneration = saltUsedDuringPriorDerivation ? Future.of(saltUsedDuringPriorDerivation) : generateRandomBytes(SALT_LENGTH);
    return saltGeneration.flatMap((salt) => {
        const passwordBytes = utf8StringToArrayBuffer(password);
        if (getCryptoSubtleApi()) {
            return PBKDF2.generatePasscodeDerivedKey(passwordBytes, salt).map<DerivedKeyResults>((key) => ({key, salt}));
        }
        const derivedKey = Recrypt.pbkdf2SHA256(salt, passwordBytes, PBKDF2_ITERATIONS());
        return Future.of({key: derivedKey, salt});
    });
};

/**
 * Create an instance of the WASM API class. This is delayed so that, if necessary, we can inject a random seed
 * into the WASM module prior to creating an instance. This will allow the WASM module to work propertly within
 * MS Edge.
 */
export const instantiateApi = (seed?: Uint8Array) => {
    if (seed) {
        Recrypt.setRandomSeed(seed);
    }
    RecryptApi = new Recrypt.Api256();
};

/**
 * Generate a new Recrypt public/private key pair
 */
export const generateKeyPair = (): Future<Error, KeyPair> => Future.tryF(() => RecryptApi.generateKeyPair());

/**
 * Generate a new ed25519 signing key pair
 */
export const generateSigningKeyPair = (): Future<Error, SigningKeyPair> => Future.tryF(() => RecryptApi.generateEd25519KeyPair());

/**
 * Extract the signing public key from it's associated private key.
 */
export const getPublicSigningKeyFromPrivate = (privateSigningKey: PrivateKey<Uint8Array>) =>
    Future.tryF(() => RecryptApi.computeEd25519PublicKey(privateSigningKey));
/**
 * Will return true if the Uint8Array contains only zeros.
 * @param bytes
 */
const isBufferAllZero = (bytes: Uint8Array) => {
    return bytes.every((val) => val === 0);
};

/**
 * Augments UserPrivateKey and return both the augmented private key and the augmentation factor.
 * @param userPrivateKey current private key to be augmented
 */
const rotateUsersPrivateKey = (userPrivateKey: Uint8Array): Future<Error, {newPrivateKey: Uint8Array; augmentationFactor: Uint8Array}> => {
    return generateKeyPair().flatMap(({privateKey}) => {
        if (isBufferAllZero(privateKey)) {
            return Future.reject(new Error("Key rotation failed."));
        }
        const newPrivateKey = Recrypt.subtractPrivateKeys(userPrivateKey, privateKey);
        if (isBufferAllZero(newPrivateKey)) {
            return Future.reject(new Error("Key rotation failed."));
        }
        return Future.of({
            newPrivateKey,
            augmentationFactor: privateKey,
        });
    });
};

/**
 * Calls rotateUsersPrivateKey, in the case that rotateUsersPrivateKey generates an augmentationFactor of zero or subtractPrivateKeys
 * results in zero an error is returned. This error is handled by calling rotateUsersPrivateKey again in an attempt produce valid results.
 */
export const rotateUsersPrivateKeyWithRetry = (userPrivateKey: Uint8Array): Future<Error, {newPrivateKey: Uint8Array; augmentationFactor: Uint8Array}> => {
    return rotateUsersPrivateKey(userPrivateKey).handleWith(() => rotateUsersPrivateKey(userPrivateKey));
};

/**
 * Generates a new plaintext and takes the private key as the new group private key. The augmentation factor is calculated by subtracting the existing
 * private key from the newly generated private.
 */
const rotateGroupPrivateKey = (existingGroupPrivateKey: Uint8Array): Future<Error, {plaintext: Uint8Array; augmentationFactor: Uint8Array}> => {
    const plaintext = RecryptApi.generatePlaintext();
    const newPrivateKey = RecryptApi.hash256(plaintext);
    const augmentationFactor = Recrypt.subtractPrivateKeys(existingGroupPrivateKey, newPrivateKey);
    if (isBufferAllZero(newPrivateKey) || isBufferAllZero(augmentationFactor)) {
        return Future.reject(new Error("Key rotation failed."));
    }
    return Future.of({
        plaintext,
        augmentationFactor,
    });
};

/**
 * Calls rotateGroupPrivateKey, in the case that rotateGroupPrivateKey generates an augmentationFactor of zero or subtractPrivateKeys
 * results in zero an error is returned. This error is handled by calling rotateGroupPrivateKey again in an attempt produce valid results.
 */
export const rotateGroupPrivateKeyWithRetry = (groupPrivateKey: Uint8Array): Future<Error, {plaintext: Uint8Array; augmentationFactor: Uint8Array}> => {
    return rotateGroupPrivateKey(groupPrivateKey).handleWith(() => rotateGroupPrivateKey(groupPrivateKey));
};

/**
 * Generate a set of user, device, and signing keys for new user creation
 */
export const generateNewUserKeySet = (): Future<Error, KeyPairSet> =>
    Future.tryF(() => ({
        userKeys: RecryptApi.generateKeyPair(),
        deviceKeys: RecryptApi.generateKeyPair(),
        signingKeys: RecryptApi.generateEd25519KeyPair(),
    }));

/**
 * Generate a three-tuple of a new group private/public key and plaintext
 */
export const generateGroupKeyPair = () =>
    Future.tryF(() => {
        const plaintext = RecryptApi.generatePlaintext();
        const privateKey = RecryptApi.hash256(plaintext);
        return {
            privateKey,
            plaintext,
            publicKey: RecryptApi.computePublicKey(privateKey),
        };
    });

/**
 * Given a PRE private key, derive the public key
 */
export const derivePublicKey = (privateKey: PrivateKey<Uint8Array>) => Future.tryF(() => RecryptApi.computePublicKey(privateKey));

/**
 * Generate a new transform key from the provided private key to the provided public key
 * @param {PrivateKey<Uint8Array>} fromPrivateKey Private key to generate transform key from
 * @param {PublicKey<Uint8Array>}  toPublicKey    Public key to generate a transform to
 * @param {SigningKeyPair}         signingKeys    Current users signing keys used to sign transform key
 */
export const generateTransformKey = (fromPrivateKey: PrivateKey<Uint8Array>, toPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair) =>
    Future.tryF(() => RecryptApi.generateTransformKey(fromPrivateKey, toPublicKey, signingKeys.privateKey));

/**
 * Generate a new transform key from the provided private key to each of the provided public keys
 * @param {Uint8Array}             fromPrivateKey Private key to generate transform key from
 * @param {UserOrGroupPublicKey[]} publicKeyList  List of public keys to generate a transform to
 * @param {SigningKeyPair}         signingKeys    Current users signing k eys used to sign transform keys
 */
export const generateTransformKeyToList = (
    fromPrivateKey: Uint8Array,
    publicKeyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair
): Future<Error, TransformKeyGrant[]> => {
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
};

/**
 * Generate a new document PRE symmetric key
 */
export const generateDocumentKey = () =>
    Future.tryF(() => {
        const plaintext = RecryptApi.generatePlaintext();
        return [plaintext, RecryptApi.hash256(plaintext)];
    });

/**
 * Encrypt the provided plaintext to the public key provided
 * @param {Plaintext}             plaintext     PRE generated document symmetric key plaintext
 * @param {PublicKey<Uint8Array>} userPublicKey Public key to encrypt to
 * @param {SigningKeyPair}        signingKeys   Current users signing keys used to sign transform key
 */
export const encryptPlaintext = (plaintext: Plaintext, userPublicKey: PublicKey<Uint8Array>, signingKeys: SigningKeyPair): Future<Error, PREEncryptedMessage> =>
    Future.tryF(() => encryptedValueToBase64(RecryptApi.encrypt(plaintext, userPublicKey, signingKeys.privateKey)));

/**
 * Encrypt the provided plaintext to each of the public keys provided in the list
 * @param {Plaintext}               plaintext   PRE generated document symmetric key to encrypt
 * @param {UserPublicKeyResponse[]} keyList     List of public keys (either user or group) who we will encrypt the document to using their public key
 * @param {SigningKeyPair}          signingKeys Current users signing keys used to sign transform key
 */
export const encryptPlaintextToList = (
    plaintext: Plaintext,
    keyList: UserOrGroupPublicKey[],
    signingKeys: SigningKeyPair
): Future<Error, EncryptedAccessKey[]> => {
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
};

/**
 * Decrypt a PRE encrypted plaintext using the provided private key
 * @param {TransformedEncryptedMessage} encryptedPlaintext Encrypted plaintext key to decrypt
 * @param {PrivateKey<Uint8Array>}      userPrivateKey     Users private key to decrypt
 */
export const decryptPlaintext = (encryptedPlaintext: TransformedEncryptedMessage, userPrivateKey: PrivateKey<Uint8Array>) =>
    Future.tryF(() => {
        const decryptedPlaintext = RecryptApi.decrypt(transformedPlaintextToEncryptedValue(encryptedPlaintext), userPrivateKey);
        return [decryptedPlaintext, RecryptApi.hash256(decryptedPlaintext)];
    });

/**
 * Create our complex request signature using the provided paramters. Details about how this signature works are written up in
 * https://github.com/IronCoreLabs/ironoxide/issues/50
 */
export const createRequestSignature = (
    segmentID: number,
    userID: string,
    signingKeys: SigningKeyPair,
    method: string,
    url: string,
    body?: BodyInit | null
): MessageSignature => {
    const userContext = [Date.now(), segmentID, userID, fromByteArray(signingKeys.publicKey)].join(",");
    const userContextBytes = encode(userContext);
    const authHeaderSignature = RecryptApi.ed25519Sign(signingKeys.privateKey, userContextBytes);

    let bodyAsBytes = new Uint8Array();
    if (body instanceof Uint8Array) {
        bodyAsBytes = body;
    } else if (typeof body === "string") {
        bodyAsBytes = encode(body);
    } else if (body !== null && body !== undefined) {
        //This shouldn't happen since our APIs only ever take strings or bytes, but prevent certain signature
        //failure if provided something else.
        throw new Error(`Unknown body type provided: ${body}`);
    }

    const requestHeaderSignature = RecryptApi.ed25519Sign(
        signingKeys.privateKey,
        concatArrayBuffers(userContextBytes, encode(method.toUpperCase()), encode(url), bodyAsBytes)
    );
    return {
        userContextHeader: userContext,
        requestHeaderSignature: fromByteArray(requestHeaderSignature),
        authHeaderSignature: fromByteArray(authHeaderSignature),
    };
};

/**
 * Generate a schnorr signature using the private key over the provided id
 */
export const schnorrSignUtf8String = (privateKey: Uint8Array, publicKey: PublicKey<Uint8Array>, string: string) => {
    return RecryptApi.schnorrSign(privateKey, publicKey, utf8StringToArrayBuffer(string));
};

/**
 * Generate a signature to be used as part of a device add operation
 * @param {String}       jwtToken          JWT token authorizing the current user
 * @param {KeyPair}      userMasterKeyPair Users public/private master keys
 * @param {TransformKey} deviceTransform   Device transform key
 */
export const generateDeviceAddSignature = (jwtToken: string, userMasterKeyPair: KeyPair, deviceTransform: Recrypt.TransformKey) => {
    const ts = Date.now();
    return Future.tryF(() => {
        const signatureMessage = concatArrayBuffers(
            utf8StringToArrayBuffer(`${ts}`),
            Recrypt.transformKeyToBytes256(deviceTransform),
            utf8StringToArrayBuffer(jwtToken),
            userMasterKeyPair.publicKey.x,
            userMasterKeyPair.publicKey.y
        );
        return {
            ts,
            signature: RecryptApi.schnorrSign(userMasterKeyPair.privateKey, userMasterKeyPair.publicKey, signatureMessage),
        };
    });
};

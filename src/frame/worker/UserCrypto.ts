import Future from "futurejs";
import {ErrorCodes} from "../../Constants";
import SDKError from "../../lib/SDKError";
import * as AES from "./crypto/aes";
import loadRecrypt from "./crypto/recrypt";

/**
 * Decrypt the users private user key by generating a derived key from their passcode.
 * @param {string}     passcode                Users passcode
 * @param {Uint8Array} derivedKeySalt          Salt used during derived key generation
 * @param {Uint8Array} encryptedPrivateUserKey Users encrypted key
 */
function decryptUserMasterPrivateKey(passcode: string, derivedKeySalt: Uint8Array, encryptedPrivateUserKey: Uint8Array) {
    return loadRecrypt()
        .flatMap((Recrypt) => Recrypt.generatePasswordDerivedKey(passcode, derivedKeySalt))
        .flatMap((derivedKey) => AES.decryptUserKey(encryptedPrivateUserKey, derivedKey))
        .errorMap(() => new SDKError(new Error("User passcode was incorrect."), ErrorCodes.USER_PASSCODE_INCORRECT));
}

/**
 * Encrypt the users private key and generate a transform key, then return all of the different keys so they can be sent to the API and stored in local memory.
 * @param {KeyPairSet}        userKeySet  Users master and device key pairs
 * @param {DerivedKeyResults} derivedKey  Users passcode derived key used to encrypt their master private key
 * @param {SigningKeyPair}    signingKeys Newly generated signing keys generated for the users device
 */
function generateTransformKeyAndEncryptUserKey(userKeySet: KeyPairSet, derivedKey: DerivedKeyResults, signingKeys: SigningKeyPair) {
    const {userKeys, deviceKeys} = userKeySet;
    return loadRecrypt().flatMap((Recrypt) => {
        return Future.gather2(
            AES.encryptUserKey(userKeys.privateKey, derivedKey),
            Recrypt.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, signingKeys)
        ).map(([encryptedKey, transformKey]) => {
            return {
                userKeys: {
                    ...userKeys,
                    encryptedPrivateKey: encryptedKey,
                },
                deviceKeys,
                signingKeys,
                transformKey,
            };
        });
    });
}

/**
 * Requests augmentation on users current private key. The augmented private key is then encrypted and using the password derived key.
 * @param {Uint8Array} privateKey
 * @param {Uint8Array} augmentationFactor
 */
export function rotatePrivateKey(
    passcode: string,
    encryptedPrivateUserKey: Uint8Array,
    derivedKeySalt: Uint8Array
): Future<SDKError, {newEncryptedPrivateUserKey: Uint8Array; augmentationFactor: Uint8Array}> {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Future.gather2(decryptUserMasterPrivateKey(passcode, encryptedPrivateUserKey, derivedKeySalt), Recrypt.generatePasswordDerivedKey(passcode))
                .flatMap(([userPrivateKey, derivedKey]) => {
                    return Future.gather2(Recrypt.rotateUsersPrivateKey(userPrivateKey), Future.of(derivedKey));
                })
                .flatMap(([{newPrivateKey, augmentationFactor}, derivedKey]) => {
                    return AES.encryptUserKey(newPrivateKey, derivedKey).map((encryptedPrivateKey) => {
                        return {
                            newEncryptedPrivateUserKey: encryptedPrivateKey,
                            augmentationFactor,
                        };
                    });
                });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.USER_PRIVATE_KEY_ROTATION_FAILURE));
}

/**
 * Generate the user a new pair of device and signing keys for their new device. Takes the users passcode and decrypts their user private key
 * so we can generate a transform key to the new device.
 */
export function generateDeviceAndSigningKeys(
    jwtToken: string,
    passcode: string,
    derivedKeySalt: Uint8Array,
    encryptedPrivateUserKey: Uint8Array,
    publicUserKey: PublicKey<Uint8Array>
) {
    return (
        loadRecrypt()
            .flatMap((Recrypt) => {
                return Future.gather3(
                    decryptUserMasterPrivateKey(passcode, derivedKeySalt, encryptedPrivateUserKey),
                    Recrypt.generateKeyPair(),
                    Recrypt.generateSigningKeyPair()
                )
                    .flatMap(([userPrivateKey, deviceKeys, signingKeys]) => {
                        const userKeys = {publicKey: publicUserKey, privateKey: userPrivateKey};
                        return Future.gather3(
                            AES.encryptDeviceAndSigningKeys(deviceKeys.privateKey, signingKeys.privateKey),
                            Recrypt.generateTransformKey(userPrivateKey, deviceKeys.publicKey, signingKeys),
                            Future.of({deviceKeys, signingKeys, userKeys})
                        );
                    })
                    .flatMap(([encryptedDeviceAndSigningKeys, transformKey, allKeys]) => {
                        return Recrypt.generateDeviceAddSignature(jwtToken, allKeys.userKeys, transformKey).map((deviceSignature) => {
                            return {
                                userKeys: {
                                    deviceKeys: allKeys.deviceKeys,
                                    transformKey,
                                    signingKeys: allKeys.signingKeys,
                                },
                                deviceSignature,
                                encryptedDeviceAndSigningKeys,
                            };
                        });
                    });
            })
            //Map error to specific message, but handle case where error happened up above and persist that error code
            .errorMap((error) => new SDKError(error, ErrorCodes.USER_DEVICE_KEY_GENERATION_FAILURE))
    );
}

type UserKeys = Readonly<{
    publicKey: PublicKey<Uint8Array>;
    privateKey: PrivateKey<Uint8Array>;
    encryptedPrivateKey: Uint8Array;
}>;

/**
 * Generate and encrypt keys for a new user. Generates user and encrypts the user keys with a passcode-derived key.
 */
export const generateNewUserKeys = (passcode: string): Future<SDKError, UserKeys> =>
    loadRecrypt()
        .flatMap((Recrypt) => Future.gather2(Recrypt.generateKeyPair(), Recrypt.generatePasswordDerivedKey(passcode)))
        .flatMap(([{publicKey, privateKey}, derivedKey]) =>
            AES.encryptUserKey(privateKey, derivedKey).map((encryptedPrivateKey) => ({
                publicKey,
                privateKey,
                encryptedPrivateKey,
            }))
        )
        .errorMap((error) => new SDKError(error, ErrorCodes.USER_MASTER_KEY_GENERATION_FAILURE));

/**
 * Generate and encrypt keys for a new user. Generates user, device, and signing keys and encrypts the user keys with a passcode-derived key
 */
export function generateNewUserAndDeviceKeys(passcode: string) {
    return loadRecrypt()
        .flatMap((Recrypt) => {
            return Future.gather2(Recrypt.generateNewUserKeySet(), Recrypt.generatePasswordDerivedKey(passcode))
                .flatMap(([userKeySet, derivedKey]) => {
                    return Future.gather2(
                        AES.encryptDeviceAndSigningKeys(userKeySet.deviceKeys.privateKey, userKeySet.signingKeys.privateKey),
                        generateTransformKeyAndEncryptUserKey(userKeySet, derivedKey, userKeySet.signingKeys)
                    );
                })
                .map(([encryptedDeviceAndSigningKeys, userCreateKeys]) => ({userKeys: userCreateKeys, encryptedDeviceAndSigningKeys}));
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.USER_MASTER_KEY_GENERATION_FAILURE));
}

/**
 * Attempt to read a users device and signing keys from local storage. If they exist and appear to be valid, use them to generate the associated public
 * key and return both pairs
 * @param {string} userID               User composite segment ID + provided user ID
 * @param {string} localKeySymmetricKey Users local symmetric key provided by parent window
 */
export function decryptDeviceAndSigningKeys(encryptedDeviceKey: Uint8Array, encryptedSigningKey: Uint8Array, symmetricKey: Uint8Array, nonce: Uint8Array) {
    return AES.decryptDeviceAndSigningKeys(encryptedDeviceKey, encryptedSigningKey, symmetricKey, nonce)
        .flatMap(({deviceKey, signingKey}) => {
            return loadRecrypt().flatMap((Recrypt) => {
                return Future.gather2(Recrypt.derivePublicKey(deviceKey), Recrypt.getPublicSigningKeyFromPrivate(signingKey)).map(
                    ([publicDeviceKey, publicSigningKey]) => ({
                        deviceKeys: {
                            publicKey: publicDeviceKey,
                            privateKey: deviceKey,
                        },
                        signingKeys: {
                            publicKey: publicSigningKey,
                            privateKey: signingKey,
                        },
                    })
                );
            });
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.USER_DEVICE_KEY_DECRYPTION_FAILURE));
}

/**
 * Update an existing users passcode. Take their current passcode, derive a key and decrypt their master private key. If that works, then derive
 * a key from their new passcode and use that to re-encrypt the master private key.
 * @param {string}     currentPasscode         Users current passcode
 * @param {string}     newPasscode             Users new passcode
 * @param {Uint8Array} derivedKeySalt          Salt that was used during prior key derivation
 * @param {Uint8Array} encryptedPrivateUserKey Users encrypted master private key
 */
export function changeUsersPasscode(currentPasscode: string, newPasscode: string, derivedKeySalt: Uint8Array, encryptedPrivateUserKey: Uint8Array) {
    return Future.gather2(decryptUserMasterPrivateKey(currentPasscode, derivedKeySalt, encryptedPrivateUserKey), loadRecrypt())
        .flatMap(([masterPrivateKey, Recrypt]) => {
            return Recrypt.generatePasswordDerivedKey(newPasscode).flatMap((newPasscodeDerivedKey) =>
                AES.encryptUserKey(masterPrivateKey, newPasscodeDerivedKey)
            );
        })
        .errorMap((error) => new SDKError(error, ErrorCodes.USER_PASSCODE_CHANGE_FAILURE))
        .map((newlyEncryptedPrivateUserKey) => ({encryptedPrivateUserKey: newlyEncryptedPrivateUserKey}));
}

/**
 * Create a request signature using the provided arguments for requests to the ironcore-id API
 */
export function signRequestPayload(segmentID: number, userID: string, signingKeys: SigningKeyPair, method: string, url: string, body?: BodyInit | null) {
    return loadRecrypt()
        .map((Recrypt) => Recrypt.createRequestSignature(segmentID, userID, signingKeys, method, url, body))
        .errorMap((error) => new SDKError(error, ErrorCodes.SIGNATURE_GENERATION_FAILURE));
}

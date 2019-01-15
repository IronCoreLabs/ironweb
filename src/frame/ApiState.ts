import {toByteArray} from "base64-js";
import {publicKeyToBytes} from "../lib/Utils";

class SdkUser {
    private apiUser!: ApiUserResponse;

    private encryptedPrivateUserKey!: Uint8Array;

    private publicUserKey!: PublicKey<Uint8Array>;
    private publicDeviceKey!: PublicKey<Uint8Array>;
    private publicSigningKey!: Uint8Array;

    private privateDeviceKey!: Uint8Array;
    private privateSigningKey!: Uint8Array;

    /**
     * Set fields from user response. Decode public and encrypted keys from strings to byte arrays
     * @param {ApiUserResponse} user User response from either verify or create request
     */
    setCurrentUser(user: ApiUserResponse) {
        this.apiUser = user;
        this.publicUserKey = publicKeyToBytes(user.userMasterPublicKey);
        this.encryptedPrivateUserKey = toByteArray(user.userPrivateKey);
    }

    /**
     * Clear all fields from our internal state. Occurs when we're logging out the current user.
     */
    clearCurrentUser() {
        delete this.apiUser;
        delete this.publicUserKey;
        delete this.encryptedPrivateUserKey;
        delete this.publicDeviceKey;
        delete this.privateDeviceKey;
        delete this.publicSigningKey;
        delete this.privateSigningKey;
    }

    /**
     * Set a users decrypted public and private device keys
     * @param {KeyPair} deviceKeys Users decrypted device keys
     */
    setDeviceAndSigningKeys(deviceKeys: KeyPair, signingKeys: SigningKeyPair) {
        this.publicDeviceKey = deviceKeys.publicKey;
        this.privateDeviceKey = deviceKeys.privateKey;
        this.publicSigningKey = signingKeys.publicKey;
        this.privateSigningKey = signingKeys.privateKey;
    }

    /**
     * Get a users encrypted master private key
     */
    encryptedUserKey = (): PrivateKey<Uint8Array> => this.encryptedPrivateUserKey;

    /**
     * Return a users decrypted public user key
     */
    userPublicKey = (): PublicKey<Uint8Array> => this.publicUserKey;

    /**
     * Return a users decrypted public and private device key pair
     */
    deviceKeys = (): KeyPair => ({
        publicKey: this.publicDeviceKey,
        privateKey: this.privateDeviceKey,
    });

    /**
     * Return a users decrypted public and private signing key pair
     */
    signingKeys = () => ({
        publicKey: this.publicSigningKey,
        privateKey: this.privateSigningKey,
    });

    /**
     * Get API user response object
     */
    user = () => this.apiUser;
}

export default new SdkUser();

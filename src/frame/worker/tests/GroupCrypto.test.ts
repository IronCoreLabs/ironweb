import * as GroupCrypto from "../GroupCrypto";
import * as Recrypt from "../crypto/recrypt/RecryptWasm";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import {ErrorCodes} from "../../../Constants";

describe("GroupCrypto", () => {
    describe("createGroup", () => {
        it("generates new group keypair and encrypts it using the provided public key", () => {
            const userKey = TestUtils.getEmptyPublicKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            spyOn(Recrypt, "generateGroupKeyPair").and.returnValue(
                Future.of({
                    publicKey: new Uint8Array(32),
                    plaintext: new Uint8Array(12),
                    privateKey: new Uint8Array(29),
                })
            );

            spyOn(Recrypt, "encryptPlaintext").and.returnValue(
                Future.of({
                    encryptedMessage: "stuff",
                })
            );

            spyOn(Recrypt, "generateTransformKey").and.returnValue(
                Future.of({
                    fromPrivateKey: new Uint8Array(29),
                    toPublicKey: TestUtils.getEmptyPublicKey(),
                })
            );

            GroupCrypto.createGroup(userKey, signingKeys, true).engage(
                (e) => fail(e),
                (groupKeys: any) => {
                    expect(groupKeys.encryptedGroupKey).toEqual({encryptedMessage: "stuff"});
                    expect(groupKeys.groupPublicKey).toEqual(new Uint8Array(32));

                    expect(Recrypt.generateGroupKeyPair).toHaveBeenCalledWith();
                    expect(Recrypt.encryptPlaintext).toHaveBeenCalledWith(new Uint8Array(12), userKey, signingKeys);

                    expect(Recrypt.generateTransformKey).toHaveBeenCalledWith(new Uint8Array(29), TestUtils.getEmptyPublicKey(), signingKeys);
                }
            );
        });

        it("does not generate a transform key if addAsMember is false", () => {
            const userKey = TestUtils.getEmptyPublicKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            spyOn(Recrypt, "generateGroupKeyPair").and.returnValue(
                Future.of({
                    publicKey: new Uint8Array(32),
                    plaintext: new Uint8Array(12),
                    privateKey: new Uint8Array(29),
                })
            );

            spyOn(Recrypt, "encryptPlaintext").and.returnValue(
                Future.of({
                    encryptedMessage: "stuff",
                })
            );

            spyOn(Recrypt, "generateTransformKey").and.returnValue(
                Future.of({
                    fromPrivateKey: new Uint8Array(29),
                    toPublicKey: TestUtils.getEmptyPublicKey(),
                })
            );

            GroupCrypto.createGroup(userKey, signingKeys, false).engage(
                (e) => fail(e),
                (groupKeys: any) => {
                    expect(groupKeys.encryptedGroupKey).toEqual({encryptedMessage: "stuff"});
                    expect(groupKeys.groupPublicKey).toEqual(new Uint8Array(32));

                    expect(Recrypt.generateGroupKeyPair).toHaveBeenCalledWith();
                    expect(Recrypt.encryptPlaintext).toHaveBeenCalledWith(new Uint8Array(12), userKey, signingKeys);

                    expect(Recrypt.generateTransformKey).not.toHaveBeenCalled();
                }
            );
        });

        it("maps errors to SDKError with specific error code", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            spyOn(Recrypt, "generateGroupKeyPair").and.returnValue(Future.reject(new Error("group key gen failure")));

            GroupCrypto.createGroup(TestUtils.getEmptyPublicKey(), signingKeys, false).engage(
                (error) => {
                    expect(error.message).toEqual("group key gen failure");
                    expect(error.code).toEqual(ErrorCodes.GROUP_KEY_GENERATION_FAILURE);
                },
                () => fail("Success should not be invoked when operations fail")
            );
        });
    });

    describe("addAdminsToGroup", () => {
        it("decrypts group private key encrypts it to the provided list of public keys", () => {
            spyOn(Recrypt, "decryptPlaintext").and.returnValue(Future.of(["decryptedPlaintext"]));
            spyOn(Recrypt, "encryptPlaintextToList").and.returnValue(Future.of(["accessKey1", "accessKey2"]));

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupCrypto.addAdminsToGroup(groupPrivateKey, userList, adminPrivateKey, signingKeys).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual(["accessKey1", "accessKey2"]);
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(groupPrivateKey, adminPrivateKey);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith("decryptedPlaintext", userList, signingKeys);
                }
            );
        });

        it("maps errors to SDKError with expected error code", () => {
            spyOn(Recrypt, "decryptPlaintext").and.returnValue(Future.reject(new Error("plaintext decryption failed")));

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupCrypto.addAdminsToGroup(groupPrivateKey, userList, adminPrivateKey, signingKeys).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decryption failed");
                    expect(error.code).toEqual(ErrorCodes.GROUP_KEY_DECRYPTION_FAILURE);
                },
                () => fail("Success should not be invoked when operations fail")
            );
        });
    });

    describe("addMembersToGroup", () => {
        it("decrypts key and reencrypts it to the list of users provided", (done) => {
            const signature = new Uint8Array(32);
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of(["anything", "documentSymKey"]) as any);
            jest.spyOn(Recrypt, "generateTransformKeyToList").mockReturnValue(Future.of("keysForUser") as any);
            jest.spyOn(Recrypt, "schnorrSignUtf8String").mockReturnValue(signature as any);

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();

            GroupCrypto.addMembersToGroup(groupPrivateKey, groupPublicKey, "groupID", userList, adminPrivateKey, signingKeys).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({transformKeyGrant: "keysForUser", signature});
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(groupPrivateKey, adminPrivateKey);
                    expect(Recrypt.generateTransformKeyToList).toHaveBeenCalledWith("documentSymKey", userList, signingKeys);
                    expect(Recrypt.schnorrSignUtf8String).toHaveBeenCalledWith("documentSymKey", groupPublicKey, "groupID");
                    done();
                }
            );
        });

        it("maps errors to SDKError with specific error code", () => {
            spyOn(Recrypt, "decryptPlaintext").and.returnValue(Future.reject(new Error("plaintext decryption failed")));

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();

            GroupCrypto.addMembersToGroup(groupPrivateKey, groupPublicKey, "groupID", userList, adminPrivateKey, signingKeys).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decryption failed");
                    expect(error.code).toEqual(ErrorCodes.GROUP_MEMBER_KEY_ENCRYPTION_FAILURE);
                },
                () => fail("Success should not be invoked when operations fail")
            );
        });
    });
});

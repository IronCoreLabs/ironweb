import * as GroupCrypto from "../GroupCrypto";
import * as Recrypt from "../crypto/recrypt";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import {ErrorCodes} from "../../../Constants";
import {publicKeyToBytes} from "../../../lib/Utils";

describe("GroupCrypto", () => {
    describe("createGroup", () => {
        it("generates new group keypair and encrypts it to the publickKeys of the users in the provided admin list", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            const adminList = [
                {id: "user1ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user2ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const memeberList = [{id: "user2ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()}];

            jest.spyOn(Recrypt, "generateGroupKeyPair").mockReturnValue(
                Future.of<any>({
                    publicKey: new Uint8Array(32),
                    plaintext: new Uint8Array(12),
                    privateKey: new Uint8Array(29),
                }) as any
            );

            jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>(["TransformKeyGrant"]) as any);

            jest.spyOn(Recrypt, "generateTransformKeyToList").mockReturnValue(
                Future.of<any>({
                    transformKeyGrant: [],
                }) as any
            );

            GroupCrypto.createGroup(signingKeys, memeberList, adminList).engage(
                (e) => {
                    throw e;
                },
                (groupKeys: any) => {
                    expect(groupKeys.encryptedAccessKeys).toEqual(["TransformKeyGrant"]);
                    expect(groupKeys.groupPublicKey).toEqual(new Uint8Array(32));
                    expect(Recrypt.generateGroupKeyPair).toHaveBeenCalledWith();
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(new Uint8Array(12), adminList, signingKeys);
                    expect(Recrypt.generateTransformKeyToList).toHaveBeenCalledWith(new Uint8Array(29), memeberList, signingKeys);
                }
            );
        });
        it("does not generate a TransformKey grant list if no membersList", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            const adminList = [
                {id: "user1ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user2ID", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];

            jest.spyOn(Recrypt, "generateGroupKeyPair").mockReturnValue(
                Future.of<any>({
                    publicKey: new Uint8Array(32),
                    plaintext: new Uint8Array(12),
                    privateKey: new Uint8Array(29),
                }) as any
            );

            jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>(["TransformKeyGrant"]) as any);

            jest.spyOn(Recrypt, "generateTransformKeyToList");
            GroupCrypto.createGroup(signingKeys, [], adminList).engage(
                (e) => {
                    throw e;
                },
                (groupKeys: any) => {
                    expect(groupKeys.encryptedAccessKeys).toEqual(["TransformKeyGrant"]);
                    expect(groupKeys.groupPublicKey).toEqual(new Uint8Array(32));
                    expect(groupKeys.transformKeyGrantList).toEqual([]);
                    expect(Recrypt.generateGroupKeyPair).toHaveBeenCalledWith();
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith(new Uint8Array(12), adminList, signingKeys);
                    expect(Recrypt.generateTransformKeyToList).toHaveBeenCalledWith(new Uint8Array(29), [], signingKeys);
                }
            );
        });
        it("maps errors to SDKError with specific error code", () => {
            const signingKeys = TestUtils.getSigningKeyPair();
            jest.spyOn(Recrypt, "generateGroupKeyPair").mockReturnValue(Future.reject(new Error("group key gen failure")));

            GroupCrypto.createGroup(signingKeys, [], []).engage(
                (error) => {
                    expect(error.message).toEqual("group key gen failure");
                    expect(error.code).toEqual(ErrorCodes.GROUP_KEY_GENERATION_FAILURE);
                },
                () => fail("Success should not be invoked when operations fail")
            );
        });
    });
    describe("rotateGroupPrivateKey", () => {
        it("rotate the current group private key, then return the augmentation factor and list of encrypted access keys for the admins in the adminList", () => {
            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const adminPrivateKey = new Uint8Array(23);
            const signingKeys = TestUtils.getSigningKeyPair();

            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>(["decryptedPlaintext", new Uint8Array()]) as any);
            jest.spyOn(Recrypt, "rotateGroupPrivateKeyWithRetry").mockReturnValue(
                Future.of<any>({
                    plaintext: "plaintext",
                    augmentationFactor: "augmentationFactor",
                }) as any
            );
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>(["accessKey1", "accessKey2"]) as any);

            GroupCrypto.rotatePrivateKey(groupPrivateKey, adminList, adminPrivateKey, signingKeys).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({encryptedAccessKeys: ["accessKey1", "accessKey2"], augmentationFactor: "augmentationFactor"});
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(groupPrivateKey, adminPrivateKey);
                    expect(Recrypt.rotateGroupPrivateKeyWithRetry).toHaveBeenCalledWith(new Uint8Array());
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith("plaintext", adminList, signingKeys);
                }
            );
        });
        it("maps errors to SDKError with expected error code", () => {
            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const adminPrivateKey = new Uint8Array(23);
            const signingKeys = TestUtils.getSigningKeyPair();

            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decryption failed")));

            GroupCrypto.rotatePrivateKey(groupPrivateKey, adminList, adminPrivateKey, signingKeys).engage(
                (error) => {
                    expect(error.message).toEqual("plaintext decryption failed");
                    expect(error.code).toEqual(ErrorCodes.GROUP_PRIVATE_KEY_ROTATION_FAILURE);
                },
                () => fail("Success should not be invoked when operations fail")
            );
        });
    });
    describe("addAdminsToGroup", () => {
        it("decrypts group private key encrypts it to the provided list of public keys", () => {
            const signature = new Uint8Array(32);
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>(["decryptedPlaintext", "key"]) as any);
            jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>(["accessKey1", "accessKey2"]) as any);
            jest.spyOn(Recrypt, "schnorrSignUtf8String").mockReturnValue(signature as any);

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupCrypto.addAdminsToGroup(groupPrivateKey, groupPublicKey, "groupID", userList, adminPrivateKey, signingKeys).engage(
                (e) => fail(e.message),
                (result: any) => {
                    expect(result).toEqual({encryptedAccessKey: ["accessKey1", "accessKey2"], signature});
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(groupPrivateKey, adminPrivateKey);
                    expect(Recrypt.encryptPlaintextToList).toHaveBeenCalledWith("decryptedPlaintext", userList, signingKeys);
                    expect(Recrypt.schnorrSignUtf8String).toHaveBeenCalledWith("key", publicKeyToBytes(groupPublicKey), "groupID");
                }
            );
        });

        it("maps errors to SDKError with expected error code", () => {
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decryption failed")));

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupCrypto.addAdminsToGroup(groupPrivateKey, groupPublicKey, "groupID", userList, adminPrivateKey, signingKeys).engage(
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
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>(["anything", "documentSymKey"]) as any);
            jest.spyOn(Recrypt, "generateTransformKeyToList").mockReturnValue(Future.of<any>("keysForUser") as any);
            jest.spyOn(Recrypt, "schnorrSignUtf8String").mockReturnValue(signature as any);

            const groupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const adminPrivateKey = new Uint8Array(20);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const signingKeys = TestUtils.getSigningKeyPair();
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();

            GroupCrypto.addMembersToGroup(groupPrivateKey, groupPublicKey, "groupID", userList, adminPrivateKey, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({transformKeyGrant: "keysForUser", signature});
                    expect(Recrypt.decryptPlaintext).toHaveBeenCalledWith(groupPrivateKey, adminPrivateKey);
                    expect(Recrypt.generateTransformKeyToList).toHaveBeenCalledWith("documentSymKey", userList, signingKeys);
                    expect(Recrypt.schnorrSignUtf8String).toHaveBeenCalledWith("documentSymKey", publicKeyToBytes(groupPublicKey), "groupID");
                    done();
                }
            );
        });

        it("maps errors to SDKError with specific error code", () => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("plaintext decryption failed")));

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

import * as GroupOperations from "../GroupOperations";
import * as WorkerMediator from "../../WorkerMediator";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";

describe("GroupOperations", () => {
    describe("groupCreate", () => {
        it("sends worker message to create group", () => {
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(Future.of<any>({message: "new group"}));
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupOperations.groupCreate(signingKeys, [], []).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual("new group");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_CREATE",
                        message: {
                            signingKeys,
                            memberList: [],
                            adminList: [],
                        },
                    });
                }
            );
        });
    });

    describe("rotateGroupPrivateKeyAndEncryptToAdmins", () => {
        it("send message to worker to Rotate group private key and create new encryptedAccessKeys for all admins of that group", () => {
            const encryptedGroupKey = TestUtils.getTransformedSymmetricKey();
            const adminList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const userPrivateMasterKey = new Uint8Array(32);
            const signingKeys = TestUtils.getSigningKeyPair();

            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {encryptedAccessKeys: "accessKey", augmentationFactor: "augmentationFactor"},
                }) as any
            );

            GroupOperations.rotateGroupPrivateKeyAndEncryptToAdmins(encryptedGroupKey, adminList, userPrivateMasterKey, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (result) => {
                    expect(result).toEqual({encryptedAccessKeys: "accessKey", augmentationFactor: "augmentationFactor"});
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "ROTATE_GROUP_PRIVATE_KEY",
                        message: {
                            encryptedGroupKey,
                            adminList,
                            userPrivateMasterKey,
                            signingKeys,
                        },
                    });
                }
            );
        });
    });

    describe("encryptGroupPrivateKeyToList", () => {
        it("sends message to worker to encrypt group encrypte private key to list", () => {
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(Future.of<any>({message: "encrypted user keys"}));
            const userPrivateKey = new Uint8Array(32);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const encryptedGroupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const signingKeys = TestUtils.getSigningKeyPair();
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();

            GroupOperations.encryptGroupPrivateKeyToList(encryptedGroupPrivateKey, groupPublicKey, "groupID", userList, userPrivateKey, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual("encrypted user keys");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_ADD_ADMINS",
                        message: {
                            encryptedGroupKey: encryptedGroupPrivateKey,
                            groupPublicKey: groupPublicKey,
                            groupID: "groupID",
                            userKeyList: userList,
                            adminPrivateKey: userPrivateKey,
                            signingKeys,
                        },
                    });
                }
            );
        });
    });

    describe("generateGroupTransformKeyToList", () => {
        it("sends message to worker to generate transform key to list", () => {
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(Future.of<any>({message: "transformed user keys"}));
            const userPrivateKey = new Uint8Array(32);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const encryptedGroupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const signingKeys = TestUtils.getSigningKeyPair();
            const groupPublicKey = TestUtils.getEmptyPublicKeyString();

            GroupOperations.generateGroupTransformKeyToList(encryptedGroupPrivateKey, groupPublicKey, "GroupID", userList, userPrivateKey, signingKeys).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual("transformed user keys");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_ADD_MEMBERS",
                        message: {
                            encryptedGroupKey: encryptedGroupPrivateKey,
                            groupPublicKey: groupPublicKey,
                            groupID: "GroupID",
                            userKeyList: userList,
                            adminPrivateKey: userPrivateKey,
                            signingKeys,
                        },
                    });
                }
            );
        });
    });
});

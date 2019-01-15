import * as GroupOperations from "../GroupOperations";
import * as WorkerMediator from "../../WorkerMediator";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";

describe("GroupOperations", () => {
    describe("groupCreate", () => {
        it("sends worker message to create group", () => {
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "new group"}));
            const signingKeys = TestUtils.getSigningKeyPair();
            const userKey = TestUtils.getEmptyPublicKey();

            GroupOperations.groupCreate(userKey, signingKeys, true).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("new group");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_CREATE",
                        message: {
                            userPublicKey: userKey,
                            addAsMember: true,
                            signingKeys,
                        },
                    });
                }
            );
        });

        it("sends provided option value as addAsMember property of message", () => {
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: ""}));
            const userKey = TestUtils.getEmptyPublicKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupOperations.groupCreate(userKey, signingKeys, false).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_CREATE",
                        message: {
                            userPublicKey: userKey,
                            addAsMember: false,
                            signingKeys,
                        },
                    });
                }
            );
        });
    });

    describe("encryptGroupPrivateKeyToList", () => {
        it("sends message to worker to encrypt group encrypte private key to list", () => {
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "encrypted user keys"}));
            const userPrivateKey = new Uint8Array(32);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const encryptedGroupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupOperations.encryptGroupPrivateKeyToList(encryptedGroupPrivateKey, userList, userPrivateKey, signingKeys).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("encrypted user keys");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_ADD_ADMINS",
                        message: {
                            encryptedGroupKey: encryptedGroupPrivateKey,
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
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "transformed user keys"}));
            const userPrivateKey = new Uint8Array(32);
            const userList = [{id: "user-35", masterPublicKey: {x: "", y: ""}}];
            const encryptedGroupPrivateKey = TestUtils.getTransformedSymmetricKey();
            const signingKeys = TestUtils.getSigningKeyPair();

            GroupOperations.generateGroupTransformKeyToList(encryptedGroupPrivateKey, userList, userPrivateKey, signingKeys).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual("transformed user keys");

                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "GROUP_ADD_MEMBERS",
                        message: {
                            encryptedGroupKey: encryptedGroupPrivateKey,
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

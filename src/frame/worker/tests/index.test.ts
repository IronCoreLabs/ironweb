import Future from "futurejs";
import {messenger} from "../";
import SDKError from "../../../lib/SDKError";
import * as DocumentCrypto from "../DocumentCrypto";
import * as GroupCrypto from "../GroupCrypto";
import * as UserCrypto from "../UserCrypto";
import {fromByteArray} from "base64-js";

describe("worker index", () => {
    describe("ParentThreadMessenger", () => {
        it("posts proper worker message to parent window", () => {
            jest.spyOn(window, "postMessage").mockImplementation();

            messenger.postMessageToParent({foo: "bar"} as any, 10);

            expect(window.postMessage).toHaveBeenCalledWith(
                {
                    replyID: 10,
                    data: {foo: "bar"},
                },
                []
            );
        });

        it("converts byte arrays to array buffers in transfer list", () => {
            jest.spyOn(window, "postMessage").mockImplementation();
            const bytes = new Uint8Array(3);

            messenger.postMessageToParent({foo: "bar"} as any, 10, [bytes]);

            expect(window.postMessage).toHaveBeenCalledWith(
                {
                    replyID: 10,
                    data: {foo: "bar"},
                },
                [new ArrayBuffer(3)]
            );
        });

        it("invokes message callback with event data when processing", () => {
            jest.spyOn(window, "postMessage").mockImplementation();
            const bytes = new Uint8Array(3);
            jest.spyOn(messenger, "onMessageCallback");

            messenger.processMessageIntoWorker({data: {data: {foo: "bar"}, replyID: 38}} as MessageEvent);

            expect(messenger.onMessageCallback).toHaveBeenCalledWith({foo: "bar"}, expect.any(Function));
            const callback = (messenger.onMessageCallback as unknown as jest.SpyInstance).mock.calls[0][1];
            callback({response: "data"}, [bytes]);

            expect(window.postMessage).toHaveBeenCalledWith(
                {
                    replyID: 38,
                    data: {response: "data"},
                },
                [new ArrayBuffer(3)]
            );
        });
    });

    describe("user crypto tests", () => {
        it("USER_DEVICE_KEYGEN", (done) => {
            jest.spyOn(UserCrypto, "generateDeviceAndSigningKeys").mockReturnValue(Future.of<any>("new keys"));
            const payload: any = {
                type: "USER_DEVICE_KEYGEN",
                message: {
                    jwtToken: "jwt",
                    passcode: "passcode",
                    keySalt: "salt",
                    encryptedPrivateUserKey: "user key",
                    publicUserKey: "public user key",
                    userID: "user id",
                    segmentID: "segment id",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: expect.any(String), message: "new keys"});
                expect(UserCrypto.generateDeviceAndSigningKeys).toHaveBeenCalledWith("jwt", "passcode", "salt", "user key", "public user key");
                done();
            });
        });

        it("NEW_USER_KEYGEN", (done) => {
            jest.spyOn(UserCrypto, "generateNewUserKeys").mockReturnValue(Future.of<any>("new keys"));
            const payload: any = {
                type: "NEW_USER_KEYGEN",
                message: {
                    passcode: "passcode",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: expect.any(String), message: "new keys"});
                expect(UserCrypto.generateNewUserKeys).toHaveBeenCalledWith("passcode");
                done();
            });
        });

        it("NEW_USER_AND_DEVICE_KEYGEN", (done) => {
            jest.spyOn(UserCrypto, "generateNewUserAndDeviceKeys").mockReturnValue(Future.of<any>("new keys"));
            const payload: any = {
                type: "NEW_USER_AND_DEVICE_KEYGEN",
                message: {
                    passcode: "passcode",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: expect.any(String), message: "new keys"});
                expect(UserCrypto.generateNewUserAndDeviceKeys).toHaveBeenCalledWith("passcode");
                done();
            });
        });

        it("DECRYPT_LOCAL_KEYS", (done) => {
            jest.spyOn(UserCrypto, "decryptDeviceAndSigningKeys").mockReturnValue(Future.of<any>("decrypted keys"));
            const payload: any = {
                type: "DECRYPT_LOCAL_KEYS",
                message: {
                    encryptedDeviceKey: "device",
                    encryptedSigningKey: "signing",
                    symmetricKey: "sym key",
                    nonce: "nonce",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: expect.any(String), message: "decrypted keys"});
                expect(UserCrypto.decryptDeviceAndSigningKeys).toHaveBeenCalledWith("device", "signing", "sym key", "nonce");
                done();
            });
        });

        it("ROTATE_USER_PRIVATE_KEY", (done) => {
            jest.spyOn(UserCrypto, "rotatePrivateKey").mockReturnValue(Future.of<any>("rotated user key"));
            const payload: any = {
                type: "ROTATE_USER_PRIVATE_KEY",
                message: {passcode: "passcode", encryptedPrivateUserKey: "encryptedPrivateUserKey"},
            };
            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: "ROTATE_USER_PRIVATE_KEY_RESPONSE", message: "rotated user key"});
                expect(UserCrypto.rotatePrivateKey).toHaveBeenCalledWith("passcode", "encryptedPrivateUserKey");
                done();
            });
        });

        it("CHANGE_USER_PASSCODE", (done) => {
            jest.spyOn(UserCrypto, "changeUsersPasscode").mockReturnValue(Future.of<any>("new encrypted private key"));
            const payload: any = {
                type: "CHANGE_USER_PASSCODE",
                message: {
                    currentPasscode: "current",
                    newPasscode: "new",
                    keySalt: "key salt",
                    encryptedPrivateUserKey: "current encrypted private key",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: "CHANGE_USER_PASSCODE_RESPONSE", message: "new encrypted private key"});
                expect(UserCrypto.changeUsersPasscode).toHaveBeenCalledWith("current", "new", "current encrypted private key");
                done();
            });
        });

        it("SIGNATURE_GENERATION", (done) => {
            jest.spyOn(UserCrypto, "signRequestPayload").mockReturnValue("signature" as any);
            const payload: any = {
                type: "SIGNATURE_GENERATION",
                message: {
                    segmentID: 1,
                    userID: "user-10",
                    signingKeys: {publicKey: new Uint8Array(32), privateKey: new Uint8Array(64)},
                    method: "GET",
                    url: "/path/to/resource",
                    body: '{"foo":"bar"}',
                },
            };
            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({type: "SIGNATURE_GENERATION_RESPONSE", message: "signature"});
                expect(UserCrypto.signRequestPayload).toHaveBeenCalledWith(
                    1,
                    "user-10",
                    {publicKey: new Uint8Array(32), privateKey: new Uint8Array(64)},
                    "GET",
                    "/path/to/resource",
                    '{"foo":"bar"}'
                );
                done();
            });
        });
    });

    describe("document crypto tests", () => {
        it("DOCUMENT_ENCRYPT", (done) => {
            const encryptedDoc = {
                encryptedDocument: {
                    content: new Uint8Array(3),
                },
            };
            jest.spyOn(DocumentCrypto, "encryptDocument").mockReturnValue(Future.of<any>(encryptedDoc));

            const payload: any = {
                type: "DOCUMENT_ENCRYPT",
                message: {
                    document: "document",
                    signingKeys: "signkeys",
                    userKeyList: "list of user public keys",
                    groupKeyList: "list of group public keys",
                },
            };

            messenger.onMessageCallback!(payload, (result: any, transferList: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual(encryptedDoc);
                expect(transferList).toEqual([encryptedDoc.encryptedDocument.content]);
                expect(DocumentCrypto.encryptDocument).toHaveBeenCalledWith("document", "list of user public keys", "list of group public keys", "signkeys");
                done();
            });
        });

        it("DOCUMENT_DECRYPT", (done) => {
            jest.spyOn(DocumentCrypto, "decryptDocument").mockReturnValue(Future.of<any>("decrypted doc"));

            const payload: any = {
                type: "DOCUMENT_DECRYPT",
                message: {
                    document: "document",
                    encryptedSymmetricKey: "sym key",
                    privateKey: "priv key",
                },
            };

            messenger.onMessageCallback!(payload, (result: any, transferList: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual({decryptedDocument: "decrypted doc"});
                expect(transferList).toEqual(["decrypted doc"]);
                expect(DocumentCrypto.decryptDocument).toHaveBeenCalledWith("document", "sym key", "priv key");
                done();
            });
        });

        it("DOCUMENT_REENCRYPT", (done) => {
            const encryptedDoc = {
                content: "encrypted doc content",
            };
            jest.spyOn(DocumentCrypto, "reEncryptDocument").mockReturnValue(Future.of<any>(encryptedDoc));

            const payload: any = {
                type: "DOCUMENT_REENCRYPT",
                message: {
                    document: "document",
                    existingDocumentSymmetricKey: "sym key",
                    privateKey: "priv key",
                },
            };

            messenger.onMessageCallback!(payload, (result: any, transferList: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual({encryptedDocument: encryptedDoc});
                expect(transferList).toEqual([encryptedDoc.content]);
                expect(DocumentCrypto.reEncryptDocument).toHaveBeenCalledWith("document", "sym key", "priv key");
                done();
            });
        });

        it("DOCUMENT_ENCRYPT_TO_KEYS", (done) => {
            jest.spyOn(DocumentCrypto, "encryptToKeys").mockReturnValue(Future.of<any>("key list"));

            const payload: any = {
                type: "DOCUMENT_ENCRYPT_TO_KEYS",
                message: {
                    userKeyList: "user grant list",
                    groupKeyList: "group grant list",
                    symmetricKey: "sym key",
                    privateKey: "priv key",
                    signingKeys: "signkeys",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual("key list");
                expect(DocumentCrypto.encryptToKeys).toHaveBeenCalledWith("sym key", "user grant list", "group grant list", "priv key", "signkeys");
                done();
            });
        });
    });

    describe("group message handling", () => {
        it("GROUP_CREATE", (done) => {
            const creator = {id: "35", masterPublicKey: {x: fromByteArray(new Uint8Array(32)), y: fromByteArray(new Uint8Array(32))}};
            jest.spyOn(GroupCrypto, "createGroup").mockReturnValue(Future.of<any>("created group") as any);

            const payload: any = {
                type: "GROUP_CREATE",
                message: {
                    signingKeys: "signkeys",
                    memberList: [creator],
                    adminList: [creator],
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual("created group");
                expect(GroupCrypto.createGroup).toHaveBeenCalledWith("signkeys", [creator], [creator]);
                done();
            });
        });

        it("ROTATE_GROUP_PRIVATE_KEY", (done) => {
            jest.spyOn(GroupCrypto, "rotatePrivateKey").mockReturnValue(Future.of<any>("rotate group key") as any);

            const payload: any = {
                type: "ROTATE_GROUP_PRIVATE_KEY",
                message: {
                    encryptedGroupKey: {
                        foo: "bar",
                    },
                    adminList: ["32", "13"],
                    userPrivateMasterKey: new Uint8Array(32),
                    signingKeys: "signkeys",
                },
            };
            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual("rotate group key");
                expect(GroupCrypto.rotatePrivateKey).toHaveBeenCalledWith({foo: "bar"}, ["32", "13"], new Uint8Array(32), "signkeys");
                done();
            });
        });

        it("GROUP_ADD_ADMINS", (done) => {
            jest.spyOn(GroupCrypto, "addAdminsToGroup").mockReturnValue(Future.of<any>("added admins"));

            const payload: any = {
                type: "GROUP_ADD_ADMINS",
                message: {
                    encryptedGroupKey: {
                        foo: "bar",
                    },
                    groupPublicKey: new Uint8Array(32),
                    groupID: "groupID",
                    userKeyList: ["32", "13"],
                    adminPrivateKey: new Uint8Array(32),
                    signingKeys: "signkeys",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual("added admins");
                expect(GroupCrypto.addAdminsToGroup).toHaveBeenCalledWith(
                    {foo: "bar"},
                    new Uint8Array(32),
                    "groupID",
                    ["32", "13"],
                    new Uint8Array(32),
                    "signkeys"
                );
                done();
            });
        });

        it("GROUP_ADD_MEMBERS", (done) => {
            jest.spyOn(GroupCrypto, "addMembersToGroup").mockReturnValue(Future.of<any>("added members"));

            const payload: any = {
                type: "GROUP_ADD_MEMBERS",
                message: {
                    encryptedGroupKey: {
                        foo: "bar",
                    },
                    groupPublicKey: new Uint8Array(32),
                    groupID: "groupID",
                    userKeyList: ["32", "13"],
                    adminPrivateKey: new Uint8Array(32),
                    signingKeys: "signkeys",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result.type).toEqual(expect.any(String));
                expect(result.message).toEqual("added members");
                expect(GroupCrypto.addMembersToGroup).toHaveBeenCalledWith(
                    {foo: "bar"},
                    new Uint8Array(32),
                    "groupID",
                    ["32", "13"],
                    new Uint8Array(32),
                    "signkeys"
                );
                done();
            });
        });
    });

    describe("error message handling", () => {
        it("returns error response with formatted code and message", (done) => {
            jest.spyOn(DocumentCrypto, "encryptToKeys").mockReturnValue(Future.reject(new SDKError(new Error("invalid"), 34)));
            const payload: any = {
                type: "DOCUMENT_ENCRYPT_TO_KEYS",
                message: {
                    userKeyList: "user list",
                    symmetricKey: "sym key",
                    privateKey: "priv key",
                },
            };

            messenger.onMessageCallback!(payload, (result: any) => {
                expect(result).toEqual({
                    type: "ERROR_RESPONSE",
                    message: {
                        code: 34,
                        text: "invalid",
                    },
                });
                done();
            });
        });

        it("if you bypass typescript's checks you just get your original message back", () => {
            messenger.onMessageCallback({type: "UNKNOWN", message: "data"} as any, (result: any) => expect(result).toBe("data"));
        });
    });
});

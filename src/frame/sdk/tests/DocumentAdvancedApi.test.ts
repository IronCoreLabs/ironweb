import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import * as TestUtils from "../../../tests/TestUtils";
import ApiState from "../../ApiState";
import EncryptedDekEndpoints from "../../endpoints/EncryptedDekEndpoints";
import GroupApiEndpoints from "../../endpoints/GroupApiEndpoints";
import PolicyApiEndpoints from "../../endpoints/PolicyApiEndpoints";
import UserApiEndpoints from "../../endpoints/UserApiEndpoints";
import * as DocumentAdvancedApi from "../DocumentAdvancedApi";
import * as DocumentOperations from "../DocumentOperations";

describe("DocumentAdvancedApi", () => {
    const privateDeviceKey = new Uint8Array([23]);
    const publicDeviceKey = TestUtils.getEmptyPublicKey();
    beforeEach(() => {
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys({publicKey: publicDeviceKey, privateKey: privateDeviceKey}, TestUtils.getSigningKeyPair());
    });

    describe("decryptUnmanaged", () => {
        it("rejects if not a known document header version", () => {
            const edeks = new Uint8Array([]);
            const eDoc = new Uint8Array([99, 35, 235]);
            DocumentAdvancedApi.decryptUnmanaged(eDoc, edeks).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                },
                () => {
                    throw new Error("Should reject when document is not one of ours");
                }
            );
        });

        it("rejects if edeks is an empty array", () => {
            const edeks = new Uint8Array([]);
            const eDoc = new Uint8Array([2, 35, 52, 13, 63, 23, 63, 34]);
            DocumentAdvancedApi.decryptUnmanaged(eDoc, edeks).engage(
                (e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                },
                () => {
                    throw new Error("Should reject when document header is invalid");
                }
            );
        });

        it("returns doc in raw bytes when asked", () => {
            const eDoc = TestUtils.getEncryptedDocumentBytes();
            const decryptedBytes = new Uint8Array([36, 89, 72]);
            const edeks = new Uint8Array([22, 33, 44]);

            jest.spyOn(EncryptedDekEndpoints, "callEncryptedDekTransformApi").mockReturnValue(
                Future.of<any>({encryptedSymmetricKey: TestUtils.getTransformedSymmetricKey()})
            );
            jest.spyOn(DocumentOperations, "decryptDocument").mockReturnValue(Future.of<any>(decryptedBytes));

            DocumentAdvancedApi.decryptUnmanaged(eDoc, edeks).engage(
                (e) => {
                    throw new Error(e.message);
                },
                ({data}) => {
                    expect(data).toEqual(decryptedBytes);
                }
            );
        });
    });

    describe("encrypt", () => {
        it("encrypts to list of users and groups provided one", (done) => {
            const encryptedDocument = TestUtils.getEncryptedDocument();
            const encryptedSymKey = TestUtils.getEncryptedSymmetricKey();
            const returnedUserKeys = [
                {id: "user-55", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
                {id: "user-33", userMasterPublicKey: TestUtils.getEmptyPublicKeyString()},
            ];
            const returnedGroupKeys = [{id: "group-20", groupMasterPublicKey: TestUtils.getEmptyPublicKeyString()}];

            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: returnedUserKeys,
                })
            );
            jest.spyOn(GroupApiEndpoints, "callGroupKeyListApi").mockReturnValue(
                Future.of<any>({
                    result: returnedGroupKeys,
                })
            );
            jest.spyOn(PolicyApiEndpoints, "callApplyPolicyApi").mockReturnValue(
                Future.of<any>({
                    usersAndGroups: [
                        {id: "group-policy", type: "group", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-policy", type: "user", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                    ],
                    invalidUsersAndGroups: [],
                })
            );
            jest.spyOn(DocumentOperations, "encryptNewDocumentToList").mockReturnValue(
                Future.of<any>({
                    userAccessKeys: [{id: "user-10", encryptedPlaintext: encryptedSymKey, publicKey: TestUtils.getEmptyPublicKeyString()}],
                    groupAccessKeys: [{id: "group-10", encryptedPlaintext: encryptedSymKey, publicKey: TestUtils.getEmptyPublicKeyString()}],
                    encryptedDocument,
                })
            );

            DocumentAdvancedApi.encryptUnmanaged("doc key", new Uint8Array([88, 73, 92]), ["user-55", "user-33"], ["group-20"], true, {}).engage(
                (e) => done(e),
                ({edeks, document, documentID}) => {
                    const userKeyList = [
                        {id: "user-55", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-33", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-policy", masterPublicKey: TestUtils.getEmptyPublicKeyString(), type: "user"},
                        {id: "user-10", masterPublicKey: {x: TestUtils.userPublicXString, y: TestUtils.userPublicYString}},
                    ];
                    const groupKeyList = [
                        {id: "group-20", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "group-policy", masterPublicKey: TestUtils.getEmptyPublicKeyString(), type: "group"},
                    ];

                    expect(documentID).toEqual("doc key");
                    expect(edeks).toEqual(expect.any(Uint8Array));
                    expect(document).toEqual(expect.any(Uint8Array));

                    expect(DocumentOperations.encryptNewDocumentToList).toHaveBeenCalledWith(
                        new Uint8Array([88, 73, 92]),
                        userKeyList,
                        groupKeyList,
                        ApiState.signingKeys()
                    );
                    expect(PolicyApiEndpoints.callApplyPolicyApi).toHaveBeenCalledWith({});
                    expect(GroupApiEndpoints.callGroupKeyListApi).toHaveBeenCalledWith(["group-20"]);
                    expect(UserApiEndpoints.callUserKeyListApi).toHaveBeenCalledWith(["user-55", "user-33"]);
                    done();
                }
            );
        });
    });

    describe("decryptStreamUnmanaged", () => {
        it("transforms edeks then calls DocumentOperations.decryptDocumentStream", (done) => {
            jest.spyOn(EncryptedDekEndpoints, "callEncryptedDekTransformApi").mockReturnValue(
                Future.of<any>({
                    encryptedSymmetricKey: TestUtils.getTransformedSymmetricKey(),
                    userOrGroup: {type: "user", id: "userId"},
                })
            );
            jest.spyOn(DocumentOperations, "decryptDocumentStream").mockReturnValue(Future.of<any>(undefined));

            const iv = new Uint8Array(12);
            const edeks = new Uint8Array(100);
            const encryptedStream = new ReadableStream<Uint8Array>();
            const plaintextStream = new WritableStream<Uint8Array>();

            DocumentAdvancedApi.decryptStreamUnmanaged(iv, edeks, encryptedStream, plaintextStream).engage(
                (e) => done(e),
                (result) => {
                    expect(result).toEqual({accessVia: {type: "user", id: "userId"}});
                    expect(DocumentOperations.decryptDocumentStream).toHaveBeenCalled();
                    done();
                }
            );
        });
    });

    describe("encryptStreamUmanaged", () => {
        it("writes header, resolves keys, and returns edeks", (done) => {
            jest.spyOn(UserApiEndpoints, "callUserKeyListApi").mockReturnValue(Future.of<any>({result: []}));
            jest.spyOn(GroupApiEndpoints, "getGroupPublicKeyList").mockReturnValue(Future.of<any>([]));
            jest.spyOn(PolicyApiEndpoints, "callApplyPolicyApi").mockReturnValue(Future.of<any>({usersAndGroups: [], invalidUsersAndGroups: []}));
            jest.spyOn(DocumentOperations, "encryptDocumentStream").mockReturnValue(Future.of<any>({userAccessKeys: [], groupAccessKeys: []}));

            const plaintextStream = new ReadableStream<Uint8Array>();
            const ciphertextStream = new WritableStream<Uint8Array>();

            DocumentAdvancedApi.encryptStreamUnmanaged("docID", plaintextStream, ciphertextStream, [], [], true).engage(
                (e) => done(e),
                (result) => {
                    expect(result.documentID).toEqual("docID");
                    expect(result.edeks).toEqual(expect.any(Uint8Array));
                    expect(DocumentOperations.encryptDocumentStream).toHaveBeenCalled();
                    done();
                }
            );
        });
    });
});

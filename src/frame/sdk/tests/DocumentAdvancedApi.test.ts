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

    describe("decryptWithProvidedEdeks", () => {
        it("rejects if edeks is an empty array", () => {
            const edeks = new Uint8Array([]);
            const eDoc = new Uint8Array([2, 35, 52, 13, 63, 23, 63, 34]);
            DocumentAdvancedApi.decryptWithProvidedEdeks(eDoc, edeks).engage(
                (e) => {
                    expect(e.message).toBeString();
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                },
                () => fail("Should reject when edeks is an empty array")
            );
        });

        it("returns doc in raw bytes when asked", () => {
            const eDoc = new Uint8Array([2, 35, 52, 13, 63, 23, 63, 34]);
            const decryptedBytes = new Uint8Array([36, 89, 72]);
            const edeks = new Uint8Array([22, 33, 44]);

            spyOn(EncryptedDekEndpoints, "callEncryptedDekTransformApi").and.returnValue(
                Future.of({encryptedSymmetricKey: TestUtils.getTransformedSymmetricKey()})
            );
            spyOn(DocumentOperations, "decryptDocument").and.returnValue(Future.of(decryptedBytes));

            DocumentAdvancedApi.decryptWithProvidedEdeks(eDoc, edeks).engage(
                (e) => fail(e.message),
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

            spyOn(UserApiEndpoints, "callUserKeyListApi").and.returnValue(
                Future.of({
                    result: returnedUserKeys,
                })
            );
            spyOn(GroupApiEndpoints, "callGroupKeyListApi").and.returnValue(
                Future.of({
                    result: returnedGroupKeys,
                })
            );
            spyOn(PolicyApiEndpoints, "callApplyPolicyApi").and.returnValue(
                Future.of({
                    usersAndGroups: [
                        {id: "group-policy", type: "group", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                        {id: "user-policy", type: "user", masterPublicKey: TestUtils.getEmptyPublicKeyString()},
                    ],
                    invalidUsersAndGroups: [],
                })
            );
            spyOn(DocumentOperations, "encryptNewDocumentToList").and.returnValue(
                Future.of({
                    userAccessKeys: [{id: "user-10", encryptedPlaintext: encryptedSymKey, publicKey: TestUtils.getEmptyPublicKeyString()}],
                    groupAccessKeys: [{id: "group-10", encryptedPlaintext: encryptedSymKey, publicKey: TestUtils.getEmptyPublicKeyString()}],
                    encryptedDocument,
                })
            );

            DocumentAdvancedApi.encrypt("doc key", new Uint8Array([88, 73, 92]), ["user-55", "user-33"], ["group-20"], true, {}).engage(
                (e) => fail(e.message),
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
});

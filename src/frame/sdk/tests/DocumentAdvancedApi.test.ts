import * as DocumentAdvancedApi from "../DocumentAdvancedApi";
import * as TestUtils from "../../../tests/TestUtils";
import * as DocumentOperations from "../DocumentOperations";
import Future from "futurejs";
import ApiState from "../../ApiState";
import {ErrorCodes} from "../../../Constants";
import EncryptedDekEndpoints from "../../endpoints/EncryptedDekEndpoints";

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
            DocumentAdvancedApi.decryptWithProvidedEdeks(edeks, eDoc).engage(
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

            DocumentAdvancedApi.decryptWithProvidedEdeks(edeks, eDoc).engage(
                (e) => fail(e.message),
                ({data}) => {
                    expect(data).toEqual(decryptedBytes);
                }
            );
        });
    });
});

import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import ApiState from "../../ApiState";
import EncryptedDekEndpoints from "../EncryptedDekEndpoints";

describe("EncryptedDekEndpoints", () => {
    beforeEach(() => {
        jest.spyOn(ApiRequest, "makeAuthorizedApiRequest").mockReturnValue(
            Future.of<any>({
                foo: "bar",
            })
        );
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
    });

    describe("callEncryptedDekTransformApi", () => {
        it("sends the right data to the api", () => {
            const edeks = new Uint8Array([100, 200, 300]);

            EncryptedDekEndpoints.callEncryptedDekTransformApi(edeks).engage(
                () => fail("edeks/transform should not reject"),
                (response: any) => {
                    expect(response).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith("edeks/transform", expect.any(Number), expect.any(Object));

                    const request = (ApiRequest.makeAuthorizedApiRequest as jasmine.Spy).calls.argsFor(0)[2];
                    expect(request.body).toEqual(edeks);
                }
            );
        });
    });
});

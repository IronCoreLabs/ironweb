import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as ApiRequest from "../../ApiRequest";
import ApiState from "../../ApiState";
import PolicyApiEndpoints from "../PolicyApiEndpoints";

describe("PolicyApiEndpoint", () => {
    beforeEach(() => {
        spyOn(ApiRequest, "makeAuthorizedApiRequest").and.returnValue(
            Future.of({
                foo: "bar",
            })
        );
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys(TestUtils.getEmptyKeyPair(), TestUtils.getSigningKeyPair());
    });

    describe("callApplyPolicyApi", () => {
        test("should append all values if set", () => {
            PolicyApiEndpoints.callApplyPolicyApi({
                sensitivity: "classy boi",
                category: "catty&batty",
                dataSubject: "Tommy&Fing B",
                substituteUser: "CZECH REPUB",
            }).engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "policies?sensitivity=classy%20boi&category=catty%26batty&dataSubject=Tommy%26Fing%20B&substituteId=CZECH%20REPUB",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });

        it("should leave off unset values", () => {
            PolicyApiEndpoints.callApplyPolicyApi({
                sensitivity: "classy boi",
                category: "catty&batty",
                dataSubject: null,
            } as any).engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(ApiRequest.makeAuthorizedApiRequest).toHaveBeenCalledWith(
                        "policies?sensitivity=classy%20boi&category=catty%26batty",
                        expect.any(Number),
                        expect.any(Object)
                    );
                }
            );
        });
    });
});

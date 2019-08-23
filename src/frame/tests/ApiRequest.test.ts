import Future from "futurejs";
import * as ApiRequest from "../ApiRequest";
import * as WorkerMediator from "../WorkerMediator";
import {ErrorCodes} from "../../Constants";
import * as TestUtils from "../../tests/TestUtils";

describe("ApiRequest", () => {
    describe("getRequestSignature", () => {
        it("sends message to worker and maps response to auth header string", () => {
            spyOn(WorkerMediator, "sendMessage").and.returnValue(
                Future.of({
                    message: {
                        version: 35,
                        message: "mess",
                        signature: "signature",
                    },
                })
            );

            ApiRequest.getRequestSignature(1, "user-10", TestUtils.getSigningKeyPair()).engage(
                (e) => fail(e.message),
                (signature) => {
                    expect(signature).toEqual("IronCore 35.mess.signature");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "SIGNATURE_GENERATION",
                        message: {
                            segmentID: 1,
                            userID: "user-10",
                            signingKeys: TestUtils.getSigningKeyPair(),
                            signatureVersion: 1,
                        },
                    });
                }
            );
        });
    });

    describe("fetchJSON", () => {
        const authHeaderFuture = Future.of("auth jwt");
        beforeAll(() => {
            if (typeof window.fetch === "function") {
                spyOn(window, "fetch");
            } else {
                window.fetch = jasmine.createSpy("fetch");
            }
        });

        it("invokes window.fetch with expected parameters", () => {
            const fetchFuture = ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture);
            fetchFuture.engage(jasmine.createSpy("fetchFailure"), jasmine.createSpy("fetchSuccess"));

            expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                method: "POST",
                headers: {Authorization: "auth jwt", "Content-Type": "application/json"},
            });
        });

        it("invokes window.fetch with octet-stream content type if body is bytes", () => {
            const fetchFuture = ApiRequest.fetchJSON("api/method", -1, {method: "POST", body: new Uint8Array([])}, authHeaderFuture);
            fetchFuture.engage(jasmine.createSpy("fetchFailure"), jasmine.createSpy("fetchSuccess"));

            expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                method: "POST",
                headers: {Authorization: "auth jwt", "Content-Type": "application/octet-stream"},
                body: new Uint8Array([]),
            });
        });

        it("converts failed request to SDK error", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() => Promise.reject(new Error("forced error")));

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toEqual("forced error");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("converts failed request with JSON error into SDK Error", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.resolve([{message: "API response error message"}]) as Promise<any>,
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toEqual("API response error message");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("returns special failure error if request was rate limited", () => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: false,
                    status: 429,
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toBeString();
                    expect(error.code).toEqual(ErrorCodes.REQUEST_RATE_LIMITED);
                },
                () => fail("success method should not be called when 429 error was recieved")
            );
        });

        it("falls back to status text if response JSON is not in the expected format", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.resolve(null) as Promise<any>,
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toEqual("not good");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("falls back to status text if response body cannot be JSON parsed", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.reject(new Error("could not parse API response JSON")),
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toEqual("not good");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("returns empty object if request status is a 204", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() => Promise.resolve({ok: true, status: 204}));

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (e) => fail(e),
                (response: any) => {
                    expect(response).toBeUndefined();
                    done();
                }
            );
        });

        it("falls back to hardcoded message text when response is success but JSON parsing fails", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.reject(new Error("json parse failed")),
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (error) => {
                    expect(error.message).toBeString();
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success should not be invoked when JSON parsing fails")
            );
        });

        it("invokes response.json on result and maps data to result and response", (done) => {
            (window.fetch as jasmine.Spy).and.callFake(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({foo: "bar"}) as Promise<any>,
                })
            );

            ApiRequest.fetchJSON("api/method", -1, {method: "POST"}, authHeaderFuture).engage(
                (e) => fail(e),
                (response: any) => {
                    expect(response).toEqual({
                        foo: "bar",
                    });
                    done();
                }
            );
        });
    });
});

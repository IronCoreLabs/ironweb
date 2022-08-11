import Future from "futurejs";
import {ErrorCodes} from "../../Constants";
import * as TestUtils from "../../tests/TestUtils";
import * as ApiRequest from "../ApiRequest";
import ApiState from "../ApiState";
import * as WorkerMediator from "../WorkerMediator";

describe("ApiRequest", () => {
    const privateDeviceKey = new Uint8Array([23]);
    const publicDeviceKey = TestUtils.getEmptyPublicKey();
    beforeEach(() => {
        ApiState.setCurrentUser(TestUtils.getFullUser());
        ApiState.setDeviceAndSigningKeys({publicKey: publicDeviceKey, privateKey: privateDeviceKey}, TestUtils.getSigningKeyPair());
    });

    describe("getRequestSignature", () => {
        it("sends message to worker and maps response to auth header string", () => {
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {
                        userContextHeader: "context",
                        requestHeaderSignature: "sig1",
                        authHeaderSignature: "sig2",
                    },
                })
            );

            ApiRequest.getRequestSignature("/path/to/resource", "GET", "bodyparts").engage(
                (e) => fail(e.message),
                (signature) => {
                    expect(signature).toEqual({
                        userContextHeader: "context",
                        requestHeaderSignature: "sig1",
                        authHeaderSignature: "sig2",
                    });
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "SIGNATURE_GENERATION",
                        message: {
                            segmentID: 1,
                            userID: "user-10",
                            signingKeys: TestUtils.getSigningKeyPair(),
                            url: "/path/to/resource",
                            method: "GET",
                            body: "bodyparts",
                        },
                    });
                }
            );
        });
    });

    describe("fetchJson", () => {
        beforeAll(() => {
            if (typeof window.fetch === "function") {
                jest.spyOn(window, "fetch");
            } else {
                window.fetch = jasmine.createSpy("fetch");
            }
        });

        it("invokes window.fetch with expected parameters", () => {
            const fetchFuture = ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header");
            fetchFuture.engage(jasmine.createSpy("fetchFailure"), jasmine.createSpy("fetchSuccess"));

            expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                method: "POST",
                headers: {Authorization: "auth header", "Content-Type": "application/json"},
            });
        });

        it("invokes window.fetch with octet-stream content type if body is bytes", () => {
            const fetchFuture = ApiRequest.fetchJson("api/method", -1, {method: "POST", body: new Uint8Array([])}, "auth header");
            fetchFuture.engage(jasmine.createSpy("fetchFailure"), jasmine.createSpy("fetchSuccess"));

            expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                method: "POST",
                headers: {Authorization: "auth header", "Content-Type": "application/octet-stream"},
                body: new Uint8Array([]),
            });
        });

        it("converts failed request to SDK error", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() => Promise.reject(new Error("forced error")));

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toEqual("forced error");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("converts failed request with JSON error into SDK Error", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.resolve([{message: "API response error message"}]) as Promise<any>,
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toEqual("API response error message");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("returns special failure error if request was rate limited", () => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    status: 429,
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toBeString();
                    expect(error.code).toEqual(ErrorCodes.REQUEST_RATE_LIMITED);
                },
                () => fail("success method should not be called when 429 error was recieved")
            );
        });

        it("falls back to status text if response JSON is not in the expected format", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.resolve(null) as Promise<any>,
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toEqual("not good");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("falls back to status text if response body cannot be JSON parsed", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    statusText: "not good",
                    json: () => Promise.reject(new Error("could not parse API response JSON")),
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toEqual("not good");
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success method should not be called when fetch fails")
            );
        });

        it("returns empty object if request status is a 204", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() => Promise.resolve({ok: true, status: 204}));

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (e) => {
                    throw e;
                },
                (response: any) => {
                    expect(response).toBeUndefined();
                    done();
                }
            );
        });

        it("falls back to hardcoded message text when response is success but JSON parsing fails", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.reject(new Error("json parse failed")),
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (error) => {
                    expect(error.message).toBeString();
                    expect(error.code).toEqual(-1);
                    done();
                },
                () => fail("success should not be invoked when JSON parsing fails")
            );
        });

        it("invokes response.json on result and maps data to result and response", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({foo: "bar"}) as Promise<any>,
                })
            );

            ApiRequest.fetchJson("api/method", -1, {method: "POST"}, "auth header").engage(
                (e) => {
                    throw e;
                },
                (response: any) => {
                    expect(response).toEqual({
                        foo: "bar",
                    });
                    done();
                }
            );
        });
    });

    describe("makeAuthorizedApiRequest", () => {
        it("calculates custom header signaturtes and auth signature", (done) => {
            jest.spyOn(WorkerMediator, "sendMessage").mockReturnValue(
                Future.of<any>({
                    message: {
                        userContextHeader: "context",
                        requestHeaderSignature: "sig1",
                        authHeaderSignature: "sig2",
                    },
                })
            );

            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    status: 204,
                    json: () => Promise.resolve({foo: "bar"}) as Promise<any>,
                })
            );

            ApiRequest.makeAuthorizedApiRequest("api/method", -1, {headers: {foo: "bar"}, method: "POST"}).engage(
                (e) => {
                    throw e;
                },
                () => {
                    expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                        method: "POST",
                        headers: {
                            foo: "bar",
                            "Content-Type": "application/json",
                            Authorization: "IronCore 2.sig2",
                            "X-IronCore-User-Context": "context",
                            "X-IronCore-Request-Sig": "sig1",
                        },
                    });
                    done();
                }
            );
        });
    });

    describe("makeJwtApiRequest", () => {
        it("formats provided JWT to expected auth header", (done) => {
            (window.fetch as jasmine.Spy).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    status: 204,
                    json: () => Promise.resolve({foo: "bar"}) as Promise<any>,
                })
            );

            ApiRequest.makeJwtApiRequest("api/method", -1, {method: "GET"}, "jwt").engage(
                (e) => {
                    throw e;
                },
                () => {
                    expect(window.fetch).toHaveBeenCalledWith("/api/1/api/method", {
                        method: "GET",
                        headers: {Authorization: "jwt jwt", "Content-Type": "application/json"},
                    });
                    done();
                }
            );
        });
    });
});

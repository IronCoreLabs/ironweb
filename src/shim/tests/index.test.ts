import * as PublicSdk from "../index";
import * as Init from "../Initialize";
import {ErrorCodes} from "../../Constants";

describe("Init exposed public SDK", () => {
    describe("initialize", () => {
        it("errors if jwt callback is of the wrong type", () => {
            expect(() => (PublicSdk as any).initialize() as any).toThrow();
            expect(() => (PublicSdk as any).initialize(1) as any).toThrow();
            expect(() => (PublicSdk as any).initialize([]) as any).toThrow();
            expect(() => (PublicSdk as any).initialize({}) as any).toThrow();
        });

        it("errors if passcode callback is of the wrong type", () => {
            const jwtCB = () => null;

            expect(() => (PublicSdk as any).initialize(jwtCB) as any).toThrow();
            expect(() => (PublicSdk as any).initialize(jwtCB, 1) as any).toThrow();
            expect(() => (PublicSdk as any).initialize(jwtCB, []) as any).toThrow();
            expect(() => (PublicSdk as any).initialize(jwtCB, {}) as any).toThrow();
        });

        it("calls init api with argument", () => {
            spyOn(Init, "initialize");

            const fetchJWT = () => Promise.resolve("test");
            const passcode = () => Promise.resolve("pass");

            PublicSdk.initialize(fetchJWT, passcode);

            expect(Init.initialize).toHaveBeenCalledWith(fetchJWT, passcode);
        });

        it("should return error code if random number generation is not available in client browser", (done) => {
            const origRandomValues = window.crypto.getRandomValues;
            (window.crypto as any).getRandomValues = null;

            spyOn(Init, "initialize");

            const fetchJWT = () => Promise.resolve("test");
            const passcode = () => Promise.resolve("pass");

            PublicSdk.initialize(fetchJWT, passcode)
                .then(() => {
                    fail("Initialization should not occur if the client browser does not support random number generation.");
                })
                .catch((e) => {
                    expect(e.code).toEqual(ErrorCodes.RANDOM_NUMBER_GENERATION_FAILURE);
                    window.crypto.getRandomValues = origRandomValues;
                    done();
                });
        });
    });

    describe("ErrorCodes", () => {
        it("exposes error codes", () => {
            expect(PublicSdk.ErrorCodes).toBeObject();
        });
    });

    describe("SDKError", () => {
        it("exposes SDK Error", () => {
            const error = new PublicSdk.SDKError(new Error("message"), 1);

            expect(error.message).toEqual("message");
            expect(error.code).toEqual(1);
        });
    });
});

import * as CryptoUtils from "../CryptoUtils";

describe("CryptoUtils", () => {
    describe("getCryptoSubtleApi", () => {
        it("returns subtle crypto object or undefined", () => {
            expect(typeof CryptoUtils.getCryptoSubtleApi()).toBe("object");
        });
    });

    describe("generateRandomBytes", () => {
        it("returns random bytes without calling back to main window", (done) => {
            jest.spyOn(window, "postMessage");

            CryptoUtils.generateRandomBytes(12).engage(
                (e) => {
                    throw e;
                },
                (bytes) => {
                    expect(bytes instanceof Uint8Array).toBe(true);
                    expect(bytes.length).toEqual(12);
                    expect(window.postMessage).not.toHaveBeenCalled();
                    done();
                }
            );
        });
    });
});

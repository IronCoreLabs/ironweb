import * as CryptoUtils from "../CryptoUtils";

describe("CryptoUtils", () => {
    describe("getCryptoSubtleApi", () => {
        it("returns subtle crypto object or undefined", () => {
            expect(CryptoUtils.getCryptoSubtleApi()).toBeObject();
        });
    });

    describe("generateRandomBytes", () => {
        it("returns random bytes without calling back to main window", (done) => {
            spyOn(window, "postMessage");

            CryptoUtils.generateRandomBytes(12).engage(
                (e) => fail(e),
                (bytes) => {
                    expect(bytes instanceof Uint8Array).toBeTrue();
                    expect(bytes.length).toEqual(12);
                    expect(window.postMessage).not.toHaveBeenCalled();
                    done();
                }
            );
        });
    });
});

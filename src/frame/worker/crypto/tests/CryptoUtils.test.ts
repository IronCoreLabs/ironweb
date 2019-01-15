import * as CryptoUtils from "../CryptoUtils";

describe("CryptoUtils", () => {
    describe("getCryptoSubtleApi", () => {
        it("returns subtle crypto object or undefined", () => {
            expect(CryptoUtils.getCryptoSubtleApi() instanceof SubtleCrypto).toBeTrue();
        });
    });

    describe("isNativeCryptoSupported", () => {
        it("returns boolean indicating crypto subtle support", () => {
            expect(CryptoUtils.isNativeCryptoSupported()).toBeTrue();
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

        it("calls into parent window when we cannot generate random bytes in worker", (done) => {
            const origRandomValues = window.crypto.getRandomValues;
            (window.crypto as any).getRandomValues = null;

            spyOn(window, "postMessage");

            CryptoUtils.generateRandomBytes(12);
            expect(window.postMessage).toHaveBeenCalledWith({
                replyID: 0,
                data: {
                    type: "RANDOM_BYTES_REQUEST",
                    message: {
                        size: 12,
                    },
                },
            });
            window.crypto.getRandomValues = origRandomValues;
            done();
        });
    });
});

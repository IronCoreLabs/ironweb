import Future from "futurejs";
import * as polyfill from "../polyfill";
import * as Constants from "../../../../../Constants";
import * as CryptoUtils from "../../CryptoUtils";

describe("PBKDF2 polyfill", () => {
    beforeAll(() => {
        spyOn(Constants.CryptoConstants, "PBKDF2_ITERATIONS").and.returnValue(500);
    });

    describe("generatePasswordDerivedKey", () => {
        it("should generate the expected derived key when no salt provided", () => {
            spyOn(CryptoUtils, "generateRandomBytes").and.returnValue(Future.of(new Uint8Array(32)));

            polyfill.generatePasswordDerivedKey("password").engage(
                (e) => fail(e),
                (derivedKey) => {
                    expect(derivedKey.key).toEqual(
                        //prettier-ignore
                        new Uint8Array([247, 116, 135, 59, 206, 61, 138, 137, 77, 207, 159, 207, 29, 133, 206, 15, 208, 76, 245, 83, 222, 84, 6, 157, 189, 223, 166, 231, 9, 182, 209, 173])
                    );
                    expect(derivedKey.salt).toEqual(new Uint8Array(32));
                }
            );
        });

        it("should generate the expected derived key when fixed salt is provided", () => {
            //prettier-ignore
            const salt = new Uint8Array([247, 116, 135, 59, 206, 61, 138, 137, 77, 207, 159, 207, 29, 133, 206, 15, 208, 76, 245, 83, 222, 84, 6, 157, 189, 223, 166, 231, 9, 182, 209, 173]);

            polyfill.generatePasswordDerivedKey("password", salt).engage(
                (e) => fail(e),
                (derivedKey) => {
                    expect(derivedKey.key).toEqual(
                        //prettier-ignore
                        new Uint8Array([171, 5, 207, 154, 57, 210, 247, 44, 198, 12, 250, 145, 125, 44, 29, 117, 182, 63, 137, 94, 189, 83, 40, 0, 102, 173, 78, 115, 28, 9, 176, 170])
                    );
                    expect(derivedKey.salt).toEqual(salt);
                }
            );
        });
    });
});

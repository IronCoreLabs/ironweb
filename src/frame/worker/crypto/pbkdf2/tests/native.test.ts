import * as native from "../native";
import * as Constants from "../../../../../Constants";

describe("PBKDF2 native", () => {
    beforeAll(() => {
        spyOn(Constants.CryptoConstants, "PBKDF2_ITERATIONS").and.returnValue(500);
    });

    describe("generatePasswordDerivedKey", () => {
        it("should generate the expected derived key when fixed salt is provided", () => {
            //prettier-ignore
            const salt = new Uint8Array([247, 116, 135, 59, 206, 61, 138, 137, 77, 207, 159, 207, 29, 133, 206, 15, 208, 76, 245, 83, 222, 84, 6, 157, 189, 223, 166, 231, 9, 182, 209, 173]);

            native.generatePasscodeDerivedKey(new Uint8Array([112, 97, 115, 115, 119, 111, 114, 100]), salt).engage(
                (e) => fail(e),
                (derivedKey) => {
                    expect(derivedKey).toEqual(jasmine.any(CryptoKey));
                    expect(derivedKey.type).toEqual("secret");
                    expect(derivedKey.algorithm).toEqual({name: "AES-GCM", length: 256} as any);
                }
            );
        });
    });
});

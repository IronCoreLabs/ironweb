import ApiState from "../ApiState";
import * as TestUtils from "../../tests/TestUtils";

describe("ApiState", () => {
    describe("setCurrentUser", () => {
        it("sets fields and decodes base64 strings", () => {
            const user = TestUtils.getFullUser();

            ApiState.setCurrentUser(user);

            expect(ApiState.user()).toEqual(user);

            expect(ApiState.encryptedUserKey()).toEqual(expect.any(Uint8Array));
            expect(ApiState.userPublicKey()).toEqual(TestUtils.userPublicBytes);
        });
    });

    describe("clearCurrentUser", () => {
        it("removes values from all stored fields", () => {
            const user = TestUtils.getFullUser();
            ApiState.setCurrentUser(user);
            expect(ApiState.user()).toEqual(user);

            ApiState.clearCurrentUser();

            expect(ApiState.user()).toBeUndefined();
            expect(ApiState.encryptedUserKey()).toBeUndefined();
            expect(ApiState.userPublicKey()).toBeUndefined();
            expect(ApiState.deviceKeys()).toEqual({
                publicKey: undefined,
                privateKey: undefined,
            } as any);
            expect(ApiState.signingKeys()).toEqual({
                publicKey: undefined,
                privateKey: undefined,
            } as any);
        });
    });

    describe("setDeviceAndSigningKeys", () => {
        it("sets signing and device keys", () => {
            const signingKeys = {
                publicKey: new Uint8Array(15),
                privateKey: new Uint8Array(25),
            };
            const deviceKeys = {
                publicKey: {
                    x: new Uint8Array(30),
                    y: new Uint8Array(35),
                },
                privateKey: new Uint8Array(40),
            };

            ApiState.setDeviceAndSigningKeys(deviceKeys, signingKeys);

            expect(ApiState.deviceKeys()).toEqual(deviceKeys);
            expect(ApiState.signingKeys()).toEqual(signingKeys);
        });
    });

    describe("encryptedUserKey", () => {
        it("returns byte array of encrypted key", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());

            expect(ApiState.encryptedUserKey()).toEqual(expect.any(Uint8Array));
        });
    });
});

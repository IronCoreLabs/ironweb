import * as Utils from "../Utils";
import * as TestUtils from "../../tests/TestUtils";

describe("Utils", () => {
    describe("utf8StringToArrayBuffer", () => {
        it("converts string to bytes", () => {
            const ab = new Uint8Array([72, 88, 77, 54, 69]);
            expect(Utils.utf8StringToArrayBuffer("HXM6E")).toEqual(ab);

            expect(Utils.utf8StringToArrayBuffer("")).toEqual(new Uint8Array([]));
        });

        it("works with emoji", () => {
            expect(Utils.utf8StringToArrayBuffer("🍆")).toEqual(new Uint8Array([240, 159, 141, 134]));
        });
    });

    describe("arrayBufferToUtf8String", () => {
        it("converts bytes into UTF8 characters", () => {
            const ab = new Uint8Array([72, 88, 77, 54, 69]);
            expect(Utils.arrayBufferToUtf8String(ab)).toEqual("HXM6E");

            expect(Utils.arrayBufferToUtf8String(new Uint8Array([]))).toEqual("");
        });

        it("works with emoji", () => {
            const ab = new Uint8Array([240, 159, 153, 133]);
            expect(Utils.arrayBufferToUtf8String(ab)).toEqual("🙅");
        });
    });

    describe("publicKeyToBase64", () => {
        it("converts bytes of public key into strings", () => {
            expect(
                Utils.publicKeyToBase64({
                    x: new Uint8Array([82, 20, 39]),
                    y: new Uint8Array([32]),
                })
            ).toEqual({
                x: "UhQn",
                y: "IA==",
            });
        });
    });

    describe("publicKeyToBytes", () => {
        it("converts base64 strings of public key into bytes", () => {
            expect(
                Utils.publicKeyToBytes({
                    x: "UhQn",
                    y: "IA==",
                })
            ).toEqual({
                x: new Uint8Array([82, 20, 39]),
                y: new Uint8Array([32]),
            });
        });
    });

    describe("transformKeyToBase64", () => {
        it("converts byte arrays to strings", () => {
            const transformKey = TestUtils.getTransformKey();

            expect(Utils.transformKeyToBase64(transformKey) as any).toEqual({
                ephemeralPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                toPublicKey: {x: jasmine.any(String), y: jasmine.any(String)},
                encryptedTempKey: jasmine.any(String),
                hashedTempKey: jasmine.any(String),
                publicSigningKey: jasmine.any(String),
                signature: jasmine.any(String),
            });
        });
    });

    describe("concatArrayBuffers", () => {
        it("appends arrays together in sequence", () => {
            const ab1 = new Uint8Array([1, 2]);
            const ab2 = new Uint8Array([3, 4]);
            const ab3 = new Uint8Array([5, 6]);

            expect(Utils.concatArrayBuffers(ab1, ab2, ab3)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
        });

        it("handles empty buffers", () => {
            const ab1 = new Uint8Array([]);
            const ab2 = new Uint8Array([93, 97]);
            expect(Utils.concatArrayBuffers(ab1, ab2)).toEqual(new Uint8Array([93, 97]));
        });
    });

    describe("sliceArrayBuffer", () => {
        it("slices expected amount of array buffer", () => {
            const ab = new Uint8Array([1, 2, 3, 4, 5, 6]);

            const slicedAB = Utils.sliceArrayBuffer(ab, 4);
            expect(slicedAB.length).toEqual(2);
            expect(slicedAB).toEqual(new Uint8Array([5, 6]));
        });

        it("supports an end parameter", () => {
            const ab = new Uint8Array([1, 2, 3, 4, 5, 6]);

            const slicedAB = Utils.sliceArrayBuffer(ab, 2, 4);
            expect(slicedAB.length).toEqual(2);
            expect(slicedAB).toEqual(new Uint8Array([3, 4]));
        });
    });
});

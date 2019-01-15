import * as Codec from "../CodecSDK";

describe("CodecSDK", () => {
    describe("utf8", () => {
        describe("fromBytes", () => {
            it("converts bytes back to utf8", () => {
                expect(Codec.utf8.fromBytes(new Uint8Array([99, 100, 113, 103, 93]))).toEqual("cdqg]");
            });

            it("throws if the sequence isnt valid UTF8", () => {
                expect(() => Codec.utf8.fromBytes(new Uint8Array([33, 23, 140, 103, 93]))).toThrow();
            });
        });

        describe("toBytes", () => {
            it("converts UTF8 string into bytes", () => {
                expect(Codec.utf8.toBytes("test string")).toEqual(new Uint8Array([116, 101, 115, 116, 32, 115, 116, 114, 105, 110, 103]));
                expect(Codec.utf8.toBytes("🍆")).toEqual(new Uint8Array([240, 159, 141, 134]));
                expect(Codec.utf8.toBytes("\u2661")).toEqual(new Uint8Array([226, 153, 161]));
            });

            it("throws if given an invalid UTF8 sequence", () => {
                expect(() => Codec.utf8.toBytes("\uD800")).toThrow();
            });
        });
    });

    describe("base64", () => {
        describe("fromBytes", () => {
            it("converts bytes back to base64", () => {
                expect(Codec.base64.fromBytes(new Uint8Array([99, 100, 113, 103, 93]))).toEqual("Y2RxZ10=");
                expect(Codec.base64.fromBytes(new Uint8Array([99, 100, 113, 103, 93, 10]))).toEqual("Y2RxZ10K");
            });
        });

        describe("toBytes", () => {
            it("converts base64 strings to bytes", () => {
                expect(Codec.base64.toBytes("Y2RxZ10K")).toEqual(new Uint8Array([99, 100, 113, 103, 93, 10]));
                expect(Codec.base64.toBytes("8J+Nhg==")).toEqual(new Uint8Array([240, 159, 141, 134]));
            });

            it("throws exception if given non base64 string", () => {
                expect(() => Codec.base64.toBytes("abc{}[]")).toThrow();
            });
        });
    });
});

import * as ShimUtils from "../ShimUtils";

describe("ShimUtils", () => {
    describe("SDK init logic", () => {
        it("should return expected value", () => {
            ShimUtils.clearSDKInitialized();
            expect(() => ShimUtils.checkSDKInitialized()).toThrow();
            ShimUtils.setSDKInitialized();
            expect(() => ShimUtils.checkSDKInitialized()).not.toThrow();
            ShimUtils.clearSDKInitialized();
            expect(() => ShimUtils.checkSDKInitialized()).toThrow();
        });
    });

    describe("storeParentWindowSymmetricKey", () => {
        afterEach(() => {
            ShimUtils.clearParentWindowSymmetricKey();
        });

        it("does not set any local storage key if not key provided", () => {
            jest.spyOn(Storage.prototype, "setItem");
            ShimUtils.storeParentWindowSymmetricKey();
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });

        it("sets value with expected key", () => {
            jest.spyOn(Storage.prototype, "setItem");
            ShimUtils.storeParentWindowSymmetricKey("symKey");
            expect(localStorage.setItem).toHaveBeenCalledWith("1-icldassk", "symKey");
        });
    });

    describe("getParentWindowSymmetricKey", () => {
        afterEach(() => {
            ShimUtils.clearParentWindowSymmetricKey();
        });

        it("returns undefined if it cannot find key", () => {
            expect(ShimUtils.getParentWindowSymmetricKey()).toBeUndefined();
        });

        it("returns undefined if local storage throws exception", () => {
            jest.spyOn(Storage.prototype, "getItem").and.throwError("No access");
            expect(ShimUtils.getParentWindowSymmetricKey()).toBeUndefined();
        });

        it("returns value of local storage item", () => {
            localStorage.setItem("1-icldassk", "symKey");
            expect(ShimUtils.getParentWindowSymmetricKey()).toEqual("symKey");
        });
    });

    describe("clearParentWindowSymmetricKey", () => {
        it("clears out values in local storage", () => {
            localStorage.setItem("v1-icldassk", "symKey");
            ShimUtils.clearParentWindowSymmetricKey();
            expect(localStorage.getItem("1-icldassk")).toBeNull();
        });
    });

    describe("dedupeArray", () => {
        it("does nothing with arrays without duplicates", () => {
            expect(ShimUtils.dedupeArray(["a"])).toEqual(["a"]);
            expect(ShimUtils.dedupeArray(["a", "b"])).toEqual(["a", "b"]);
            expect(ShimUtils.dedupeArray(["a", "A"])).toEqual(["a", "A"]);
            expect(ShimUtils.dedupeArray(["A", "a"])).toEqual(["A", "a"]);
            expect(ShimUtils.dedupeArray(["A", ""])).toEqual(["A", ""]);
        });

        it("removes duplicates correctly", () => {
            expect(ShimUtils.dedupeArray(["A", "A"])).toEqual(["A"]);
            expect(ShimUtils.dedupeArray(["A", "A", "A", "A", "A", "A"])).toEqual(["A"]);
            expect(ShimUtils.dedupeArray(["A", "B", "C", "C", "B", "A"])).toEqual(["A", "B", "C"]);
            expect(ShimUtils.dedupeArray(["", "", ""])).toEqual([""]);
        });

        it("clears out empty values when asked to", () => {
            expect(ShimUtils.dedupeArray([""], true)).toEqual([]);
            expect(ShimUtils.dedupeArray(["", "", "", ""], true)).toEqual([]);
        });
    });

    describe("validateOwnership", () => {
        it("fails if an owner is not provided and addAsAdmin is false", () => {
            expect(() => ShimUtils.validateOwnership(false)).toThrow();
        });
    });

    describe("validateID", () => {
        it("fails when ID is not a string with length", () => {
            expect(() => ShimUtils.validateID(3 as any)).toThrow();
            expect(() => ShimUtils.validateID(null as any)).toThrow();
            expect(() => ShimUtils.validateID([] as any)).toThrow();
            expect(() => ShimUtils.validateID(["id-12"] as any)).toThrow();
            expect(() => ShimUtils.validateID("")).toThrow();
        });

        it("fails when the ID contains invalid characters", () => {
            expect(() => ShimUtils.validateID("id1,id2")).toThrow();
            expect(() => ShimUtils.validateID("^id1id2")).toThrow();
            expect(() => ShimUtils.validateID("<id1id2>")).toThrow();
            expect(() => ShimUtils.validateID("[id]")).toThrow();
            expect(() => ShimUtils.validateID("{id}")).toThrow();
            expect(() => ShimUtils.validateID("id 38")).toThrow();
        });

        it("fails when ID is too long", () => {
            const ID = "abcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcdef";
            expect(() => ShimUtils.validateID(ID)).toThrow();
        });

        it("does not throw when ID looks valid", () => {
            expect(() => ShimUtils.validateID("12")).not.toThrow();
        });
    });

    describe("validateDocumentData", () => {
        it("fails when data is not a string or byte array", () => {
            expect(() => ShimUtils.validateDocumentData([] as any)).toThrow();
            expect(() => ShimUtils.validateDocumentData({} as any)).toThrow();
            expect(() => ShimUtils.validateDocumentData(10 as any)).toThrow();
            expect(() => ShimUtils.validateDocumentData("content" as any)).toThrow();
            expect(() => ShimUtils.validateDocumentData(new Uint16Array([2]) as any)).toThrow();
            expect(() => ShimUtils.validateDocumentData(new Uint8Array([]))).toThrow();
        });

        it("does not throw when data looks valid", () => {
            expect(() => ShimUtils.validateDocumentData(new Uint8Array([35, 23, 32, 53]))).not.toThrow();
        });
    });

    describe("validateEncryptedDocument", () => {
        it("fails when argument looks invalid", () => {
            expect(() => ShimUtils.validateEncryptedDocument({} as any)).toThrow();
            expect(() => ShimUtils.validateEncryptedDocument({foo: "bar"} as any)).toThrow();
            expect(() => ShimUtils.validateEncryptedDocument(new Uint16Array(10) as any)).toThrow();
            expect(() => ShimUtils.validateEncryptedDocument([] as any)).toThrow();
        });

        it("fails when data is not of proper length", () => {
            expect(() => ShimUtils.validateEncryptedDocument(new Uint8Array([]))).toThrow();
            expect(() => ShimUtils.validateEncryptedDocument(new Uint8Array([80, 102]))).toThrow();
            expect(() => ShimUtils.validateEncryptedDocument(new Uint8Array([55, 11, 78, 102, 11, 1, 2, 3, 100, 98, 33]))).toThrow();
        });

        it("does not throw when data looks valid", () => {
            expect(() => ShimUtils.validateEncryptedDocument(new Uint8Array([55, 11, 78, 102, 11, 1, 2, 3, 100, 98, 33, 290, 118]))).not.toThrow();
            expect(() =>
                ShimUtils.validateEncryptedDocument(new Uint8Array([55, 11, 78, 102, 11, 1, 2, 3, 100, 98, 33, 290, 118, 0, 89, 123, 324]))
            ).not.toThrow();
        });
    });

    describe("validateAccessList", () => {
        it("fails when no user or group list", () => {
            expect(() => ShimUtils.validateAccessList({} as any)).toThrow();
            expect(() => ShimUtils.validateAccessList({users: 3} as any)).toThrow();
            expect(() => ShimUtils.validateAccessList({users: null} as any)).toThrow();
            expect(() => ShimUtils.validateAccessList({users: []} as any)).toThrow();

            expect(() => ShimUtils.validateAccessList({groups: 3} as any)).toThrow();
            expect(() => ShimUtils.validateAccessList({groups: null} as any)).toThrow();
            expect(() => ShimUtils.validateAccessList({groups: []} as any)).toThrow();
        });

        it("does not throw when user list provided", () => {
            expect(() => ShimUtils.validateAccessList({users: [{id: "35"}, {id: "33"}]})).not.toThrow();
        });

        it("does not throw when group list provided", () => {
            expect(() => ShimUtils.validateAccessList({groups: [{id: "35"}, {id: "33"}]})).not.toThrow();
            expect(() => ShimUtils.validateAccessList({groups: [{id: "35"}, {id: "33"}], users: [{id: "11"}, {id: "80"}]})).not.toThrow();
        });
    });

    describe("validateIDList", () => {
        it("fails when data is not an array or has no length", () => {
            expect(() => ShimUtils.validateIDList({} as any)).toThrow();
            expect(() => ShimUtils.validateIDList("35" as any)).toThrow();
            expect(() => ShimUtils.validateIDList(3 as any)).toThrow();
            expect(() => ShimUtils.validateIDList([] as any)).toThrow();
        });

        it("does not throw when data looks valid", () => {
            expect(() => ShimUtils.validateIDList(["12"])).not.toThrow();
            expect(() => ShimUtils.validateIDList(["12", "35", "11"])).not.toThrow();
        });
    });

    describe("dedupeAccessLists", () => {
        it("dedupes values in both user and group arrays", () => {
            const accessList = {
                users: [{id: "5"}, {id: "8"}, {id: "5"}, {id: "13"}],
                groups: [{id: "35"}, {id: "11"}, {id: "11"}, {id: "35"}, {id: "83"}],
            };

            expect(ShimUtils.dedupeAccessLists(accessList)).toEqual([["5", "8", "13"], ["35", "11", "83"]]);
        });

        it("returns empty arrays for users if not provided", () => {
            const accessList = {
                groups: [{id: "35"}, {id: "11"}, {id: "11"}, {id: "35"}, {id: "83"}],
            };

            expect(ShimUtils.dedupeAccessLists(accessList)).toEqual([[], ["35", "11", "83"]]);
        });

        it("returns empty arrays for groups if not provided", () => {
            const accessList = {
                users: [{id: "5"}, {id: "8"}, {id: "5"}, {id: "13"}],
                groups: [],
            };

            expect(ShimUtils.dedupeAccessLists(accessList)).toEqual([["5", "8", "13"], []]);
        });
    });
});

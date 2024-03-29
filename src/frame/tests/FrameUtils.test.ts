import * as FrameUtils from "../FrameUtils";

describe("FrameUtils", () => {
    describe("storeDeviceAndSigningKeys", () => {
        const oldHas = document.hasStorageAccess;
        const oldRequest = document.requestStorageAccess;
        beforeAll(() => {
            // our virtual dom doesn't have these new storage APIs. Implement them like a browser that supports
            // them but doesn't have any strict settings on, so they can be spied/mocked in places that
            // care.
            document.hasStorageAccess = async () => true;
            document.requestStorageAccess = async () => undefined;
        });
        afterEach(() => {
            FrameUtils.clearDeviceAndSigningKeys("30", 3);
        });
        afterAll(() => {
            document.hasStorageAccess = oldHas;
            document.requestStorageAccess = oldRequest;
        });

        it("sets keys in local storage under proper key", async () => {
            const deviceKey = new Uint8Array(5);
            const signingKey = new Uint8Array(6);
            const nonce = new Uint8Array([88, 93, 91]);
            await FrameUtils.storeDeviceAndSigningKeys("30", 3, deviceKey, signingKey, nonce);
            const keys = localStorage.getItem("1-3:30-icldaspkn");
            expect(keys).toEqual(expect.stringContaining(""));
            const decodeKeys = JSON.parse(keys as string);
            expect(typeof decodeKeys).toBe("object");
            expect(decodeKeys.deviceKey).toEqual("AAAAAAA=");
            expect(decodeKeys.signingKey).toEqual("AAAAAAAA");
            expect(decodeKeys.nonce).toEqual("WF1b");
        });

        it("requests access if it doesn't have it. When granted, stores.", async () => {
            // trying to replicate a browser that has privacy settings disabling third-party access to localStorage.
            // https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
            jest.spyOn(window.localStorage.__proto__, "setItem").mockImplementationOnce(() => {
                throw new Error("Access policy partitions third party storage.");
            });
            // pretend the user allowed access when prompted
            jest.spyOn(document, "requestStorageAccess").mockResolvedValue();

            const deviceKey = new Uint8Array(5);
            const signingKey = new Uint8Array(6);
            const nonce = new Uint8Array([88, 93, 91]);
            await FrameUtils.storeDeviceAndSigningKeys("30", 3, deviceKey, signingKey, nonce);

            const keys = localStorage.getItem("1-3:30-icldaspkn");
            expect(keys).toEqual(expect.stringContaining(""));
            const decodeKeys = JSON.parse(keys as string);
            expect(typeof decodeKeys).toBe("object");
            expect(decodeKeys.deviceKey).toEqual("AAAAAAA=");
            expect(decodeKeys.signingKey).toEqual("AAAAAAAA");
            expect(decodeKeys.nonce).toEqual("WF1b");
        });

        it("requests access if it doesn't have it. When not granted, does nothing.", async () => {
            // trying to replicate a browser that has privacy settings disabling third-party access to localStorage.
            // https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
            jest.spyOn(window.localStorage.__proto__, "setItem").mockImplementationOnce(() => {
                throw new Error("Access policy partitions third party storage.");
            });
            // pretend the user disallowed access when prompted
            jest.spyOn(document, "requestStorageAccess").mockRejectedValue(new Error("Access denied."));

            const deviceKey = new Uint8Array(5);
            const signingKey = new Uint8Array(6);
            const nonce = new Uint8Array([88, 93, 91]);
            await FrameUtils.storeDeviceAndSigningKeys("30", 3, deviceKey, signingKey, nonce);

            const keys = localStorage.getItem("1-3:30-icldaspkn");
            expect(keys).toEqual(null);
        });

        it("if we fail to store and the browser doesn't have `requestStorageAccess`, give up", async () => {
            // trying to replicate a browser that has privacy settings disabling third-party access to localStorage.
            // https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem#exceptions
            jest.spyOn(window.localStorage.__proto__, "setItem").mockImplementationOnce(() => {
                throw new Error("Access policy partitions third party storage.");
            });

            const deviceKey = new Uint8Array(5);
            const signingKey = new Uint8Array(6);
            const nonce = new Uint8Array([88, 93, 91]);

            // unset requestStorageAccess, like a browser that doesn't know about it.
            const oldRequest = document.requestStorageAccess;
            delete (document as any).requestStorageAccess;
            await FrameUtils.storeDeviceAndSigningKeys("30", 3, deviceKey, signingKey, nonce);
            document.requestStorageAccess = oldRequest;

            const keys = localStorage.getItem("1-3:30-icldaspkn");
            expect(keys).toEqual(null);
        });
    });

    describe("getDeviceAndSigningKeys", () => {
        afterEach(() => {
            FrameUtils.clearDeviceAndSigningKeys("30", 3);
        });

        it("fails when no value is set in local storage", () => {
            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when keys cannot be parsed", () => {
            localStorage.setItem(`3:30-icldaspkn`, "{[nalka}[[];a");

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when parsed keys is not an object", () => {
            localStorage.setItem(`3:30-icldaspkn`, '"foo"');

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when it cant find a signing key", () => {
            localStorage.setItem(`3:30-icldaspkn`, JSON.stringify({deviceKey: "foo"}));

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when it cant find a device key", () => {
            localStorage.setItem(`3:30-icldaspkn`, JSON.stringify({signingKey: "foo"}));

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when deviceKey has no length", () => {
            localStorage.setItem(
                `3:30-icldaspkn`,
                JSON.stringify({
                    signingKey: "foo",
                    deviceKey: "",
                })
            );

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("fails when signingKey has no length", () => {
            localStorage.setItem(
                `3:30-icldaspkn`,
                JSON.stringify({
                    signingKey: "",
                    deviceKey: "foo",
                })
            );

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => expect(e.message).toEqual(expect.stringContaining("")),
                () => {
                    throw new Error("Should fail when no keys are in local storage");
                }
            );
        });

        it("responds with keys found in local storage when valid", async () => {
            const deviceKey = new Uint8Array(5);
            const signingKey = new Uint8Array(6);
            const nonce = new Uint8Array([88, 93, 91]);
            await FrameUtils.storeDeviceAndSigningKeys("30", 3, deviceKey, signingKey, nonce);

            FrameUtils.getDeviceAndSigningKeys("30", 3).engage(
                (e) => {
                    throw e;
                },
                (localKeys) => {
                    expect(localKeys.encryptedDeviceKey).toEqual(deviceKey);
                    expect(localKeys.encryptedSigningKey).toEqual(signingKey);
                    expect(localKeys.nonce).toEqual(nonce);
                }
            );
        });
    });

    describe("clearDeviceAndSigningKeys", () => {
        it("removes all keys set", () => {
            localStorage.setItem(`3:30-icldaspkn`, "foo");
            FrameUtils.clearDeviceAndSigningKeys("30", 3);
            expect(localStorage.getItem("iclKeys")).toBeNull();
        });
    });

    describe("documentToByteParts", () => {
        it("converts string document parts to byte parts", () => {
            const doc = "AgAdeyJfZGlkXyI6ImRvY0lEIiwiX3NpZF8iOjMyMX0eKDI8RlBaZG54goxcZw==";
            expect(FrameUtils.documentToByteParts(doc)).toEqual({
                iv: new Uint8Array([30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]),
                content: new Uint8Array([92, 103]),
            });
        });

        it("converts bytes into byte parts", () => {
            // prettier-ignore
            const doc = new Uint8Array([2, 0, 30, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 109, 121, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 51, 50, 125, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 92, 103]);

            expect(FrameUtils.documentToByteParts(doc)).toEqual({
                iv: new Uint8Array([30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]),
                content: new Uint8Array([92, 103]),
            });
        });

        it("converts bytes into byte parts with offset", () => {
            // prettier-ignore
            const bytes = new Uint8Array([0, 0, 0 ,0, 2, 0, 30, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 109, 121, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 51, 50, 125, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 92, 103, 0, 0, 0, 0]);
            //Create an array that has 4 bytes out of view in the front and 4 out of view at the end.
            const doc = new Uint8Array(bytes.buffer, 4, bytes.byteLength - 8);
            expect(FrameUtils.documentToByteParts(doc)).toEqual({
                iv: new Uint8Array([30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]),
                content: new Uint8Array([92, 103]),
            });
        });
    });

    describe("combineDocumentParts", () => {
        it("converts documents byte parts to single Uint8Array", () => {
            const doc = {
                iv: new Uint8Array([30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]),
                content: new Uint8Array([92, 103]),
            };

            const docParts = FrameUtils.combineDocumentParts("mydocID", 32, doc);
            // prettier-ignore
            expect(docParts).toEqual(new Uint8Array([2, 0, 30, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 109, 121, 100, 111, 99, 73, 68, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 51, 50, 125, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 92, 103]));
        });
    });

    describe("encryptedDocumentToBase64", () => {
        it("converts documents byte parts to single base64 string", () => {
            const doc = {
                iv: new Uint8Array([30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140]),
                content: new Uint8Array([92, 103]),
            };

            expect(FrameUtils.encryptedDocumentToBase64("docID", 321, doc)).toEqual("AgAdeyJfZGlkXyI6ImRvY0lEIiwiX3NpZF8iOjMyMX0eKDI8RlBaZG54goxcZw==");
        });
    });

    describe("generateDocumentHeaderBytes", () => {
        it("generates expected header bytes", () => {
            const headerBytes = FrameUtils.generateDocumentHeaderBytes("docIDValue", 31);
            // prettier-ignore
            expect(headerBytes).toEqual(new Uint8Array([2, 0, 33, 123, 34, 95, 100, 105, 100, 95, 34, 58, 34, 100, 111, 99, 73, 68, 86, 97, 108, 117, 101, 34, 44, 34, 95, 115, 105, 100, 95, 34, 58, 51, 49, 125]));
        });
    });

    describe("encodeBytesAsHex", () => {
        it("returns the expected hex string", () => {
            expect(FrameUtils.encodeBytesAsHex(new Uint8Array([92, 97, 93, 91, 102, 199, 37]))).toEqual("5c615d5b66c725");
            expect(FrameUtils.encodeBytesAsHex(new Uint8Array([]))).toEqual("");
        });
    });
});

import * as UTF8 from "@stablelib/utf8";
import * as Base64 from "base64-js";
import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import {concatArrayBuffers} from "../../../lib/Utils";
import * as FrameMediator from "../../FrameMediator";
import * as ShimUtils from "../../ShimUtils";
import * as DocumentSDK from "../DocumentSDK";

describe("DocumentSDK", () => {
    beforeEach(() => {
        jest.spyOn(FrameMediator, "sendMessage").mockReturnValue(Future.of<any>({message: "messageResponse"}));
    });

    afterEach(() => {
        ShimUtils.clearSDKInitialized();
    });

    describe("list", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.list()).toThrow();
        });

        it("returns Promise invoking document list", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.list()
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({type: "DOCUMENT_LIST"});
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("getMetadata", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.getMetadata("docID")).toThrow();
        });

        it("throws error if document ID is invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.getMetadata(null as any)).toThrow();
            expect(() => DocumentSDK.getMetadata("")).toThrow();
            expect(() => DocumentSDK.getMetadata("ID2,ID2")).toThrow();
            expect(() => DocumentSDK.getMetadata("ID2 ID2")).toThrow();
        });

        it("returns Promise invoking document metadata get", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.getMetadata("docID")
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({type: "DOCUMENT_META_GET", message: {documentID: "docID"}});
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("getDocumentIDFromBytes", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.getDocumentIDFromBytes(Base64.toByteArray("mydoc"))).toThrow();
        });

        it("fails when encrypted document isnt of the right format", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.getDocumentIDFromBytes(new Uint8Array(5) as any)).toThrow();
            expect(() => DocumentSDK.getDocumentIDFromBytes("" as any)).toThrow();
        });

        it("fails when encrypted document is not a supported version", () => {
            ShimUtils.setSDKInitialized();
            const doc = concatArrayBuffers(new Uint8Array([9]), new Uint8Array(40));
            DocumentSDK.getDocumentIDFromBytes(doc)
                .then(() => {
                    throw new Error("Should not resolve when document ID is an unsupported version.");
                })
                .catch((e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                });
        });

        it("returns null if document is a v1 doc", () => {
            ShimUtils.setSDKInitialized();
            const doc = concatArrayBuffers(new Uint8Array([1]), new Uint8Array(40));

            DocumentSDK.getDocumentIDFromBytes(doc)
                .then((result) => {
                    expect(result).toBeNull();
                })
                .catch((e) => {
                    throw new Error(e.message);
                });
        });

        it("rejects if the provided document header is malformed", () => {
            ShimUtils.setSDKInitialized();
            const headerJSON = UTF8.encode(JSON.stringify({_did_: "353"}));
            //Make provided length one less character that the actual length
            const doc = concatArrayBuffers(new Uint8Array([2, 0, headerJSON.length - 1]), headerJSON);

            DocumentSDK.getDocumentIDFromBytes(doc)
                .then(() => {
                    throw new Error("Should not succeed when ID cannot be parsed.");
                })
                .catch((e) => {
                    expect(e.message).toEqual(expect.stringContaining(""));
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                });
        });

        it("parses document ID and returns value", () => {
            ShimUtils.setSDKInitialized();
            const headerJSON = UTF8.encode(JSON.stringify({_did_: "353"}));
            //Make provided length one less character that the actual length
            const doc = concatArrayBuffers(new Uint8Array([2, 0, headerJSON.length]), headerJSON);

            DocumentSDK.getDocumentIDFromBytes(doc)
                .then((result) => {
                    expect(result).toEqual("353");
                })
                .catch((e) => {
                    throw new Error(e.message);
                });
        });

        it("parses document ID and returns value when the array is different from the buffer", () => {
            ShimUtils.setSDKInitialized();
            const headerJSON = UTF8.encode(JSON.stringify({_did_: "353"}));
            const buffer = concatArrayBuffers(new Uint8Array([0, 0, 0, 0, 2, 0, headerJSON.length]), headerJSON, new Uint8Array([0, 0, 0, 0])).buffer;
            //Make the doc a view with offset 4 and a short length to get rid of the 4 zeros on the front and 4 on the back
            const doc = new Uint8Array(buffer, 4, buffer.byteLength - 8);
            DocumentSDK.getDocumentIDFromBytes(doc)
                .then((result) => {
                    expect(result).toEqual("353");
                })
                .catch((e) => {
                    throw new Error(e.message);
                });
        });
    });

    describe("decryptFromStore", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.decryptFromStore("mydoc")).toThrow();
        });

        it("throws error if document ID is not set or has no length", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.decryptFromStore(null as any)).toThrow();
            expect(() => DocumentSDK.decryptFromStore("")).toThrow();
            expect(() => DocumentSDK.decryptFromStore("^ID")).toThrow();
        });

        it("returns response from document get from store api and sets default options correctly", (done) => {
            ShimUtils.setSDKInitialized();
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        data: new Uint8Array([98, 93]),
                        documentID: "doc-10",
                        documentName: "fooey",
                    },
                })
            );
            DocumentSDK.decryptFromStore("mydoc")
                .then((result: any) => {
                    expect(result).toEqual({
                        documentID: "doc-10",
                        documentName: "fooey",
                        data: new Uint8Array([98, 93]),
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_STORE_DECRYPT",
                        message: {
                            documentID: "mydoc",
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("decrypt", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.decrypt("mydoc", new Uint8Array([]))).toThrow();
        });

        it("throws errors if no document ID or ID is invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.decrypt("", new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.decrypt("~ID", new Uint8Array([]))).toThrow();
        });

        it("fails when encrypted document isnt of the right format", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.decrypt("id", {} as any)).toThrow();
            expect(() => DocumentSDK.decrypt("id", "" as any)).toThrow();
        });

        it("calls decrypt api and returns response", (done) => {
            ShimUtils.setSDKInitialized();
            const doc = new Uint8Array(33);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        data: new Uint8Array([98, 87]),
                    },
                })
            );
            DocumentSDK.decrypt("mydoc", doc)
                .then((result: any) => {
                    expect(result).toEqual({
                        data: new Uint8Array([98, 87]),
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_DECRYPT",
                            message: {
                                documentID: "mydoc",
                                documentData: doc,
                            },
                        },
                        [doc]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("calls decrypt api with bytes and returns response", (done) => {
            ShimUtils.setSDKInitialized();
            const doc = new Uint8Array(33);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        data: new Uint8Array([98, 87]),
                    },
                })
            );
            DocumentSDK.decrypt("mydoc", doc)
                .then((result: any) => {
                    expect(result).toEqual({
                        data: new Uint8Array([98, 87]),
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_DECRYPT",
                            message: {
                                documentID: "mydoc",
                                documentData: doc,
                            },
                        },
                        [doc]
                    );
                    //Ensure we cloned these bytes before passing them to the frame
                    const passedDoc = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls.pop()[0].message.documentData;
                    expect(passedDoc).not.toBe(doc);
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("encryptToStore", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.encryptToStore(new Uint8Array(35))).toThrow();
        });

        it("throws error if document parameters are invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.encryptToStore(new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.encryptToStore(new Uint8Array([]), {documentID: 3} as any)).toThrow();
            expect(() => DocumentSDK.encryptToStore(new Uint8Array([]), {documentID: ""})).toThrow();
            expect(() => DocumentSDK.encryptToStore(new Uint8Array([]), {documentID: "abc`"})).toThrow();
        });

        it("throws error if document data is not a string or byte array", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.encryptToStore([] as any)).toThrow();
        });

        it("passes bytes to api and returns response from document create", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            DocumentSDK.encryptToStore(document)
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    //Ensure we cloned these bytes before passing them to the frame
                    const passedDoc = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls.pop()[0].message.documentData;
                    expect(passedDoc).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses grauntToAuthor from options if provided", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            DocumentSDK.encryptToStore(document, {grantToAuthor: false})
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: false,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses ID from options if provided", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            DocumentSDK.encryptToStore(document, {documentID: "provideID"})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: "provideID",
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses provided name from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            DocumentSDK.encryptToStore(document, {documentName: "my doc"})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "my doc",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("dedupes list of users and groups provided", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const userList = [{id: "user-31"}, {id: "user-55"}, {id: "user-31"}];
            const groupList = [{id: "group-1"}, {id: "group-2"}, {id: "group-3"}];
            DocumentSDK.encryptToStore(document, {documentName: "my doc name", accessList: {users: userList, groups: groupList}})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "my doc name",
                                userGrants: ["user-31", "user-55"],
                                groupGrants: ["group-1", "group-2", "group-3"],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("passes policy if provided in options", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: new Uint8Array([90, 102, 103]),
                    },
                })
            );

            DocumentSDK.encryptToStore(document, {policy: {}})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                                policy: {},
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("rejects if size of data is above max limit", () => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array(2050000);
            DocumentSDK.encryptToStore(document)
                .then(() => {
                    throw new Error("Encrypt to store should reject when data is too large");
                })
                .catch((e) => {
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED);
                });
        });
    });

    describe("encrypt", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.encrypt(new Uint8Array(32))).toThrow();
        });

        it("throws errors if arguments are invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.encrypt(new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.encrypt(new Uint8Array([]), {documentID: 3} as any)).toThrow();
            expect(() => DocumentSDK.encrypt(new Uint8Array([]), {documentID: ""})).toThrow();
            expect(() => DocumentSDK.encrypt(new Uint8Array([]), {documentID: "(ID)"})).toThrow();
        });

        it("passes bytes to api and returns response from document create", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([88, 91, 99]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                        documentID: "doc-10",
                        documentName: "fooey",
                        created: "1",
                        updated: "2",
                    },
                })
            );

            DocumentSDK.encrypt(document)
                .then((result) => {
                    expect(result).toEqual({
                        documentID: "doc-10",
                        documentName: "fooey",
                        document: encryptedDoc,
                        created: "1",
                        updated: "2",
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    const messagePayload = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls[0][0];
                    expect(messagePayload.message.documentID.length).toEqual(32);
                    expect(messagePayload.message.documentID).toMatch(/[0-9a-fA-F]+/);
                    //Ensure we cloned these bytes before passing them to the frame
                    expect(messagePayload.message.documentData).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses grantToAuthor from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.encrypt(document, {grantToAuthor: false})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: false,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses provided ID from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.encrypt(document, {documentID: "providedID"})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: "providedID",
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses provided name from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.encrypt(document, {documentName: "my doc name"})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "my doc name",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("dedupes list of users and groups provided", (done) => {
            ShimUtils.setSDKInitialized();
            const userList = [{id: "user-31"}, {id: "user-55"}, {id: "user-31"}];
            const groupList = [{id: "group-1"}, {id: "group-2"}, {id: "group-3"}];

            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.encrypt(document, {accessList: {users: userList, groups: groupList}})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: ["user-31", "user-55"],
                                groupGrants: ["group-1", "group-2", "group-3"],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("passes policy if provided in options", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: new Uint8Array([90, 102, 103]),
                    },
                })
            );

            DocumentSDK.encrypt(document, {policy: {}})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                documentName: "",
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                                policy: {},
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("updateEncryptedDataInStore", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.updateEncryptedDataInStore("mydoc", new Uint8Array(32))).toThrow();
        });

        it("throws error if document key is not set or has no length", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.updateEncryptedDataInStore(null as any, new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.updateEncryptedDataInStore("", new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.updateEncryptedDataInStore("<ID>", new Uint8Array([]))).toThrow();
        });

        it("throws error if document data is not a string or byte array", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.updateEncryptedDataInStore("dockey", [] as any)).toThrow();
        });

        it("passes through doc content as bytes", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([32]);
            DocumentSDK.updateEncryptedDataInStore("mydoc", document)
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_STORE_UPDATE_DATA",
                            message: {
                                documentID: "mydoc",
                                documentData: document,
                            },
                        },
                        [document]
                    );
                    //Ensure we cloned these bytes before passing them to the frame
                    const passedDoc = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls.pop()[0].message.documentData;
                    expect(passedDoc).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });

        it("rejects if size of data is above max limit", () => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array(2050000);
            DocumentSDK.updateEncryptedDataInStore("mydoc", document)
                .then(() => {
                    throw new Error("Update to store should reject when data is too large");
                })
                .catch((e) => {
                    expect(e.code).toEqual(ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED);
                });
        });
    });

    describe("updateEncryptedData", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.updateEncryptedData("mydoc", new Uint8Array(32))).toThrow();
        });

        it("throws errors for invalid parameters", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.updateEncryptedData("", new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.updateEncryptedData("dockey", [] as any)).toThrow();
            expect(() => DocumentSDK.updateEncryptedData("&docID", new Uint8Array([]))).toThrow();
        });

        it("calls updateEncryptedData doc to string API and returns expected result", (done) => {
            ShimUtils.setSDKInitialized();
            const doc = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([98, 99, 107]);

            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        documentID: "doc-10",
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.updateEncryptedData("mydoc", doc)
                .then((result: any) => {
                    expect(result).toEqual({
                        documentID: "doc-10",
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UPDATE_DATA",
                            message: {
                                documentID: "mydoc",
                                documentData: doc,
                            },
                        },
                        [doc]
                    );
                    //Ensure we cloned these bytes before passing them to the frame
                    const passedDoc = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls.pop()[0].message.documentData;
                    expect(passedDoc).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("updateName", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.updateName("doc-10", "new name")).toThrow();
        });

        it("throws if ID does not look valid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.updateName(null as any, "")).toThrow();
            expect(() => DocumentSDK.updateName('"ID23', "")).toThrow();
        });

        it("calls document update name API with values passed in", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.updateName("doc-10", "new name")
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_UPDATE_NAME",
                        message: {
                            documentID: "doc-10",
                            name: "new name",
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });

        it("converts empty string values into null", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.updateName("doc-10", "")
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_UPDATE_NAME",
                        message: {
                            documentID: "doc-10",
                            name: null,
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("grantAccess", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.grantAccess("mydoc", {users: [{id: "10"}]})).toThrow();
        });

        it("throws errors if no document ID or invalid ID", () => {
            ShimUtils.setSDKInitialized();
            expect(() => (DocumentSDK as any).grantAccess("", [])).toThrow();
            expect(() => (DocumentSDK as any).grantAccess("=ID", [])).toThrow();
        });

        it("throws errors if list of user IDs has no valid values", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.grantAccess("docID", {})).toThrow();
            expect(() => DocumentSDK.grantAccess("docID", {users: []})).toThrow();
            expect(() => DocumentSDK.grantAccess("docID", {groups: []})).toThrow();
            expect(() => DocumentSDK.grantAccess("docID", {users: [], groups: []})).toThrow();
        });

        it("calls document grantAccess API with list of users", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.grantAccess("mydoc", {users: [{id: "10"}, {id: "20"}]})
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_GRANT",
                        message: {
                            documentID: "mydoc",
                            userGrants: ["10", "20"],
                            groupGrants: [],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });

        it("dedupes array of ids provided", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.grantAccess("mydoc", {
                users: [{id: "10"}, {id: "20"}, {id: "10"}, {id: "10"}, {id: "20"}],
                groups: [{id: "35"}, {id: "32"}, {id: "35"}],
            })
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_GRANT",
                        message: {
                            documentID: "mydoc",
                            userGrants: ["10", "20"],
                            groupGrants: ["35", "32"],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });

        it("passes in list of valid groups without users as well", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.grantAccess("mydoc", {groups: [{id: "35"}, {id: "132"}, {id: "22"}]})
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_GRANT",
                        message: {
                            documentID: "mydoc",
                            userGrants: [],
                            groupGrants: ["35", "132", "22"],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("revokeAccess", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.revokeAccess("mydoc", {users: [{id: "10"}]})).toThrow();
        });

        it("throws errors if no document ID or ID is invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => (DocumentSDK as any).revokeAccess("", [])).toThrow();
            expect(() => (DocumentSDK as any).revokeAccess("^ID", [])).toThrow();
        });

        it("throws errors if list of user IDs has no valid values", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.revokeAccess("docID", {})).toThrow();
            expect(() => DocumentSDK.revokeAccess("docID", {users: []})).toThrow();
            expect(() => DocumentSDK.revokeAccess("docID", {groups: []})).toThrow();
            expect(() => DocumentSDK.revokeAccess("docID", {users: [], groups: []})).toThrow();
        });

        it("calls document revokeAccess API with list of users", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.revokeAccess("mydoc", {users: [{id: "10"}, {id: "20"}]})
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_REVOKE",
                        message: {
                            documentID: "mydoc",
                            userRevocations: ["10", "20"],
                            groupRevocations: [],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });

        it("dedupes array of ids provided", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.revokeAccess("mydoc", {
                users: [{id: "10"}, {id: "20"}, {id: "10"}, {id: "10"}, {id: "20"}],
                groups: [{id: "35"}, {id: "32"}, {id: "35"}],
            })
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_REVOKE",
                        message: {
                            documentID: "mydoc",
                            userRevocations: ["10", "20"],
                            groupRevocations: ["35", "32"],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });

        it("passes in list of valid groups without users as well", (done) => {
            ShimUtils.setSDKInitialized();
            DocumentSDK.revokeAccess("mydoc", {groups: [{id: "35"}, {id: "132"}, {id: "22"}]})
                .then((result: any) => {
                    expect(result).toEqual("messageResponse");
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "DOCUMENT_REVOKE",
                        message: {
                            documentID: "mydoc",
                            userRevocations: [],
                            groupRevocations: ["35", "132", "22"],
                        },
                    });
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("advanced.decryptUnmanaged", () => {
        const nonEmptyEdeks = new Uint8Array([100]);
        it("fails when encrypted document isnt of the right format", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.advanced.decryptUnmanaged({} as any, nonEmptyEdeks)).toThrow();
            expect(() => DocumentSDK.advanced.decryptUnmanaged("" as any, nonEmptyEdeks)).toThrow();
        });

        it("fails when edeks arent of the right format", () => {
            const doc = new Uint8Array(Array.prototype.fill(0, 0, 100));
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.advanced.decryptUnmanaged(doc, {} as any)).toThrow();
            expect(() => DocumentSDK.advanced.decryptUnmanaged(doc, new Uint8Array())).toThrow();
        });

        it("calls decrypt api with bytes and returns response", (done) => {
            ShimUtils.setSDKInitialized();
            const headerJSON = UTF8.encode(JSON.stringify({_did_: "353"}));
            //Make provided length one less character that the actual length
            const doc = concatArrayBuffers(new Uint8Array([2, 0, headerJSON.length]), headerJSON);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        data: new Uint8Array([98, 87]),
                    },
                })
            );
            DocumentSDK.advanced
                .decryptUnmanaged(doc, nonEmptyEdeks)
                .then((result: any) => {
                    expect(result).toEqual({
                        data: new Uint8Array([98, 87]),
                        documentID: "353",
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_DECRYPT",
                            message: {
                                edeks: nonEmptyEdeks,
                                documentData: doc,
                            },
                        },
                        [doc]
                    );
                    //Ensure we cloned these bytes before passing them to the frame
                    const passedDoc = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls.pop()[0].message.documentData;
                    expect(passedDoc).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });
    });

    describe("advanced.encryptUnmanaged", () => {
        it("throws if SDK has not yet been initialized", () => {
            expect(() => DocumentSDK.advanced.encryptUnmanaged(new Uint8Array(32))).toThrow();
        });

        it("throws errors if arguments are invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => DocumentSDK.advanced.encryptUnmanaged(new Uint8Array([]))).toThrow();
            expect(() => DocumentSDK.advanced.encryptUnmanaged(new Uint8Array([]), {documentID: 3} as any)).toThrow();
            expect(() => DocumentSDK.advanced.encryptUnmanaged(new Uint8Array([]), {documentID: ""})).toThrow();
            expect(() => DocumentSDK.advanced.encryptUnmanaged(new Uint8Array([]), {documentID: "(ID)"})).toThrow();
        });

        it("passes bytes to api and returns response from document create", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([88, 91, 99]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                        documentID: "doc-10",
                        edeks: "edeks",
                    },
                })
            );

            DocumentSDK.advanced
                .encryptUnmanaged(document)
                .then((result) => {
                    expect(result).toEqual({
                        documentID: "doc-10",
                        document: encryptedDoc,
                        edeks: "edeks",
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                                policy: undefined,
                            },
                        },
                        [document]
                    );
                    const messagePayload = (FrameMediator.sendMessage as unknown as jest.SpyInstance).mock.calls[0][0];
                    expect(messagePayload.message.documentID.length).toEqual(32);
                    expect(messagePayload.message.documentID).toMatch(/[0-9a-fA-F]+/);
                    //Ensure we cloned these bytes before passing them to the frame
                    expect(messagePayload.message.documentData).not.toBe(document);
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses grantToAuthor from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                        edeks: "edeks",
                    },
                })
            );

            DocumentSDK.advanced
                .encryptUnmanaged(document, {grantToAuthor: false})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                        edeks: "edeks",
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: false,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("uses provided ID from options object", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        documentID: "providedID",
                        document: encryptedDoc,
                        edeks: "edeks",
                    },
                })
            );

            DocumentSDK.advanced
                .encryptUnmanaged(document, {documentID: "providedID"})
                .then((result: any) => {
                    expect(result).toEqual({
                        documentID: "providedID",
                        document: encryptedDoc,
                        edeks: "edeks",
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_ENCRYPT",
                            message: {
                                documentID: "providedID",
                                documentData: document,
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("dedupes list of users and groups provided", (done) => {
            ShimUtils.setSDKInitialized();
            const userList = [{id: "user-31"}, {id: "user-55"}, {id: "user-31"}];
            const groupList = [{id: "group-1"}, {id: "group-2"}, {id: "group-3"}];

            const document = new Uint8Array([100, 111, 99]);
            const encryptedDoc = new Uint8Array([90, 102, 103]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: encryptedDoc,
                    },
                })
            );

            DocumentSDK.advanced
                .encryptUnmanaged(document, {accessList: {users: userList, groups: groupList}})
                .then((result: any) => {
                    expect(result).toEqual({
                        document: encryptedDoc,
                    });
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                userGrants: ["user-31", "user-55"],
                                groupGrants: ["group-1", "group-2", "group-3"],
                                grantToAuthor: true,
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });

        it("passes policy if provided in options", (done) => {
            ShimUtils.setSDKInitialized();
            const document = new Uint8Array([100, 111, 99]);
            (FrameMediator.sendMessage as unknown as jest.SpyInstance).mockReturnValue(
                Future.of<any>({
                    message: {
                        document: new Uint8Array([90, 102, 103]),
                    },
                })
            );

            DocumentSDK.advanced
                .encryptUnmanaged(document, {policy: {}})
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith(
                        {
                            type: "DOCUMENT_UNMANAGED_ENCRYPT",
                            message: {
                                documentID: expect.any(String),
                                documentData: document,
                                userGrants: [],
                                groupGrants: [],
                                grantToAuthor: true,
                                policy: {},
                            },
                        },
                        [document]
                    );
                    done();
                })
                .catch((e) => done(e));
        });
    });
});

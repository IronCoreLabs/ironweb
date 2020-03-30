import Future from "futurejs";
import {ErrorCodes} from "../../../Constants";
import SDKError from "../../../lib/SDKError";
import * as WorkerMediator from "../../WorkerMediator";
import * as DocAdvancedApi from "../DocumentAdvancedApi";
import * as SearchApi from "../SearchApi";

describe("SearchApi", () => {
    describe("createBlindSearchIndex", () => {
        it("generates a random salt, encrypts it, and returns unmanaged doc", () => {
            jest.spyOn(DocAdvancedApi, "encrypt").mockReturnValue(
                Future.of({
                    document: "encDoc",
                    edeks: ["edek1", "edek2"],
                } as any)
            );

            SearchApi.createBlindSearchIndex("mySearchIndexGroup").engage(
                (e) => fail(e),
                (res) => {
                    expect(res).toEqual({
                        searchIndexEncryptedSalt: "encDoc",
                        searchIndexEdeks: ["edek1", "edek2"],
                    });
                    expect(DocAdvancedApi.encrypt).toHaveBeenCalledWith(expect.any(String), expect.any(Uint8Array), [], ["mySearchIndexGroup"], false);
                }
            );
        });

        it("maps error to search index error", () => {
            jest.spyOn(DocAdvancedApi, "encrypt").mockReturnValue(
                Future.reject(new SDKError(new Error("unmanaged decrypt error"), ErrorCodes.DOCUMENT_ENCRYPT_FAILURE))
            );

            SearchApi.createBlindSearchIndex("mySearchIndexGroup").engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.SEARCH_CREATE_INDEX_FAILURE);
                },
                () => fail("Should not succeed when doc encrypt fails")
            );
        });
    });

    describe("initializeBlindSearchIndex", () => {
        it("decrypts the provided salt, generates a random ID and stores the ID", () => {
            jest.spyOn(DocAdvancedApi, "decryptWithProvidedEdeks").mockReturnValue(
                Future.of({
                    data: new Uint8Array([82, 32, 87, 109, 139]),
                    accessVia: {type: "group", id: "mySearchIndexGroup"},
                })
            );

            SearchApi.initializeBlindSearchIndex(new Uint8Array([99, 193]), new Uint8Array([135, 166])).engage(
                (e) => fail(e),
                (searchIndexId) => {
                    expect(searchIndexId).toEqual(expect.any(String));
                    expect(searchIndexId).toHaveLength(16);
                    expect(DocAdvancedApi.decryptWithProvidedEdeks).toHaveBeenCalledWith(new Uint8Array([99, 193]), new Uint8Array([135, 166]));
                }
            );
        });

        it("converts error to search index error if decrypt fails", () => {
            jest.spyOn(DocAdvancedApi, "decryptWithProvidedEdeks").mockReturnValue(
                Future.reject(new SDKError(new Error("decrypt failed"), ErrorCodes.DOCUMENT_DECRYPT_FAILURE))
            );

            SearchApi.initializeBlindSearchIndex(new Uint8Array([99, 193]), new Uint8Array([135, 166])).engage(
                (e) => {
                    expect(e.code).toEqual(ErrorCodes.SEARCH_INIT_INDEX_FAILURE);
                },
                () => fail("Initialize should fail when salt decrypt fails")
            );
        });
    });

    describe("tokenizeData", () => {
        it("fails when search index hasnt been initialized", () => {
            SearchApi.tokenizeData("nope", "data").engage(
                (e) => {
                    expect(e.message).toContain("not yet been initialized");
                    expect(e.code).toEqual(ErrorCodes.SEARCH_TOKENIZE_DATA_FAILURE);
                },
                () => fail("Should not be able to tokenize data without initializatin")
            );
        });

        it("sends message to frame to tokenize data", () => {
            jest.spyOn(DocAdvancedApi, "decryptWithProvidedEdeks").mockReturnValue(
                Future.of({
                    data: new Uint8Array([82, 32, 87, 109, 139]),
                    accessVia: {type: "group", id: "mySearchIndexGroup"},
                })
            );
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "tokenized data"}));

            SearchApi.initializeBlindSearchIndex(new Uint8Array([33]), new Uint8Array([32]))
                .flatMap((searchIndexId) => SearchApi.tokenizeData(searchIndexId, "search data", "partition"))
                .engage(
                    (e) => fail(e),
                    (result: any) => {
                        expect(result).toEqual("tokenized data");
                        expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                            type: "SEARCH_TOKENIZE_DATA",
                            message: {
                                value: "search data",
                                partitionId: "partition",
                                //Decrypted value from mock above
                                salt: new Uint8Array([82, 32, 87, 109, 139]),
                            },
                        });
                    }
                );
        });
    });

    describe("tokenizeQuery", () => {
        it("fails when search index hasnt been initialized", () => {
            SearchApi.tokenizeQuery("nope", "data").engage(
                (e) => {
                    expect(e.message).toContain("not yet been initialized");
                    expect(e.code).toEqual(ErrorCodes.SEARCH_TOKENIZE_QUERY_FAILURE);
                },
                () => fail("Should not be able to tokenize query without initializatin")
            );
        });

        it("sends message to frame to tokenize query", () => {
            jest.spyOn(DocAdvancedApi, "decryptWithProvidedEdeks").mockReturnValue(
                Future.of({
                    data: new Uint8Array([82, 32, 87, 109, 139]),
                    accessVia: {type: "group", id: "mySearchIndexGroup"},
                })
            );
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "tokenized query"}));

            SearchApi.initializeBlindSearchIndex(new Uint8Array([33]), new Uint8Array([32]))
                .flatMap((searchIndexId) => SearchApi.tokenizeQuery(searchIndexId, "search query", "partition"))
                .engage(
                    (e) => fail(e),
                    (result: any) => {
                        expect(result).toEqual("tokenized query");
                        expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                            type: "SEARCH_TOKENIZE_QUERY",
                            message: {
                                value: "search query",
                                partitionId: "partition",
                                //Decrypted value from mock above
                                salt: new Uint8Array([82, 32, 87, 109, 139]),
                            },
                        });
                    }
                );
        });
    });

    describe("transliterateString", () => {
        it("sends message to frame to transliterate string", () => {
            spyOn(WorkerMediator, "sendMessage").and.returnValue(Future.of({message: "transliterated string"}));

            SearchApi.transliterateString("my string").engage(
                (e) => fail(e),
                (result) => {
                    expect(result).toEqual("transliterated string");
                    expect(WorkerMediator.sendMessage).toHaveBeenCalledWith({
                        type: "SEARCH_TRANSLITERATE_STRING",
                        message: "my string",
                    });
                }
            );
        });
    });
});

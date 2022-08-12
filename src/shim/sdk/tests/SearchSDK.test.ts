import Future from "futurejs";
import {RequestMessage, ResponseMessage} from "../../../FrameMessageTypes";
import * as FrameMediator from "../../FrameMediator";
import * as ShimUtils from "../../ShimUtils";
import * as SearchSDK from "../SearchSDK";

describe("SearchSDK", () => {
    let sendMessageMock: jest.SpyInstance<Future<Error, ResponseMessage>, [RequestMessage, (Uint8Array[] | undefined)?]>;
    beforeEach(() => {
        sendMessageMock = jest.spyOn(FrameMediator, "sendMessage");
        sendMessageMock.mockReturnValue(Future.of<any>({message: "messageResponse"} as any));
    });

    afterEach(() => {
        ShimUtils.clearSDKInitialized();
    });

    describe("createBlindSearchIndex", () => {
        it("fails if provided group is not valid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => SearchSDK.createBlindSearchIndex("")).toThrow();
        });

        it("makes call to frame and returns Promise of result", (done) => {
            ShimUtils.setSDKInitialized();
            SearchSDK.createBlindSearchIndex("group").then((res) => {
                expect(res).toEqual("messageResponse");
                expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                    type: "BLIND_SEARCH_INDEX_CREATE",
                    message: {groupId: "group"},
                });
                done();
            });
        });
    });

    describe("initializeBlindSearchIndex", () => {
        it("throws if provided BlindIndex is invalid", () => {
            ShimUtils.setSDKInitialized();
            expect(() => SearchSDK.initializeBlindSearchIndex({} as any)).toThrow();
            expect(() => SearchSDK.initializeBlindSearchIndex({searchIndexEncryptedSalt: new Uint8Array([1, 2])} as any)).toThrow();
            expect(() => SearchSDK.initializeBlindSearchIndex({searchIndexEdeks: new Uint8Array([1, 2])} as any)).toThrow();
            expect(() => SearchSDK.initializeBlindSearchIndex({searchIndexEdeks: new Uint8Array(), searchIndexEncryptedSalt: new Uint8Array()})).toThrow();
        });

        it("returns instance of InitializedSearchIndex on success", (done) => {
            ShimUtils.setSDKInitialized();
            SearchSDK.initializeBlindSearchIndex({searchIndexEdeks: new Uint8Array([1]), searchIndexEncryptedSalt: new Uint8Array([2])}).then((res) => {
                expect(typeof res).toBe("object");
                expect(typeof res.tokenizeData).toBe("function");
                expect(typeof res.tokenizeQuery).toBe("function");
                done();
            });
        });
    });

    describe("tokenizeData", () => {
        it("sends expected message to frame to tokenize data after calling init", (done) => {
            ShimUtils.setSDKInitialized();
            sendMessageMock.mockReturnValue(Future.of<any>({message: {searchIndexId: "indexId"}} as any));
            SearchSDK.initializeBlindSearchIndex({searchIndexEdeks: new Uint8Array([1]), searchIndexEncryptedSalt: new Uint8Array([2])})
                .then((tokenizeApi) => tokenizeApi.tokenizeData("data to tokenize", "partition"))
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "BLIND_SEARCH_INDEX_TOKENIZE_DATA",
                        message: {
                            data: "data to tokenize",
                            partitionId: "partition",
                            searchIndexId: "indexId",
                        },
                    });
                    done();
                });
        });
    });

    describe("tokenizeQuery", () => {
        it("sends expected message to frame to tokenize query after calling init", (done) => {
            ShimUtils.setSDKInitialized();
            sendMessageMock.mockReturnValue(Future.of<any>({message: {searchIndexId: "indexId"}} as any));
            SearchSDK.initializeBlindSearchIndex({searchIndexEdeks: new Uint8Array([1]), searchIndexEncryptedSalt: new Uint8Array([2])})
                .then((tokenizeApi) => tokenizeApi.tokenizeQuery("query to tokenize", "partition"))
                .then(() => {
                    expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                        type: "BLIND_SEARCH_INDEX_TOKENIZE_QUERY",
                        message: {
                            query: "query to tokenize",
                            partitionId: "partition",
                            searchIndexId: "indexId",
                        },
                    });
                    done();
                });
        });
    });

    describe("transliterateString", () => {
        it("makes call to frame to transliterate string", (done) => {
            SearchSDK.transliterateString("my string").then((res) => {
                expect(res).toEqual("messageResponse");
                expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                    type: "SEARCH_TRANSLITERATE_STRING",
                    message: "my string",
                });
                done();
            });
        });
    });
});

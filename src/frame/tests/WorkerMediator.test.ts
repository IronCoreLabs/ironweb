import {sendMessage, messenger} from "../WorkerMediator";
import Future from "futurejs";

describe("WorkerMediator", () => {
    describe("sendMessage", () => {
        it("passes in payload and optional transfer list to API and responds with result", () => {
            spyOn(messenger, "postMessageToWorker").and.returnValue(
                Future.of({
                    foo: "bar",
                })
            );
            sendMessage({payload: "content"} as any, ["foo", "bar"] as any).engage(
                (e) => fail(e),
                (result: any) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(messenger.postMessageToWorker).toHaveBeenCalledWith({payload: "content"}, ["foo", "bar"]);
                }
            );
        });

        it("handles error message response types and rejects futures", () => {
            spyOn(messenger, "postMessageToWorker").and.returnValue(
                Future.of({
                    message: {
                        text: "error",
                        code: 108,
                    },
                    type: "ERROR_RESPONSE",
                })
            );

            sendMessage({payload: "content"} as any).engage(
                (e: any) => {
                    expect(e.message).toEqual("error");
                    expect(e.code).toEqual(108);
                },
                () => fail("Should fail with error response content")
            );
        });
    });

    describe("WorkerMessenger", () => {
        describe("postMessageToWorker", () => {
            it("posts message on worker and returns Future", () => {
                (messenger as any).worker = {
                    postMessage: jasmine.createSpy("postMessage"),
                };

                messenger.postMessageToWorker({foo: "bar"} as any).engage(
                    (e) => fail(e),
                    () => {
                        expect(messenger.worker.postMessage).toHaveBeenCalledWith(
                            {
                                replyID: 0,
                                data: {foo: "bar"},
                            },
                            []
                        );

                        expect(messenger.callbacks).toBeArrayOfSize(1);
                    }
                );
            });

            it("converts byte arrays to buffers in transfer list", () => {
                (messenger as any).worker = {
                    postMessage: jasmine.createSpy("postMessage"),
                };
                const bytes = [new Uint8Array(5), new Uint8Array(6)];

                messenger.postMessageToWorker({foo: "bar"} as any, bytes).engage(
                    (e) => fail(e),
                    () => {
                        expect(messenger.worker.postMessage).toHaveBeenCalledWith(
                            {
                                replyID: 0,
                                data: {foo: "bar"},
                            },
                            [new ArrayBuffer(5), new ArrayBuffer(6)]
                        );

                        expect(messenger.callbacks).toBeArrayOfSize(1);
                    }
                );
            });
        });

        describe("processMessage", () => {
            it("does nothing if no callback is set", () => {
                messenger.callbacks[7] = jasmine.createSpy("callback");
                messenger.processMessage({
                    data: {
                        data: {foo: "bar"},
                        replyID: 6,
                    },
                } as any);

                expect(messenger.callbacks[7] as any).not.toBeUndefined();
                expect(messenger.callbacks[7]).not.toHaveBeenCalled();
            });

            it("invokes callback provided and deletes it", () => {
                messenger.callbacks[7] = jasmine.createSpy("callback");
                messenger.processMessage({
                    data: {
                        data: {foo: "bar"},
                        replyID: 7,
                    },
                } as any);

                expect(messenger.callbacks[7]).toBeUndefined();
            });
        });
    });
});

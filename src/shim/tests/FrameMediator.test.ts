import Future from "futurejs";
import {sendMessage, messenger, ShimMessenger} from "../FrameMediator";
import {Frame} from "../../Constants";

describe("FrameMediator", () => {
    describe("ShimMessenger", () => {
        let fauxFrame: any;
        beforeEach(() => {
            fauxFrame = {
                addEventListener: jasmine.createSpy("addEventListener"),
                contentWindow: {
                    postMessage: jasmine.createSpy("postMessage"),
                },
            };
        });

        describe("constructor", () => {
            it("creates channel message and passes it down to frame on load", () => {
                new ShimMessenger(fauxFrame);

                expect(fauxFrame.addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
                fauxFrame.addEventListener.calls.argsFor(0)[1]();
                expect(fauxFrame.contentWindow.postMessage).toHaveBeenCalledWith("MESSAGE_PORT_INIT", Frame.FRAME_DOMAIN, expect.any(Object));
            });
        });

        describe("postMessageToFrame", () => {
            it("posts message to port with expected data and returns expected Future", (done) => {
                const messenger = new ShimMessenger(fauxFrame as any);

                (messenger as any).messagePort = {
                    postMessage: jasmine.createSpy("postMessage"),
                };

                messenger.postMessageToFrame({foo: "bar"} as any).engage(
                    (e) => fail(e.message),
                    (result: any) => {
                        expect(result).toEqual({engaged: "future"});
                        done();
                    }
                );

                expect(messenger.messagePort.postMessage).toHaveBeenCalledWith({data: {foo: "bar"}, replyID: 0}, []);
                expect(messenger.callbackCount).toEqual(1);
                expect(messenger.callbacks).toEqual({
                    0: expect.any(Function),
                });
                messenger.callbacks[0]({engaged: "future"} as any);
            });

            it("maps transfer list items to buffers", (done) => {
                const messenger = new ShimMessenger(fauxFrame as any);

                (messenger as any).messagePort = {
                    postMessage: jasmine.createSpy("postMessage"),
                };

                messenger.postMessageToFrame({foo: "bar"} as any, [{buffer: "1"}, {buffer: "2"}] as any).engage(
                    (e) => fail(e.message),
                    (result: any) => {
                        expect(result).toEqual({engaged: "future"});
                        done();
                    }
                );

                expect(messenger.messagePort.postMessage).toHaveBeenCalledWith({data: {foo: "bar"}, replyID: 0}, ["1", "2"]);
                expect(messenger.callbacks).toEqual({
                    0: expect.any(Function),
                });
                messenger.callbacks[0]({engaged: "future"} as any);
            });

            it("returns a rejected Future when the message port post message fails", (done) => {
                const messenger = new ShimMessenger(fauxFrame as any);

                (messenger as any).messagePort = {
                    postMessage: jasmine.createSpy("postMessage").and.throwError("forced failure"),
                };

                messenger.postMessageToFrame({foo: "bar"} as any).engage(
                    (e) => {
                        expect(e.message).toEqual(expect.any(String));
                        done();
                    },
                    () => fail("should fail when postmessage throws an exception")
                );
            });
        });

        describe("processMessageIntoShim", () => {
            it("invokes callback given the replyID in the event", () => {
                const messenger = new ShimMessenger(fauxFrame as any);
                const cbSpy = jasmine.createSpy("callbackSpy");

                messenger.callbacks = {
                    35: cbSpy,
                };

                messenger.processMessageIntoShim({data: {data: "mock data", replyID: 35}} as any);
                expect(cbSpy).toHaveBeenCalledWith("mock data");
                expect(messenger.callbacks[35]).toBeUndefined();
            });

            it("does nothing with callback if not present", () => {
                const messenger = new ShimMessenger(fauxFrame as any);
                const cbSpy = jasmine.createSpy("callbackSpy");

                messenger.callbacks = {
                    35: cbSpy,
                };

                messenger.processMessageIntoShim({data: {data: "mock data", replyID: 21}} as any);
                expect(cbSpy).not.toHaveBeenCalled();
                expect(messenger.callbacks[35]).not.toBeUndefined();
            });
        });
    });

    describe("sendMessage", () => {
        it("passes in payload and optional transfer list to API and responds with result", () => {
            jest.spyOn(messenger, "postMessageToFrame").mockReturnValue(
                Future.of<any>({
                    foo: "bar",
                })
            );
            sendMessage({payload: "content"} as any, [new Uint8Array(12), new Uint8Array(10)]).engage(
                (e) => {
                    throw e;
                },
                (result: any) => {
                    expect(result).toEqual({foo: "bar"});
                    expect(messenger.postMessageToFrame).toHaveBeenCalledWith({payload: "content"}, [new Uint8Array(12), new Uint8Array(10)]);
                }
            );
        });

        it("handles error message response types and rejects futures", () => {
            jest.spyOn(messenger, "postMessageToFrame").mockReturnValue(
                Future.of<any>({
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
});

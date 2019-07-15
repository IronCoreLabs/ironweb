import FrameMessenger from "../FrameMessenger";

describe("FrameMessenger", () => {
    describe("constructor", () => {
        it("adds event listener from parent frame", () => {
            spyOn(window, "addEventListener");
            new FrameMessenger(() => null);

            expect(window.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
        });
    });

    describe("setupMessagePort", () => {
        it("does nothing if message isnt what we expect", () => {
            spyOn(window, "removeEventListener");

            const messenger = new FrameMessenger(() => null);

            messenger.setupMessagePort({data: "otherMessage"} as any);
            messenger.setupMessagePort({data: "MESSAGE_PORT_INIT"} as any);
            messenger.setupMessagePort({data: "MESSAGE_PORT_INIT", ports: ["port1", "port2"]} as any);

            expect(window.removeEventListener).not.toHaveBeenCalled();
        });

        it("gets port, starts it up and clears window message event", () => {
            spyOn(window, "removeEventListener");
            const fauxPort = {
                start: jasmine.createSpy("start"),
                addEventListener: jasmine.createSpy("addEventListener"),
            };
            const messenger = new FrameMessenger(() => null);

            messenger.setupMessagePort({data: "MESSAGE_PORT_INIT", ports: [fauxPort]} as any);

            expect(window.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
            expect(fauxPort.start).toHaveBeenCalledWith();
            expect(fauxPort.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
        });
    });

    describe("processMessageIntoFrame", () => {
        it("does nothing if not port is setup", () => {
            const callbackMethod = jasmine.createSpy("callbackMethod");
            const messenger = new FrameMessenger(callbackMethod);

            messenger.processMessageIntoFrame({data: {data: "mock data", replyID: 23}} as any);
            expect(callbackMethod).toHaveBeenCalledWith("mock data", expect.any(Function));
            const afterProcess = (callbackMethod as jasmine.Spy).calls.argsFor(0)[1];
            afterProcess("callback data");
        });

        it("posts message to port", () => {
            const fauxPort = {
                postMessage: jasmine.createSpy("postMessage"),
            };
            const callbackMethod = jasmine.createSpy("callbackMethod");
            const messenger = new FrameMessenger(callbackMethod);
            (messenger as any).messagePort = fauxPort;

            messenger.processMessageIntoFrame({data: {data: "mock data", replyID: 23}} as any);
            expect(callbackMethod).toHaveBeenCalledWith("mock data", expect.any(Function));
            const afterProcess = (callbackMethod as jasmine.Spy).calls.argsFor(0)[1];

            afterProcess("callback data");
            expect(fauxPort.postMessage).toHaveBeenCalledWith({replyID: 23, data: "callback data"}, []);
        });

        it("maps over transfer list to get item buffers", () => {
            const fauxPort = {
                postMessage: jasmine.createSpy("postMessage"),
            };
            const callbackMethod = jasmine.createSpy("callbackMethod");
            const messenger = new FrameMessenger(callbackMethod);
            (messenger as any).messagePort = fauxPort;

            messenger.processMessageIntoFrame({data: {data: "mock data", replyID: 23}} as any);
            const afterProcess = (callbackMethod as jasmine.Spy).calls.argsFor(0)[1];

            afterProcess("callback data", [{buffer: "1"}, {buffer: "2"}]);
            expect(fauxPort.postMessage).toHaveBeenCalledWith({replyID: 23, data: "callback data"}, ["1", "2"]);
        });
    });
});

import {RequestMessage, ResponseMessage} from "../FrameMessageTypes";
import {toTransferables} from "../lib/Utils";

type FrameMessageCallback = (message: RequestMessage, callback: (response: ResponseMessage, transferList?: (Uint8Array | Transferable)[]) => void) => void;

interface FrameEvent<T> {
    replyID: number;
    data: T;
}

export default class FrameMessenger {
    messagePort?: MessagePort;
    onMessageCallback: FrameMessageCallback;

    constructor(onFrameMessage: FrameMessageCallback) {
        this.onMessageCallback = onFrameMessage;
        window.addEventListener("message", this.setupMessagePort);
    }

    /**
     * Check if we got a message port event from the parent frame. If so, unsubscribe from global frame message events and store off
     * the MessagePort we got. Then setup a listener on the port for incoming messages.
     */
    setupMessagePort = (event: MessageEvent) => {
        if (event.data === "MESSAGE_PORT_INIT" && event.ports && event.ports.length === 1) {
            window.removeEventListener("message", this.setupMessagePort);
            event.ports[0].start();
            event.ports[0].addEventListener("message", this.processMessageIntoFrame);
            this.messagePort = event.ports[0];
        }
    };

    /**
     * Process a received message into the iFrame
     * @param {MessageEvent} event Frame postMessage event object
     */
    processMessageIntoFrame = (event: MessageEvent) => {
        const {data, replyID}: FrameEvent<RequestMessage> = event.data;
        this.onMessageCallback(data, (responseData: ResponseMessage, transferList: (Uint8Array | Transferable)[] = []) => {
            if (this.messagePort) {
                this.messagePort.postMessage({replyID, data: responseData}, toTransferables(transferList));
            }
        });
    };
}

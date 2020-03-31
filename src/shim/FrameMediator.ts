import Future from "futurejs";
import {ErrorCodes, Frame, Versions} from "../Constants";
import {ErrorResponse, RequestMessage, ResponseMessage} from "../FrameMessageTypes";
import SDKError from "../lib/SDKError";

interface FrameEvent<T> {
    replyID: number;
    data: T;
}

/**
 * Class which handles messaging from the shim into the frame. Holds callback messages so that users can interact with this
 * class via Futures. Also handles the creation of all the ChannelMessage ports to pass down to the frame.
 */
export class ShimMessenger {
    readonly messagePort: MessagePort;
    callbackCount = 0;
    callbacks: {[key: string]: (data: ResponseMessage) => void} = {};

    constructor(iFrameWindow: HTMLIFrameElement) {
        const channel = new MessageChannel();
        channel.port1.start();
        channel.port1.addEventListener("message", this.processMessageIntoShim);
        this.messagePort = channel.port1;
        iFrameWindow.addEventListener("load", () => {
            iFrameWindow.contentWindow!.postMessage("MESSAGE_PORT_INIT", Frame.FRAME_DOMAIN, [channel.port2]);
        });
    }

    /**
     * Post request message to child iFrame
     * @param {RequestMessage} data         RequestMessage to post to child iFrame
     * @param {Uint8Array[]}  transferList  List of byte arrays to transfer to frame
     */
    postMessageToFrame(data: RequestMessage, transferList: Uint8Array[] = []): Future<SDKError, ResponseMessage> {
        const message: FrameEvent<RequestMessage> = {
            replyID: this.callbackCount++,
            data,
        };
        try {
            this.messagePort.postMessage(
                message,
                transferList.map(({buffer}) => buffer)
            );
            return new Future<SDKError, ResponseMessage>((_, resolve) => {
                this.callbacks[message.replyID] = resolve;
            });
        } catch (_) {
            return Future.reject(
                new SDKError(new Error("Failure occurred when passing message due to the lack of browser support."), ErrorCodes.BROWSER_FRAME_MESSAGE_FAILURE)
            );
        }
    }

    /**
     * Process a received message into the parent window
     * @param {MessageEvent} event Window postMessage event object
     */
    processMessageIntoShim = (event: MessageEvent) => {
        const {data, replyID} = event.data as FrameEvent<ResponseMessage>;
        const callback = this.callbacks[replyID];

        if (callback) {
            delete this.callbacks[replyID];
            callback(data);
        }
    };
}

/**
 * Create a new invisible iFrame that points to the SDK frame, attach it to the window body, and subscribe to the
 * frame load event so we ensure we wait until it's available to call into it.
 */
const frame = window.document.createElement("iframe");
export const messenger = new ShimMessenger(frame);
const frameLoadedPromise = new Promise<any>((resolve, reject) => {
    //The frame "load" even fires even if the frame failed to load (e.g. 404). So once it loads, we want to verify that it is actually
    //responding to messages we pass it. So pass a test message and verify we get a response within a second. If it does, we resolve
    //this Promise for all future messages. If it fails we reject with the appropriate SDK error message.
    frame.addEventListener("load", () => {
        const timeout = setTimeout(() => {
            reject(new SDKError(new Error("Failed to load IronWeb frame."), ErrorCodes.FRAME_LOAD_FAILURE));
        }, 1000);
        messenger.postMessageToFrame({type: "FRAME_LOADED_CHECK"}).engage(reject, () => {
            clearTimeout(timeout);
            resolve();
        });
    });
});
frame.height = "0";
frame.width = "0";
frame.style.display = "none";
frame.style.position = "absolute";
frame.style.top = "-999px";
frame.style.left = "-999px";
frame.src = `${Frame.FRAME_DOMAIN}${Frame.FRAME_PATH}?version=${Versions.SDK_VERSION}`;
window.document.body.appendChild(frame);

/**
 * Return a simple Future wrapper around existing frame load Promise so that we wait until the iFrame has loaded before we post any messages to it. We
 * wrap a Promise here so that when this gets invoked over and over we don't recreate the Promise as it will cache it's resolved value and invoke the
 * `then` callback immediately. This allows subsequent calls to resolve immediately after the iFrame has finished loading.
 */
function ensureFrameLoaded() {
    return Future.tryP<Error, undefined>(() => frameLoadedPromise);
}

/**
 * Type guard to check if returned message is an error message type
 * @param {ResponseMessage} response ResponseMessage instance to check
 */
function isErrorResponse(response: ResponseMessage): response is ErrorResponse {
    return response.type === "ERROR_RESPONSE";
}

/**
 * Post the provided RequestMessage to the SDK frame. Returns a Future which will be resolved with the provided ResponseMessage type, or rejected with an SDKError
 */
export function sendMessage<T extends ResponseMessage>(payload: RequestMessage, transferList?: Uint8Array[]): Future<Error, T> {
    return ensureFrameLoaded()
        .flatMap(() => messenger.postMessageToFrame(payload, transferList))
        .flatMap((response) => {
            //Handle all error messages generically here. Convert the message details back into an error object and reject the Future
            if (isErrorResponse(response)) {
                return Future.reject(new SDKError(new Error(response.message.text), response.message.code));
            }
            return Future.of(response as T);
        });
}

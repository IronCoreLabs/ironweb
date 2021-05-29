import Future from "futurejs";
import SDKError from "../lib/SDKError";
import {ErrorResponse, RequestMessage, ResponseMessage} from "../WorkerMessageTypes";
import worker from "./WorkerLoader";

class WorkerMessenger {
    readonly worker: Worker;
    callbackCount = 0;
    callbacks: {[key: string]: (data: ResponseMessage) => void} = {};
    constructor(workerInstance: Worker) {
        this.worker = workerInstance;
        worker.addEventListener("message", this.processMessage, false);
    }

    /**
     * Post request message to child iFrame
     * @param {RequestMessage} data         RequestMessage to post to child iFrame
     * @param {Uint8Array[]}   transferList List of Uint8Arrays to transfer to frame
     */
    postMessageToWorker(data: RequestMessage, transferList: Uint8Array[] = []) {
        const message: WorkerEvent<RequestMessage> = {
            replyID: this.callbackCount++,
            data,
        };
        this.worker.postMessage(message, transferList.map((intByteArray) => intByteArray.buffer));
        return new Future<SDKError, ResponseMessage>((_, resolve) => {
            this.callbacks[message.replyID] = resolve;
        });
    }

    /**
     * Process a received message into the parent window
     * @param {MessageEvent} event Window postMessage event object
     */
    processMessage = (event: MessageEvent) => {
        const {data, replyID} = event.data as WorkerEvent<ResponseMessage>;
        const callback = this.callbacks[replyID];
        if (callback) {
            delete this.callbacks[replyID];
            callback(data);
        }
    };
}

export const messenger = new WorkerMessenger(worker);

/**
 * Type guard to check if returned message is an error message type
 * @param {ResponseMessage} response ResponseMessage instance to check
 */
function isErrorResponse(response: ResponseMessage): response is ErrorResponse {
    return response.type === "ERROR_RESPONSE";
}

export function sendMessage<T extends ResponseMessage>(payload: RequestMessage, transferList?: Uint8Array[]): Future<SDKError, T> {
    return messenger.postMessageToWorker(payload, transferList).flatMap((response) => {
        //Handle all error messages generically here. Convert the message details back into an error object and reject the Future
        if (isErrorResponse(response)) {
            return Future.reject(new SDKError(new Error(response.message.text), response.message.code));
        }
        return Future.of(response as T);
    });
}

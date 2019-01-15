import Future from "futurejs";
import {RequestMessage, ResponseMessage, ErrorResponse, GenerateRandomBytesFrameRequest, GenerateRandomBytesWorkerResponse} from "../WorkerMessageTypes";
import SDKError from "../lib/SDKError";
import worker from "./WorkerLoader";

const nativeCrypto: Crypto = (window as any).msCrypto || window.crypto;

class WorkerMessenger {
    readonly worker: Worker;
    callbackCount: number = 0;
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
        const {data, replyID} = event.data as WorkerEvent<ResponseMessage | GenerateRandomBytesFrameRequest>;
        if (data.type === "RANDOM_BYTES_REQUEST") {
            return this.generateRandomBytesForWorker(replyID, data.message.size);
        }

        const callback = this.callbacks[replyID];
        if (callback) {
            delete this.callbacks[replyID];
            callback(data);
        }
    };

    /**
     * Generate a requested amount of random bytes for when the web worker can't generate it's own random bytes
     * @param {number} replyID ID of random byte request
     * @param {number} size    Number of random bytes to generate
     */
    generateRandomBytesForWorker(replyID: number, size: number) {
        const payload: GenerateRandomBytesWorkerResponse = {
            type: "RANDOM_BYTES_RESPONSE",
            message: {
                bytes: nativeCrypto.getRandomValues(new Uint8Array(size)),
            },
        };
        this.worker.postMessage({
            replyID,
            data: payload,
        });
    }
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

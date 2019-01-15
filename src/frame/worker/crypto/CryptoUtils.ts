import Future from "futurejs";
import {GenerateRandomBytesFrameRequest, GenerateRandomBytesWorkerResponse} from "../../../WorkerMessageTypes";
declare function postMessage(message: any): void;

const nativeCrypto: Crypto = (self as any).msCrypto || (self as any).crypto;
//Listen to messages from the parent window to see if we've gotten back our random bytes
self.addEventListener("message", handleMainThreadMessage, false);
//A callback counter to keep track of the right callbacks for the right requests
let messageCounter = 0;
//Map of callback IDs to callback functions
const callbacks: {[key: number]: (data: Uint8Array) => void} = {};

/**
 * Post a message to the main thread asking for the provided size of bytes. Returns a future whose response callback is
 * stored off in the callbacks object so that we can invoke it when we get a response.
 * @param {number} size Number of random bytes to generate
 */
function askMainThreadForBytes(size: number) {
    const message: WorkerEvent<GenerateRandomBytesFrameRequest> = {
        replyID: messageCounter++,
        data: {
            type: "RANDOM_BYTES_REQUEST",
            message: {size},
        },
    };
    postMessage(message);
    return new Future<Error, Uint8Array>((_, resolve) => {
        callbacks[message.replyID] = resolve;
    });
}

/**
 * Handle response from main thread. Filters out messages to only random byte responses. Looks up the proper callback based on
 * the ID in the message and invokes the proper callback with the random bytes. Also deletes the Future callback it so we don't expose a memory leak.
 * @param {MessageEvent} event Parent window message event
 */
function handleMainThreadMessage(event: MessageEvent) {
    if (!event || !event.data) {
        return;
    }
    const {data, replyID} = event.data as WorkerEvent<GenerateRandomBytesWorkerResponse>;
    if (data.type === "RANDOM_BYTES_RESPONSE") {
        //This is the only message type we care about
        const callback = callbacks[replyID];

        if (callback) {
            delete callbacks[replyID];
            callback(data.message.bytes);
        }
    }
}

/**
 * Wrapper around the possibly prefixed crypto subtle API to use.
 */
export function getCryptoSubtleApi(): SubtleCrypto {
    return nativeCrypto && nativeCrypto.subtle;
}

/**
 * Generate random bytes. Wrapped up so we can handle the case where the WebWorker doesn't have access to the web crypto operations. In
 * that case we have to request back to the parent window to generate our bytes, then wait for a response which is why this returns a Future.
 * @param {number} size Number of bytes to generate
 */
export function generateRandomBytes(size: number): Future<Error, Uint8Array> {
    if (nativeCrypto && typeof nativeCrypto.getRandomValues === "function") {
        return Future.of(nativeCrypto.getRandomValues(new Uint8Array(size)));
    }
    return askMainThreadForBytes(size);
}

/**
 * Determine if we can use the browsers native crypto library
 */
export function isNativeCryptoSupported() {
    return getCryptoSubtleApi() !== undefined;
}

/* eslint-disable */

import "jest-extended";

/**
 * JS-Dom Mocks
 *
 * Various things don't exist in the js-dom environment, so we mock out those things here
 */

class MessageChannel {
    private port1: any;
    constructor() {
        const messagePort = {
            start: () => null,
            addEventListener: () => null,
        };
        this.port1 = messagePort;
    }
    port() {
        return this.port1;
    }
}
class Worker {
    public url: string;
    public onmessage: any;
    constructor(url: string) {
        this.url = url;
        this.onmessage = () => {};
    }
    postMessage(msg: string) {
        this.onmessage(msg);
    }
    addEventListener() {}
}

// Use Node's real WebCrypto subtle for hardware-accelerated AES-CTR in streaming tests,
// but keep mock stubs for importKey/deriveKey that existing tests expect to override per-test.
const {webcrypto: nodeWebCrypto} = require("crypto");
const realSubtle = nodeWebCrypto.subtle;

const WebCryptoSubtle = {
    // Delegate to Node's real WebCrypto. Individual tests that need mocks override via jest.spyOn.
    importKey: realSubtle.importKey.bind(realSubtle),
    encrypt: realSubtle.encrypt.bind(realSubtle),
    decrypt: realSubtle.decrypt.bind(realSubtle),
    deriveKey() {
        return {
            type: "secret",
            algorithm: {name: "AES-GCM", length: 256},
        };
    },
};

const WebCrypto = {
    getRandomValues(arr: Uint8Array) {
        //Mock out the getRandomValues method that doesn't exist for Jest with some "randomness"
        for (let i = 0; i < arr.length; i++) {
            arr.set([Math.floor(Math.random() * 255)], i);
        }
        return arr;
    },
    subtle: WebCryptoSubtle,
};

(window as any).Worker = Worker;
(window as any).MessageChannel = MessageChannel;
(window as any).crypto = WebCrypto;
// @noble/ciphers/webcrypto reads from globalThis.crypto
(globalThis as any).crypto = WebCrypto;

// Web Streams API is available in Node.js but not in jsdom's window
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webStreams = require("stream/web");
(window as any).ReadableStream = webStreams.ReadableStream;
(window as any).WritableStream = webStreams.WritableStream;
(window as any).TransformStream = webStreams.TransformStream;

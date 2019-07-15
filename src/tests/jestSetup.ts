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

const WebCryptoSubtle = {
    importKey() {
        return Promise.resolve(new Uint8Array(32));
    },
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

import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import Future from "futurejs";

export interface TransformKeyGrant {
    transformKey: TransformKey;
    publicKey: PublicKey<string>;
    id: string;
}

/**
 * Create a Promise to dynamically import the Recrypt WASM library. We kick off this Promise as soon as possible so that hopefully the
 * library is fully loaded by the time we attempt to make a call into the library.
 */
const recrypt: Promise<typeof import("./RecryptWasm")> = import(/* webpackChunkName:"recryptwasm" */ "./RecryptWasm");

/**
 * Export a method which wraps our Recrypt library Promise within a Future which will resolve when the library
 * is successfully loaded.
 */
export default function loadRecrypt() {
        return Future.tryP(() => recrypt)
    .map((shim) => {
        shim.instantiateApi();
        return shim;
    });
}

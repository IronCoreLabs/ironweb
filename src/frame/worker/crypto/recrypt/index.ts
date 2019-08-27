import {TransformKey} from "@ironcorelabs/recrypt-wasm-binding";
import Future from "futurejs";
import {generateRandomBytes, getCryptoSubtleApi} from "../CryptoUtils";

const WASM_RAND_SEED_LENGTH = 32;

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
 * MS Edge can't generate random numbers in a WebWorker and therefore we have to manually pass in a seed to the WASM
 * module so it can generate random numbers properly. We generate these random numbers regardless, but we'll only ever
 * use them if the WebCrypto API is unavailable.
 */
const randomSeed = generateRandomBytes(WASM_RAND_SEED_LENGTH).toPromise();

/**
 * Export a method which wraps our Recrypt library Promise within a Future which will resolve when the library
 * is successfully loaded.
 */
export default function loadRecrypt() {
    return Future.gather2(Future.tryP(() => recrypt), Future.tryP(() => randomSeed)).map(([shim, seed]) => {
        shim.instantiateApi(getCryptoSubtleApi() ? undefined : seed);
        return shim;
    });
}

import {ctr} from "@noble/ciphers/webcrypto";
import {ghash} from "@noble/ciphers/_polyval";
import {equalBytes} from "@noble/ciphers/utils";
import Future from "futurejs";
import {concatArrayBuffers} from "../../../../lib/Utils";
import {CryptoConstants} from "../../../../Constants";

/**
 * See https://github.com/IronCoreLabs/ironoxide/blob/main/src/crypto/streaming.rs for a nice graphical explainer of
 * the process being executed here.
 */
const BLOCK_SIZE = 16;
const TAG_LENGTH = 16;

/**
 * Build a GCM counter block: IV (12 bytes) || counterValue (4 bytes big-endian)
 */
function buildCounterBlock(iv: Uint8Array, counterValue: number): Uint8Array {
    const block = new Uint8Array(BLOCK_SIZE);
    block.set(iv, 0);
    new DataView(block.buffer).setUint32(CryptoConstants.IV_LENGTH, counterValue, false);
    return block;
}

/**
 * Compute the GHASH key (H) and encrypted J0 block needed for AES-GCM.
 */
async function initGcmState(key: Uint8Array, iv: Uint8Array): Promise<{H: Uint8Array; encryptedJ0: Uint8Array}> {
    const zeroBlock = new Uint8Array(BLOCK_SIZE);

    // H = AES_K(0^128): encrypt zero block with CTR at counter=0^128
    const H = await ctr(key, zeroBlock).encrypt(zeroBlock);

    // encryptedJ0 = AES_K(IV || 0x00000001)
    const j0 = buildCounterBlock(iv, 1);
    const encryptedJ0 = await ctr(key, j0).encrypt(new Uint8Array(BLOCK_SIZE));

    return {H, encryptedJ0};
}

/**
 * Shared AES-GCM streaming state. Decomposes AES-GCM into AES-CTR
 * (hardware-accelerated via @noble/ciphers/webcrypto) + GHASH (pure-JS
 * via @noble/ciphers/_polyval).
 *
 * Manages: key, IV, GHASH instance, CTR counter offset, the held-back
 * buffer for GHASH block alignment, and ciphertext length tracking.
 */
class StreamingAesGcmState {
    readonly key: Uint8Array;
    readonly iv: Uint8Array;
    readonly ghashInstance: ReturnType<typeof ghash.create>;
    readonly encryptedJ0: Uint8Array;
    heldBack: Uint8Array;
    ctrBlockOffset: number;
    ciphertextLen: number;

    constructor(key: Uint8Array, iv: Uint8Array, H: Uint8Array, encryptedJ0: Uint8Array) {
        this.key = key;
        this.iv = iv;
        this.heldBack = new Uint8Array(0);
        this.ctrBlockOffset = 0;
        this.ciphertextLen = 0;
        this.encryptedJ0 = encryptedJ0;
        this.ghashInstance = ghash.create(H);
    }

    /** Build the AES-CTR counter block for the current offset. */
    buildCounter(): Uint8Array {
        return buildCounterBlock(this.iv, 2 + this.ctrBlockOffset);
    }

    /** Feed ciphertext to GHASH and track total ciphertext length. */
    ghashUpdate(ciphertext: Uint8Array): void {
        this.ghashInstance.update(ciphertext);
        this.ciphertextLen += ciphertext.length;
    }

    /** Advance the CTR block counter after processing data. */
    advanceCounter(bytesProcessed: number): void {
        this.ctrBlockOffset += bytesProcessed / BLOCK_SIZE;
    }

    /** Compute the final GCM auth tag from GHASH state. */
    computeTag(): Uint8Array {
        // Length block: [AAD_len_bits(64) || ciphertext_len_bits(64)] big-endian
        const lengthBlock = new Uint8Array(BLOCK_SIZE);
        const bits = this.ciphertextLen * 8;
        const view = new DataView(lengthBlock.buffer);
        view.setUint32(8, Math.floor(bits / 0x100000000), false);
        view.setUint32(12, bits % 0x100000000, false);
        this.ghashInstance.update(lengthBlock);

        const ghashOutput = this.ghashInstance.digest();

        const tag = new Uint8Array(TAG_LENGTH);
        for (let i = 0; i < TAG_LENGTH; i++) {
            tag[i] = ghashOutput[i] ^ this.encryptedJ0[i];
        }
        return tag;
    }
}

/**
 * Streaming AES-GCM decryptor as a TransformStream.
 *
 * Decrypted plaintext is emitted incrementally via the transform callback.
 * The auth tag is verified in flush(). If the tag is invalid, flush() throws,
 * which errors the stream — propagating through pipeTo() to abort any destination.
 *
 * The last 16 bytes of the ciphertext stream are always held back as the potential
 * auth tag. Additionally, data is block-aligned before feeding to GHASH to avoid
 * @noble/ciphers' GHASH zero-padding partial blocks prematurely between update() calls.
 */
export const StreamingDecryptor = {
    create(key: Uint8Array, iv: Uint8Array): Future<Error, TransformStream<Uint8Array, Uint8Array>> {
        return Future.tryP(async () => {
            const {H, encryptedJ0} = await initGcmState(key, iv);
            const s = new StreamingAesGcmState(key, iv, H, encryptedJ0);
            return new TransformStream<Uint8Array, Uint8Array>({
                async transform(chunk, controller) {
                    const combined = concatArrayBuffers(s.heldBack, chunk);

                    if (combined.length <= TAG_LENGTH) {
                        s.heldBack = combined;
                        return;
                    }

                    const available = combined.length - TAG_LENGTH;
                    const length_of_bytes_aligned_to_block_windows = available - (available % BLOCK_SIZE);

                    if (length_of_bytes_aligned_to_block_windows === 0) {
                        s.heldBack = combined;
                        return;
                    }

                    const toProcess = combined.subarray(0, length_of_bytes_aligned_to_block_windows);
                    s.heldBack = new Uint8Array(combined.subarray(length_of_bytes_aligned_to_block_windows));

                    // GHASH ciphertext BEFORE decryption
                    s.ghashUpdate(toProcess);

                    const plaintext = await ctr(s.key, s.buildCounter()).decrypt(toProcess);
                    s.advanceCounter(toProcess.length);

                    controller.enqueue(plaintext);
                },
                async flush(controller) {
                    if (s.heldBack.length < TAG_LENGTH) {
                        throw new Error("Insufficient data: stream ended before auth tag");
                    }

                    const remainderLen = s.heldBack.length - TAG_LENGTH;
                    const remainder = s.heldBack.subarray(0, remainderLen);
                    const tag = s.heldBack.subarray(remainderLen);

                    if (remainderLen > 0) {
                        s.ghashUpdate(remainder);
                        const decryptedRemainder = await ctr(s.key, s.buildCounter()).decrypt(remainder);
                        controller.enqueue(decryptedRemainder);
                    }

                    if (!equalBytes(s.computeTag(), tag)) {
                        throw new Error("AES-GCM auth tag verification failed");
                    }
                },
            });
        });
    },
};

/**
 * Streaming AES-GCM encryptor as a TransformStream.
 *
 * Ciphertext is emitted incrementally via the transform callback. The auth
 * tag is computed and appended in flush().
 *
 * Unlike the decryptor, no tag reservation is needed — the held-back buffer
 * only handles GHASH alignment (0–15 bytes).
 *
 * Key GHASH ordering difference: encrypt FIRST (plaintext → ciphertext via
 * AES-CTR), THEN feed the ciphertext to GHASH.
 */
export const StreamingEncryptor = {
    create(key: Uint8Array, iv: Uint8Array): Future<Error, TransformStream<Uint8Array, Uint8Array>> {
        return Future.tryP(async () => {
            const {H, encryptedJ0} = await initGcmState(key, iv);
            const s = new StreamingAesGcmState(key, iv, H, encryptedJ0);
            return new TransformStream<Uint8Array, Uint8Array>({
                async transform(chunk, controller) {
                    const combined = concatArrayBuffers(s.heldBack, chunk);
                    const length_of_bytes_aligned_to_block_windows = combined.length - (combined.length % BLOCK_SIZE);

                    if (length_of_bytes_aligned_to_block_windows === 0) {
                        s.heldBack = combined;
                        return;
                    }

                    const toProcess = combined.subarray(0, length_of_bytes_aligned_to_block_windows);
                    s.heldBack = new Uint8Array(combined.subarray(length_of_bytes_aligned_to_block_windows));

                    // Encrypt FIRST, then GHASH the ciphertext
                    const ciphertext = await ctr(s.key, s.buildCounter()).encrypt(toProcess);
                    s.advanceCounter(toProcess.length);
                    s.ghashUpdate(ciphertext);

                    controller.enqueue(ciphertext);
                },
                async flush(controller) {
                    let lastCiphertext = new Uint8Array(0);

                    if (s.heldBack.length > 0) {
                        lastCiphertext = await ctr(s.key, s.buildCounter()).encrypt(s.heldBack);
                        s.ghashUpdate(lastCiphertext);
                    }

                    controller.enqueue(concatArrayBuffers(lastCiphertext, s.computeTag()));
                },
            });
        });
    },
};

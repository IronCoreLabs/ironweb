import {ctr} from "@noble/ciphers/webcrypto";
// @noble/ciphers exports _polyval in its package.json "exports" map
import {ghash} from "@noble/ciphers/_polyval";

const BLOCK_SIZE = 16;
const TAG_LENGTH = 16;

/**
 * Build a GCM counter block: IV (12 bytes) || counterValue (4 bytes big-endian)
 */
function buildCounterBlock(iv: Uint8Array, counterValue: number): Uint8Array {
    const block = new Uint8Array(16);
    block.set(iv, 0);
    new DataView(block.buffer).setUint32(12, counterValue, false);
    return block;
}

/**
 * Constant-time comparison of two byte arrays. Returns true if equal.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

/**
 * Concatenate two Uint8Arrays into a new one.
 */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
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
 * Common interface for streaming AES-GCM processors (both encrypt and decrypt).
 * Enables a single generic stream loop to drive either operation.
 */
export interface StreamProcessor {
    processChunk(chunk: Uint8Array): Promise<Uint8Array>;
    finalize(): Promise<Uint8Array>;
}

/**
 * Base class for streaming AES-GCM encrypt/decrypt. Decomposes AES-GCM into
 * AES-CTR (hardware-accelerated via @noble/ciphers/webcrypto) + GHASH (pure-JS
 * via @noble/ciphers/_polyval).
 *
 * Manages all shared GCM state: key, IV, GHASH instance, CTR counter offset,
 * the held-back buffer for GHASH block alignment, and ciphertext length tracking.
 * Subclasses implement processChunk() and finalize() with their encrypt/decrypt
 * specific logic.
 */
abstract class StreamingCipher implements StreamProcessor {
    protected readonly key: Uint8Array;
    protected readonly iv: Uint8Array;
    protected readonly ghashInstance: ReturnType<typeof ghash.create>;
    protected readonly encryptedJ0: Uint8Array;
    protected heldBack: Uint8Array;
    protected ctrBlockOffset: number;
    protected ciphertextLen: number;

    protected constructor(key: Uint8Array, iv: Uint8Array, H: Uint8Array, encryptedJ0: Uint8Array) {
        this.key = key;
        this.iv = iv;
        this.heldBack = new Uint8Array(0);
        this.ctrBlockOffset = 0;
        this.ciphertextLen = 0;
        this.encryptedJ0 = encryptedJ0;
        this.ghashInstance = ghash.create(H);
    }

    abstract processChunk(chunk: Uint8Array): Promise<Uint8Array>;
    abstract finalize(): Promise<Uint8Array>;

    /** Build the AES-CTR counter block for the current offset. */
    protected buildCounter(): Uint8Array {
        return buildCounterBlock(this.iv, 2 + this.ctrBlockOffset);
    }

    /** Feed ciphertext to GHASH and track total ciphertext length. */
    protected ghashUpdate(ciphertext: Uint8Array): void {
        this.ghashInstance.update(ciphertext);
        this.ciphertextLen += ciphertext.length;
    }

    /** Advance the CTR block counter after processing data. */
    protected advanceCounter(bytesProcessed: number): void {
        this.ctrBlockOffset += bytesProcessed / BLOCK_SIZE;
    }

    /** Compute the final GCM auth tag from GHASH state. */
    protected computeTag(): Uint8Array {
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
 * Streaming AES-GCM decryptor.
 *
 * Decrypted plaintext is emitted incrementally via processChunk(). The auth tag
 * is verified in finalize(). If the tag is invalid, finalize() throws.
 *
 * The last 16 bytes of the ciphertext stream are always held back as the potential
 * auth tag. Additionally, data is block-aligned before feeding to GHASH to avoid
 * @noble/ciphers' GHASH zero-padding partial blocks prematurely between update() calls.
 */
export class StreamingDecryptor extends StreamingCipher {
    static async create(key: Uint8Array, iv: Uint8Array): Promise<StreamingDecryptor> {
        const {H, encryptedJ0} = await initGcmState(key, iv);
        return new StreamingDecryptor(key, iv, H, encryptedJ0);
    }

    async processChunk(chunk: Uint8Array): Promise<Uint8Array> {
        const combined = concat(this.heldBack, chunk);

        if (combined.length <= TAG_LENGTH) {
            this.heldBack = combined;
            return new Uint8Array(0);
        }

        const available = combined.length - TAG_LENGTH;
        const aligned = available - (available % BLOCK_SIZE);

        if (aligned === 0) {
            this.heldBack = combined;
            return new Uint8Array(0);
        }

        const toProcess = combined.subarray(0, aligned);
        this.heldBack = new Uint8Array(combined.subarray(aligned));

        // GHASH ciphertext BEFORE decryption
        this.ghashUpdate(toProcess);

        const plaintext = await ctr(this.key, this.buildCounter()).decrypt(toProcess);
        this.advanceCounter(toProcess.length);

        return plaintext;
    }

    async finalize(): Promise<Uint8Array> {
        if (this.heldBack.length < TAG_LENGTH) {
            throw new Error("Insufficient data: stream ended before auth tag");
        }

        const remainderLen = this.heldBack.length - TAG_LENGTH;
        const remainder = this.heldBack.subarray(0, remainderLen);
        const tag = this.heldBack.subarray(remainderLen);

        let decryptedRemainder = new Uint8Array(0);

        if (remainderLen > 0) {
            this.ghashUpdate(remainder);
            decryptedRemainder = await ctr(this.key, this.buildCounter()).decrypt(remainder);
        }

        if (!constantTimeEqual(this.computeTag(), tag)) {
            throw new Error("AES-GCM auth tag verification failed");
        }

        return decryptedRemainder;
    }
}

/**
 * Streaming AES-GCM encryptor.
 *
 * Ciphertext is emitted incrementally via processChunk(). The auth tag is
 * computed and appended in finalize().
 *
 * Unlike the decryptor, no tag reservation is needed — the held-back buffer
 * only handles GHASH alignment (0–15 bytes).
 *
 * Key GHASH ordering difference: encrypt FIRST (plaintext → ciphertext via
 * AES-CTR), THEN feed the ciphertext to GHASH.
 */
export class StreamingEncryptor extends StreamingCipher {
    static async create(key: Uint8Array, iv: Uint8Array): Promise<StreamingEncryptor> {
        const {H, encryptedJ0} = await initGcmState(key, iv);
        return new StreamingEncryptor(key, iv, H, encryptedJ0);
    }

    async processChunk(chunk: Uint8Array): Promise<Uint8Array> {
        const combined = concat(this.heldBack, chunk);
        const aligned = combined.length - (combined.length % BLOCK_SIZE);

        if (aligned === 0) {
            this.heldBack = combined;
            return new Uint8Array(0);
        }

        const toProcess = combined.subarray(0, aligned);
        this.heldBack = new Uint8Array(combined.subarray(aligned));

        // Encrypt FIRST, then GHASH the ciphertext
        const ciphertext = await ctr(this.key, this.buildCounter()).encrypt(toProcess);
        this.advanceCounter(toProcess.length);
        this.ghashUpdate(ciphertext);

        return ciphertext;
    }

    async finalize(): Promise<Uint8Array> {
        let lastCiphertext = new Uint8Array(0);

        if (this.heldBack.length > 0) {
            lastCiphertext = await ctr(this.key, this.buildCounter()).encrypt(this.heldBack);
            this.ghashUpdate(lastCiphertext);
        }

        return concat(lastCiphertext, this.computeTag());
    }
}

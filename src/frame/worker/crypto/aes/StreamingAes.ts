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
 * Streaming AES-GCM decryptor that decomposes AES-GCM into AES-CTR + GHASH.
 *
 * AES-CTR uses the WebCrypto API (hardware-accelerated) via @noble/ciphers/webcrypto.
 * GHASH uses the pure-JS implementation from @noble/ciphers/_polyval (no WebCrypto
 * equivalent exists for standalone GHASH).
 *
 * Decrypted plaintext is emitted incrementally via processChunk(). The auth tag
 * is verified in finalize(). If the tag is invalid, finalize() throws.
 *
 * The last 16 bytes of the ciphertext stream are always held back as the potential
 * auth tag. Additionally, data is block-aligned before feeding to GHASH to avoid
 * @noble/ciphers' GHASH zero-padding partial blocks prematurely between update() calls.
 */
export class StreamingDecryptor {
    private readonly key: Uint8Array;
    private readonly iv: Uint8Array;
    private readonly ghashInstance: ReturnType<typeof ghash.create>;
    private readonly encryptedJ0: Uint8Array;
    private heldBack: Uint8Array;
    private ctrBlockOffset: number;
    private ciphertextLen: number;

    private constructor(key: Uint8Array, iv: Uint8Array, H: Uint8Array, encryptedJ0: Uint8Array) {
        this.key = key;
        this.iv = iv;
        this.heldBack = new Uint8Array(0);
        this.ctrBlockOffset = 0;
        this.ciphertextLen = 0;
        this.encryptedJ0 = encryptedJ0;
        this.ghashInstance = ghash.create(H);
    }

    /**
     * Create a new StreamingDecryptor. Async because it derives the GHASH key (H) and
     * encrypted J0 block via WebCrypto AES-CTR.
     */
    static async create(key: Uint8Array, iv: Uint8Array): Promise<StreamingDecryptor> {
        const zeroBlock = new Uint8Array(BLOCK_SIZE);

        // H = AES_K(0^128): encrypt zero block with CTR at counter=0^128
        // Keystream = AES_K(0^128), XOR with 0^128 = AES_K(0^128)
        const H = await ctr(key, zeroBlock).encrypt(zeroBlock);

        // encryptedJ0 = AES_K(IV || 0x00000001)
        const j0 = buildCounterBlock(iv, 1);
        const encryptedJ0 = await ctr(key, j0).encrypt(new Uint8Array(BLOCK_SIZE));

        return new StreamingDecryptor(key, iv, H, encryptedJ0);
    }

    /**
     * Process a chunk of encrypted data (ciphertext || tag bytes).
     * Returns decrypted plaintext for the processable portion of this chunk.
     * Always holds back at least 16 bytes (potential auth tag) plus any
     * remainder needed for GHASH block alignment.
     */
    async processChunk(chunk: Uint8Array): Promise<Uint8Array> {
        const combined = concat(this.heldBack, chunk);

        // Must always hold back at least TAG_LENGTH bytes
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

        // Update GHASH with ciphertext BEFORE decryption
        this.ghashInstance.update(toProcess);
        this.ciphertextLen += toProcess.length;

        // Decrypt via AES-CTR (hardware-accelerated) starting at counter = IV || (2 + blockOffset)
        const counter = buildCounterBlock(this.iv, 2 + this.ctrBlockOffset);
        const plaintext = await ctr(this.key, counter).decrypt(toProcess);
        this.ctrBlockOffset += toProcess.length / BLOCK_SIZE;

        return plaintext;
    }

    /**
     * Finalize decryption: verify the auth tag and return any remaining plaintext.
     * Throws if the auth tag does not match (data was tampered with or wrong key).
     */
    async finalize(): Promise<Uint8Array> {
        if (this.heldBack.length < TAG_LENGTH) {
            throw new Error("Insufficient data: stream ended before auth tag");
        }

        const remainderLen = this.heldBack.length - TAG_LENGTH;
        const remainder = this.heldBack.subarray(0, remainderLen);
        const tag = this.heldBack.subarray(remainderLen);

        let decryptedRemainder = new Uint8Array(0);

        if (remainderLen > 0) {
            // Feed remainder to GHASH (noble-ciphers zero-pads the partial block internally)
            this.ghashInstance.update(remainder);
            this.ciphertextLen += remainderLen;

            // Decrypt remainder via AES-CTR (CTR handles partial blocks correctly)
            const counter = buildCounterBlock(this.iv, 2 + this.ctrBlockOffset);
            decryptedRemainder = await ctr(this.key, counter).decrypt(remainder);
        }

        // Length block: [AAD_len_bits(64) || ciphertext_len_bits(64)] big-endian
        // No AAD, so first 8 bytes are zero
        const lengthBlock = new Uint8Array(BLOCK_SIZE);
        const bits = this.ciphertextLen * 8;
        const view = new DataView(lengthBlock.buffer);
        view.setUint32(8, Math.floor(bits / 0x100000000), false);
        view.setUint32(12, bits % 0x100000000, false);
        this.ghashInstance.update(lengthBlock);

        const ghashOutput = this.ghashInstance.digest();

        // Tag = GHASH_output XOR AES_K(J0)
        const computedTag = new Uint8Array(TAG_LENGTH);
        for (let i = 0; i < TAG_LENGTH; i++) {
            computedTag[i] = ghashOutput[i] ^ this.encryptedJ0[i];
        }

        if (!constantTimeEqual(computedTag, tag)) {
            throw new Error("AES-GCM auth tag verification failed");
        }

        return decryptedRemainder;
    }
}

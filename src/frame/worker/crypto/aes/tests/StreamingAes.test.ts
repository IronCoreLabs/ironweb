import {gcm} from "@noble/ciphers/aes";
import {StreamingDecryptor} from "../StreamingAes";

/**
 * Helper: split a Uint8Array into chunks of the given size.
 */
function chunkArray(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.subarray(i, Math.min(i + chunkSize, data.length)));
    }
    return chunks;
}

/**
 * Helper: concatenate multiple Uint8Arrays.
 */
function concatAll(...arrays: Uint8Array[]): Uint8Array {
    const length = arrays.reduce((sum, a) => sum + a.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const a of arrays) {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}

/**
 * Helper: encrypt with standard AES-256-GCM using @noble/ciphers, returning ciphertext || tag.
 */
function gcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
    return gcm(key, iv).encrypt(plaintext);
}

/**
 * Helper: streaming-decrypt the given data through StreamingDecryptor with specified chunk size.
 */
async function streamingDecrypt(key: Uint8Array, iv: Uint8Array, encrypted: Uint8Array, chunkSize: number): Promise<Uint8Array> {
    const decryptor = await StreamingDecryptor.create(key, iv);
    const chunks = chunkArray(encrypted, chunkSize);
    const outputParts: Uint8Array[] = [];
    for (const chunk of chunks) {
        const result = await decryptor.processChunk(chunk);
        if (result.length > 0) {
            outputParts.push(result);
        }
    }
    const finalPart = await decryptor.finalize();
    if (finalPart.length > 0) {
        outputParts.push(finalPart);
    }
    return concatAll(...outputParts);
}

describe("StreamingDecryptor", () => {
    // Fixed key and IV for deterministic tests
    const key = new Uint8Array(32);
    key.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
    const iv = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);

    describe("roundtrip with standard GCM", () => {
        it("decrypts a single-byte document", async () => {
            const plaintext = new Uint8Array([42]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 15-byte document (less than one block)", async () => {
            const plaintext = new Uint8Array(15);
            for (let i = 0; i < 15; i++) plaintext[i] = i + 1;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 16-byte document (exactly one block)", async () => {
            const plaintext = new Uint8Array(16);
            for (let i = 0; i < 16; i++) plaintext[i] = i + 1;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 17-byte document (one block + 1 byte)", async () => {
            const plaintext = new Uint8Array(17);
            for (let i = 0; i < 17; i++) plaintext[i] = i + 1;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a multi-block document", async () => {
            const plaintext = new Uint8Array(1000);
            for (let i = 0; i < plaintext.length; i++) plaintext[i] = i % 256;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 256);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a large document (64KB)", async () => {
            const plaintext = new Uint8Array(65536);
            for (let i = 0; i < plaintext.length; i++) plaintext[i] = i % 256;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 8192);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("various chunk sizes", () => {
        const plaintext = new Uint8Array(100);
        for (let i = 0; i < 100; i++) plaintext[i] = i;
        let encrypted: Uint8Array;

        beforeAll(() => {
            encrypted = gcmEncrypt(key, iv, plaintext);
        });

        it("handles 1-byte chunks", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, 1);
            expect(decrypted).toEqual(plaintext);
        });

        it("handles 15-byte chunks", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, 15);
            expect(decrypted).toEqual(plaintext);
        });

        it("handles 16-byte chunks", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, 16);
            expect(decrypted).toEqual(plaintext);
        });

        it("handles 17-byte chunks", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, 17);
            expect(decrypted).toEqual(plaintext);
        });

        it("handles 37-byte chunks (prime-ish, non-aligned)", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, 37);
            expect(decrypted).toEqual(plaintext);
        });

        it("handles entire input as a single chunk", async () => {
            const decrypted = await streamingDecrypt(key, iv, encrypted, encrypted.length);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("auth tag verification", () => {
        it("throws when a ciphertext byte is tampered with", async () => {
            const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const tampered = new Uint8Array(encrypted);
            tampered[0] ^= 0xff;

            const decryptor = await StreamingDecryptor.create(key, iv);
            await decryptor.processChunk(tampered);
            await expect(decryptor.finalize()).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("throws when a tag byte is tampered with", async () => {
            const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const tampered = new Uint8Array(encrypted);
            tampered[tampered.length - 1] ^= 0x01;

            const decryptor = await StreamingDecryptor.create(key, iv);
            await decryptor.processChunk(tampered);
            await expect(decryptor.finalize()).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("throws when using the wrong key", async () => {
            const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const wrongKey = new Uint8Array(32);
            wrongKey.set([99, 98, 97]);

            const decryptor = await StreamingDecryptor.create(wrongKey, iv);
            await decryptor.processChunk(encrypted);
            await expect(decryptor.finalize()).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("throws when using the wrong IV", async () => {
            const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const wrongIv = new Uint8Array(12);
            wrongIv.set([99, 98, 97]);

            const decryptor = await StreamingDecryptor.create(key, wrongIv);
            await decryptor.processChunk(encrypted);
            await expect(decryptor.finalize()).rejects.toThrow("AES-GCM auth tag verification failed");
        });
    });

    describe("edge cases", () => {
        it("decrypts an empty document (tag only)", async () => {
            const plaintext = new Uint8Array(0);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            expect(encrypted.length).toEqual(16);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("throws on insufficient data (less than 16 bytes)", async () => {
            const decryptor = await StreamingDecryptor.create(key, iv);
            await decryptor.processChunk(new Uint8Array(10));
            await expect(decryptor.finalize()).rejects.toThrow("Insufficient data");
        });

        it("handles data fed in many tiny 2-byte chunks", async () => {
            const plaintext = new Uint8Array(50);
            for (let i = 0; i < 50; i++) plaintext[i] = i * 3;
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 2);
            expect(decrypted).toEqual(plaintext);
        });
    });
});

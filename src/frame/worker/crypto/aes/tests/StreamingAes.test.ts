import {gcm} from "@noble/ciphers/aes";
import {StreamingDecryptor, StreamingEncryptor} from "../StreamingAes";
import {concatArrayBuffers} from "../../../../../lib/Utils";

function chunkArray(data: Uint8Array, chunkSize: number): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.subarray(i, Math.min(i + chunkSize, data.length)));
    }
    return chunks;
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
    return concatArrayBuffers(...outputParts);
}

/**
 * Helper: streaming-encrypt plaintext through StreamingEncryptor with specified chunk size.
 * Returns ciphertext || tag.
 */
async function streamingEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array, chunkSize: number): Promise<Uint8Array> {
    const encryptor = await StreamingEncryptor.create(key, iv);
    const chunks = chunkArray(plaintext, chunkSize);
    const outputParts: Uint8Array[] = [];
    for (const chunk of chunks) {
        const result = await encryptor.processChunk(chunk);
        if (result.length > 0) {
            outputParts.push(result);
        }
    }
    const finalPart = await encryptor.finalize();
    if (finalPart.length > 0) {
        outputParts.push(finalPart);
    }
    return concatArrayBuffers(...outputParts);
}

/**
 * Helper: build a plaintext of given size with deterministic content.
 */
function makePlaintext(size: number): Uint8Array {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) data[i] = i % 256;
    return data;
}

// Fixed key and IV for deterministic tests
const key = new Uint8Array(32);
key.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
const iv = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);

describe("StreamingDecryptor", () => {
    describe("roundtrip with standard GCM", () => {
        it("decrypts a single-byte document", async () => {
            const plaintext = new Uint8Array([42]);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 15-byte document (less than one block)", async () => {
            const plaintext = makePlaintext(15);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 16-byte document (exactly one block)", async () => {
            const plaintext = makePlaintext(16);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a 17-byte document (one block + 1 byte)", async () => {
            const plaintext = makePlaintext(17);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 64);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a multi-block document", async () => {
            const plaintext = makePlaintext(1000);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 256);
            expect(decrypted).toEqual(plaintext);
        });

        it("decrypts a large document (64KB)", async () => {
            const plaintext = makePlaintext(65536);
            const encrypted = gcmEncrypt(key, iv, plaintext);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 8192);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("various chunk sizes", () => {
        const plaintext = makePlaintext(100);
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

describe("StreamingEncryptor", () => {
    describe("roundtrip with standard GCM decrypt", () => {
        it("encrypts a single-byte document", async () => {
            const plaintext = new Uint8Array([42]);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 64);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });

        it("encrypts a 15-byte document (less than one block)", async () => {
            const plaintext = makePlaintext(15);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 64);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });

        it("encrypts a 16-byte document (exactly one block)", async () => {
            const plaintext = makePlaintext(16);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 64);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });

        it("encrypts a 17-byte document (one block + 1 byte)", async () => {
            const plaintext = makePlaintext(17);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 64);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });

        it("encrypts a multi-block document (1000 bytes)", async () => {
            const plaintext = makePlaintext(1000);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 256);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });

        it("encrypts a large document (64KB)", async () => {
            const plaintext = makePlaintext(65536);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 8192);
            const decrypted = gcm(key, iv).decrypt(encrypted);
            expect(new Uint8Array(decrypted)).toEqual(plaintext);
        });
    });

    describe("various chunk sizes", () => {
        const plaintext = makePlaintext(100);

        it("handles 1-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 1);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles 15-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 15);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles 16-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles 17-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 17);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles 37-byte chunks (prime-ish, non-aligned)", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 37);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles entire input as a single chunk", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, plaintext.length);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });

        it("handles many tiny 2-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 2);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(plaintext);
        });
    });

    describe("edge cases", () => {
        it("encrypts an empty document — finalize returns exactly 16 bytes (tag only)", async () => {
            const encrypted = await streamingEncrypt(key, iv, new Uint8Array(0), 64);
            expect(encrypted.length).toEqual(16);
            expect(new Uint8Array(gcm(key, iv).decrypt(encrypted))).toEqual(new Uint8Array(0));
        });
    });
});

describe("byte-for-byte compatibility", () => {
    const sizes = [0, 1, 15, 16, 17, 1000, 65536];

    for (const size of sizes) {
        it(`streaming output matches noble/ciphers gcm.encrypt for ${size}-byte doc`, async () => {
            const plaintext = makePlaintext(size);
            const chunkSize = size > 0 ? Math.max(1, Math.ceil(size / 7)) : 1;
            const streamingOutput = await streamingEncrypt(key, iv, plaintext, chunkSize);
            const standardOutput = gcmEncrypt(key, iv, plaintext);
            expect(streamingOutput).toEqual(standardOutput);
        });
    }
});

describe("streaming encrypt → streaming decrypt roundtrip", () => {
    describe("matching chunk sizes", () => {
        const sizes = [0, 1, 15, 16, 17, 1000, 65536];

        for (const size of sizes) {
            it(`roundtrips ${size}-byte document`, async () => {
                const plaintext = makePlaintext(size);
                const chunkSize = size > 0 ? 64 : 1;
                const encrypted = await streamingEncrypt(key, iv, plaintext, chunkSize);
                const decrypted = await streamingDecrypt(key, iv, encrypted, chunkSize);
                expect(decrypted).toEqual(plaintext);
            });
        }
    });

    describe("mismatched chunk sizes", () => {
        const plaintext = makePlaintext(200);

        it("encrypts in 7-byte chunks, decrypts in 13-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 7);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 13);
            expect(decrypted).toEqual(plaintext);
        });

        it("encrypts in 16-byte chunks, decrypts in 1-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 1);
            expect(decrypted).toEqual(plaintext);
        });

        it("encrypts in 1-byte chunks, decrypts in 16-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 1);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 16);
            expect(decrypted).toEqual(plaintext);
        });

        it("encrypts as single chunk, decrypts in 3-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, plaintext.length);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 3);
            expect(decrypted).toEqual(plaintext);
        });

        it("encrypts in 37-byte chunks, decrypts in 37-byte chunks", async () => {
            const encrypted = await streamingEncrypt(key, iv, plaintext, 37);
            const decrypted = await streamingDecrypt(key, iv, encrypted, 37);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("tamper detection through roundtrip", () => {
        it("detects tampering of first ciphertext byte", async () => {
            const plaintext = makePlaintext(50);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const tampered = new Uint8Array(encrypted);
            tampered[0] ^= 0xff;
            await expect(streamingDecrypt(key, iv, tampered, 64)).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("detects tampering of last ciphertext byte (before tag)", async () => {
            const plaintext = makePlaintext(50);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const tampered = new Uint8Array(encrypted);
            // Last byte before the 16-byte tag
            tampered[tampered.length - 17] ^= 0x01;
            await expect(streamingDecrypt(key, iv, tampered, 64)).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("detects tampering of auth tag", async () => {
            const plaintext = makePlaintext(50);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const tampered = new Uint8Array(encrypted);
            tampered[tampered.length - 1] ^= 0x01;
            await expect(streamingDecrypt(key, iv, tampered, 64)).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("rejects when decrypt uses wrong key", async () => {
            const plaintext = makePlaintext(50);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const wrongKey = new Uint8Array(32);
            wrongKey.set([99, 98, 97]);
            await expect(streamingDecrypt(wrongKey, iv, encrypted, 64)).rejects.toThrow("AES-GCM auth tag verification failed");
        });

        it("rejects when decrypt uses wrong IV", async () => {
            const plaintext = makePlaintext(50);
            const encrypted = await streamingEncrypt(key, iv, plaintext, 16);
            const wrongIv = new Uint8Array(12);
            wrongIv.set([99, 98, 97]);
            await expect(streamingDecrypt(key, wrongIv, encrypted, 64)).rejects.toThrow("AES-GCM auth tag verification failed");
        });
    });
});

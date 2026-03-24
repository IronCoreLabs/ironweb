import * as DocumentCrypto from "../DocumentCrypto";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as Recrypt from "../crypto/recrypt";
import {ErrorCodes} from "../../../Constants";
import {gcm} from "@noble/ciphers/aes";
import {concatArrayBuffers} from "../../../lib/Utils";

const documentSymmetricKey = new Uint8Array(32);
documentSymmetricKey.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
const iv = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
const recryptPlaintext = new Uint8Array(384);
const mockSigningKeys = TestUtils.getSigningKeyPair();

function readableStreamFrom(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(chunk);
            }
            controller.close();
        },
    });
}

function collectStream(): {writable: WritableStream<Uint8Array>; chunks: Uint8Array[]} {
    const chunks: Uint8Array[] = [];
    const writable = new WritableStream<Uint8Array>({
        write(chunk) {
            chunks.push(new Uint8Array(chunk));
        },
    });
    return {writable, chunks};
}

function mockRecryptForEncrypt() {
    jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.of<any>([recryptPlaintext, documentSymmetricKey]));
    jest.spyOn(Recrypt, "encryptPlaintextToList").mockReturnValue(Future.of<any>([]));
}

function mockRecryptForDecrypt() {
    jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>([recryptPlaintext, documentSymmetricKey]));
}

/**
 * Helper: streaming-encrypt then streaming-decrypt, verifying roundtrip produces identical plaintext.
 */
function streamingRoundtrip(plaintext: Uint8Array, inputChunks: Uint8Array[], done: jest.DoneCallback) {
    mockRecryptForEncrypt();
    const encCollector = collectStream();

    DocumentCrypto.encryptDocumentStream(readableStreamFrom(...inputChunks), encCollector.writable, [], [], mockSigningKeys, iv).engage(
        (e) => done(e),
        () => {
            setTimeout(() => {
                const encrypted = concatArrayBuffers(...encCollector.chunks);
                mockRecryptForDecrypt();
                const decCollector = collectStream();

                DocumentCrypto.decryptDocumentStream(
                    TestUtils.getTransformedSymmetricKey(),
                    new Uint8Array(32),
                    iv,
                    readableStreamFrom(encrypted),
                    decCollector.writable
                ).engage(
                    (e) => done(e),
                    () => {
                        setTimeout(() => {
                            expect(concatArrayBuffers(...decCollector.chunks)).toEqual(plaintext);
                            done();
                        }, 50);
                    }
                );
            }, 50);
        }
    );
}

describe("DocumentCrypto streaming", () => {
    describe("decryptDocumentStream", () => {
        it("decrypts symmetric key then runs streaming loop, writing plaintext to output", (done) => {
            const plaintext = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const encrypted = gcm(documentSymmetricKey, iv).encrypt(plaintext);

            mockRecryptForDecrypt();
            const output = collectStream();

            DocumentCrypto.decryptDocumentStream(
                TestUtils.getTransformedSymmetricKey(),
                new Uint8Array(32),
                iv,
                readableStreamFrom(encrypted),
                output.writable
            ).engage(
                (e) => done(e),
                () => {
                    setTimeout(() => {
                        expect(concatArrayBuffers(...output.chunks)).toEqual(plaintext);
                        done();
                    }, 50);
                }
            );
        });

        it("maps PRE decryption failures to SDK error with stream decrypt error code", (done) => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("PRE decrypt failure")));

            DocumentCrypto.decryptDocumentStream(
                TestUtils.getTransformedSymmetricKey(),
                new Uint8Array(32),
                new Uint8Array(12),
                readableStreamFrom(),
                new WritableStream<Uint8Array>()
            ).engage(
                (error) => {
                    expect(error.message).toEqual("PRE decrypt failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_STREAM_DECRYPT_FAILURE);
                    done();
                },
                () => done("success handler should not be invoked when PRE decryption fails")
            );
        });
    });

    describe("encryptDocumentStream", () => {
        it("generates doc key, encrypts to recipients, writes ciphertext to output stream", (done) => {
            const plaintext = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

            mockRecryptForEncrypt();
            const output = collectStream();

            DocumentCrypto.encryptDocumentStream(readableStreamFrom(plaintext), output.writable, [], [], mockSigningKeys, iv).engage(
                (e) => done(e),
                (result) => {
                    expect(result.userAccessKeys).toEqual([]);
                    expect(result.groupAccessKeys).toEqual([]);

                    setTimeout(() => {
                        const encrypted = concatArrayBuffers(...output.chunks);
                        const decrypted = gcm(documentSymmetricKey, iv).decrypt(encrypted);
                        expect(new Uint8Array(decrypted)).toEqual(plaintext);
                        done();
                    }, 50);
                }
            );
        });

        it("maps key generation failures to DOCUMENT_STREAM_ENCRYPT_FAILURE", (done) => {
            jest.spyOn(Recrypt, "generateDocumentKey").mockReturnValue(Future.reject(new Error("keygen failure")));

            DocumentCrypto.encryptDocumentStream(readableStreamFrom(), new WritableStream<Uint8Array>(), [], [], mockSigningKeys, iv).engage(
                (error) => {
                    expect(error.message).toEqual("keygen failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_STREAM_ENCRYPT_FAILURE);
                    done();
                },
                () => done("success handler should not be invoked when key generation fails")
            );
        });
    });

    describe("streaming encrypt → decrypt full roundtrip", () => {
        it("roundtrips 'Hello' through streaming encrypt then streaming decrypt", (done) => {
            const plaintext = new Uint8Array([72, 101, 108, 108, 111]);
            streamingRoundtrip(plaintext, [plaintext], done);
        });

        it("roundtrips a 1KB document in multiple chunks", (done) => {
            const plaintext = new Uint8Array(1024);
            for (let i = 0; i < plaintext.length; i++) plaintext[i] = i % 256;
            // Split into 100-byte chunks
            const chunks: Uint8Array[] = [];
            for (let i = 0; i < plaintext.length; i += 100) {
                chunks.push(plaintext.subarray(i, Math.min(i + 100, plaintext.length)));
            }
            streamingRoundtrip(plaintext, chunks, done);
        });
    });
});

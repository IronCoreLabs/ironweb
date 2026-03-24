import * as DocumentCrypto from "../DocumentCrypto";
import Future from "futurejs";
import * as TestUtils from "../../../tests/TestUtils";
import * as Recrypt from "../crypto/recrypt";
import {ErrorCodes} from "../../../Constants";
import {gcm} from "@noble/ciphers/aes";

describe("DocumentCrypto streaming", () => {
    describe("decryptDocumentStream", () => {
        it("decrypts symmetric key then runs streaming loop, writing plaintext to output", (done) => {
            const documentSymmetricKey = new Uint8Array(32);
            documentSymmetricKey.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
            const iv = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
            const plaintext = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

            // Encrypt with standard GCM
            const encrypted = gcm(documentSymmetricKey, iv).encrypt(plaintext);

            // Create streams
            const encryptedStream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(encrypted);
                    controller.close();
                },
            });

            const outputChunks: Uint8Array[] = [];
            const plaintextStream = new WritableStream<Uint8Array>({
                write(chunk) {
                    outputChunks.push(new Uint8Array(chunk));
                },
            });

            // Mock Recrypt to return our known key
            const recryptPlaintext = new Uint8Array(384);
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.of<any>([recryptPlaintext, documentSymmetricKey]));

            DocumentCrypto.decryptDocumentStream(TestUtils.getTransformedSymmetricKey(), new Uint8Array(32), iv, encryptedStream, plaintextStream).engage(
                (e) => done(e),
                () => {
                    // Wait for the background stream loop to complete
                    setTimeout(() => {
                        const result = new Uint8Array(outputChunks.reduce((sum, c) => sum + c.length, 0));
                        let offset = 0;
                        for (const chunk of outputChunks) {
                            result.set(chunk, offset);
                            offset += chunk.length;
                        }
                        expect(result).toEqual(plaintext);
                        done();
                    }, 50);
                }
            );
        });

        it("maps PRE decryption failures to SDK error with stream decrypt error code", (done) => {
            jest.spyOn(Recrypt, "decryptPlaintext").mockReturnValue(Future.reject(new Error("PRE decrypt failure")));

            const encryptedStream = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.close();
                },
            });
            const plaintextStream = new WritableStream<Uint8Array>();

            DocumentCrypto.decryptDocumentStream(TestUtils.getTransformedSymmetricKey(), new Uint8Array(32), new Uint8Array(12), encryptedStream, plaintextStream).engage(
                (error) => {
                    expect(error.message).toEqual("PRE decrypt failure");
                    expect(error.code).toEqual(ErrorCodes.DOCUMENT_STREAM_DECRYPT_FAILURE);
                    done();
                },
                () => done("success handler should not be invoked when PRE decryption fails")
            );
        });
    });
});

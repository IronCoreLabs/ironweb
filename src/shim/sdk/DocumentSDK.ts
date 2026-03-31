import Future from "futurejs";
import {
    DecryptedUnmanagedDocumentResponse,
    DocumentAccessList,
    DocumentCreateOptions,
    EncryptedDocumentResponse,
    EncryptedUnmanagedDocumentResponse,
    StreamDecryptResponse,
    UserOrGroup,
} from "../../../ironweb";
import {ErrorCodes, HEADER_META_LENGTH_LENGTH, VERSION_HEADER_LENGTH} from "../../Constants";
import * as MT from "../../FrameMessageTypes";
import SDKError from "../../lib/SDKError";
import {parseDocumentHeader} from "../../lib/Utils";
import * as FrameMediator from "../FrameMediator";
import * as ShimUtils from "../ShimUtils";

const MAX_DOCUMENT_SIZE = 1024 * 2 * 1000; //2MB

/**
 * Takes the document encrypt options object and normalizes it to a complete object with proper default values.
 * @param  {DocumentCreateOptions} options Options user passed in for document create operation
 * @return {DocumentCreateOptions}         Document create options object with properly filled out fields
 */
function calculateDocumentCreateOptionsDefault(options?: DocumentCreateOptions) {
    //Generate a random ID for the document if the user didn't provide one
    const randomBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const hexID = Array.prototype.map.call(randomBytes, (byte: number) => `00${byte.toString(16)}`.slice(-2)).join("");
    if (!options) {
        return {documentID: hexID, documentName: "", accessList: {users: [], groups: [], grantToAuthor: true}};
    }
    return {
        documentID: options.documentID || hexID,
        documentName: options.documentName || "",
        accessList: {
            users: options.accessList && options.accessList.users ? options.accessList.users : [],
            groups: options.accessList && options.accessList.groups ? options.accessList.groups : [],
            grantToAuthor: options.grantToAuthor !== false,
        },
        policy: options.policy,
    };
}

/**
 * Returns the list of documents that the current user has access to decrypt. Only document metadata is returned, not any document content.
 * This list will include documents the user authored as well as documents that were granted access to the current user, either by another user or a group.
 */
export function list() {
    ShimUtils.checkSDKInitialized();
    return FrameMediator.sendMessage<MT.DocumentListResponse>({type: "DOCUMENT_LIST"})
        .map(({message}) => message)
        .toPromise();
}

/**
 * Get metadata about a document regardless of where the document content is stored. Returns a Promise which will be resolved with the document metadata.
 * @param {string} documentID ID of the document metadata to retrieve
 */
export function getMetadata(documentID: string) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentMetaGetRequest = {
        type: "DOCUMENT_META_GET",
        message: {documentID},
    };
    return FrameMediator.sendMessage<MT.DocumentMetaGetResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Attempt to parse the document ID from an encrypted document header. Returns the document ID as a string or null if the provided encrypted
 * document doesn't have an embedded ID.
 * @param {Uint8Array} documentData Encrypted document in byte array form
 */
export function getDocumentIDFromBytes(documentData: Uint8Array): Promise<string | null> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateEncryptedDocument(documentData);
    return parseDocumentHeader(documentData)
        .map(({documentID}) => documentID)
        .toPromise();
}

/**
 * @deprecated Use `decrypt` instead.
 * Retrieve and decrypt a document from the document store. Returns a Promise which will be resolved once the document has been retrieved and decrypted.
 * @param {string} documentID ID of the document to retrieve
 */
export function decryptFromStore(documentID: string) {
    console.warn("decryptFromStore is deprecated. Use decrypt instead.");
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentStoreDecryptRequest = {
        type: "DOCUMENT_STORE_DECRYPT",
        message: {
            documentID,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreDecryptResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Decrypt the provided document given the ID of the document and its data. Returns a Promise which will be resolved once the document has been successfully decrypted.
 * @param {string}      documentID   Unique ID of document to decrypt
 * @param {Uint8Array}  documentData Document data to decrypt
 */
export function decrypt(documentID: string, documentData: Uint8Array) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateEncryptedDocument(documentData);
    const payload: MT.DocumentDecryptRequest = {
        type: "DOCUMENT_DECRYPT",
        message: {
            documentID,
            documentData: documentData.slice(),
        },
    };
    return FrameMediator.sendMessage<MT.DocumentDecryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * @deprecated Use `encrypt` instead and manage storage of the result yourself.
 * Creates a new encrypted document within the store. Returns a Promise which will be resolved once the data has been fully encrypted and saved.
 * @param {Uint8Array}            documentData Data to save for document
 * @param {DocumentCreateOptions} options      Document create options. Includes:
 *                                               documentID: string - Optional ID to use for the document. Document ID will be stored unencrypted and must be unique per segment
 *                                               documentName: string - Optional name to provide to document. Document name will be stored unencrypted.
 *                                               accessList: object - Optional object which allows document to be shared with others upon creation. There is no need to add the
 *                                               document creators ID to this list as that will happen automatically. Contains the following keys:
 *                                                   users: Array - List of user IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   groups: Array - List of group IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   grantToAuthor: boolean - Should the create grant access to the logged in user. Defaults to true.
 */
export function encryptToStore(documentData: Uint8Array, options?: DocumentCreateOptions) {
    console.warn("encryptToStore is deprecated. Use encrypt instead and manage storage of the result yourself.");
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateDocumentData(documentData);
    if (documentData.length > MAX_DOCUMENT_SIZE) {
        return Promise.reject(
            new SDKError(
                new Error(`Document of length ${documentData.length} exceeds maximum allowed byte size of ${MAX_DOCUMENT_SIZE}`),
                ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED
            )
        );
    }
    const encryptOptions = calculateDocumentCreateOptionsDefault(options);
    if (encryptOptions.documentID) {
        ShimUtils.validateID(encryptOptions.documentID);
    }
    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
    const payload: MT.DocumentStoreEncryptRequest = {
        type: "DOCUMENT_STORE_ENCRYPT",
        message: {
            documentID: encryptOptions.documentID,
            documentData: documentData.slice(),
            documentName: encryptOptions.documentName,
            userGrants,
            groupGrants,
            grantToAuthor: encryptOptions.accessList.grantToAuthor,
            policy: encryptOptions.policy,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreEncryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Encrypt the provided document. Returns a Promise which will be resolved once the content has been encrypted.
 * @param {string}                documentData Contents of document to encrypt
 * @param {DocumentCreateOptions} options      Document create options. Includes:
 *                                               documentID: string - Optional ID to use for the document. Document ID will be stored unencrypted and must be unique per segment
 *                                               documentName: string - Optional name to provide to document. Document name will be stored unencrypted.
 *                                               accessList: object - Optional object which allows document to be shared with others upon creation. Contains the following keys:
 *                                                   users: Array - List of user IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   groups: Array - List of group IDs to share document with. Each value in the array should be in the form {id: string}.
 *                                                   grantToAuthor: boolean - Should the create grant access to the logged in user. Defaults to true.
 *                                                   policy: Policy - The policy (or data label) to be applied to this data. This policy will be applied to get users and groups
 *                                                                    to share with in addition to the ones being explicitly granted access.
 */
export function encrypt(documentData: Uint8Array, options?: DocumentCreateOptions): Promise<EncryptedDocumentResponse> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateDocumentData(documentData);
    const encryptOptions = calculateDocumentCreateOptionsDefault(options);
    if (encryptOptions.documentID) {
        ShimUtils.validateID(encryptOptions.documentID);
    }
    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
    const payload: MT.DocumentEncryptRequest = {
        type: "DOCUMENT_ENCRYPT",
        message: {
            documentData: documentData.slice(),
            documentID: encryptOptions.documentID,
            documentName: encryptOptions.documentName,
            userGrants,
            groupGrants,
            grantToAuthor: encryptOptions.accessList.grantToAuthor,
            policy: encryptOptions.policy,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentEncryptResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Update an existing documents data in the store. Returns a Promise which will be resolved once the document has been successfully updated in the store.
 * @deprecated Use `updateEncryptedData` instead and manage storage of the result yourself.
 * @param {string}     documentID      ID of document to update. Promise will reject if document does not exist
 * @param {Uint8Array} newDocumentData New content to encrypt and save for document
 */
export function updateEncryptedDataInStore(documentID: string, newDocumentData: Uint8Array) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateDocumentData(newDocumentData);

    if (newDocumentData.length > MAX_DOCUMENT_SIZE) {
        return Promise.reject(
            new SDKError(
                new Error(`Document of length ${newDocumentData.length} exceeds maximum allowed byte size of ${MAX_DOCUMENT_SIZE}`),
                ErrorCodes.DOCUMENT_MAX_SIZE_EXCEEDED
            )
        );
    }

    const payload: MT.DocumentStoreUpdateDataRequest = {
        type: "DOCUMENT_STORE_UPDATE_DATA",
        message: {
            documentID,
            documentData: newDocumentData.slice(),
        },
    };
    return FrameMediator.sendMessage<MT.DocumentStoreUpdateDataResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Update and re-encrypt a document that already exists. Returns a Promise which will be resolved once the new data has been encrypted.
 * @param {string}     documentID      Unique ID of document to update
 * @param {Uint8Array} newDocumentData New content to encrypt for document
 */
export function updateEncryptedData(documentID: string, newDocumentData: Uint8Array): Promise<EncryptedDocumentResponse> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateDocumentData(newDocumentData);
    const payload: MT.DocumentUpdateDataRequest = {
        type: "DOCUMENT_UPDATE_DATA",
        message: {
            documentID,
            documentData: newDocumentData.slice(),
        },
    };
    return FrameMediator.sendMessage<MT.DocumentUpdateDataResponse>(payload, [payload.message.documentData])
        .map(({message}) => message)
        .toPromise();
}

/**
 * Update a document name to a new value. Can also be used to clear the name field for an existing document by passing in null or an empty string for the name parameter.
 * @param {string}      documentID Unique ID of the document to update
 * @param {string|null} name       Name to update. Send in null/empty string to clear a documents name field.
 */
export function updateName(documentID: string, name: string | null) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    const payload: MT.DocumentUpdateNameRequest = {
        type: "DOCUMENT_UPDATE_NAME",
        message: {
            documentID,
            name: name === "" ? null : name,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentUpdateNameResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Provides access to the provided list of users and groups to the provided document ID. Returns a Promise which will be resolved
 * once access to the document has been granted to all users/groups provided.
 * @param {string}             documentID Unique ID of document to grant access
 * @param {DocumentAccessList} accessList List of IDs (user IDs, group IDs) with which to grant document access
 */
export function grantAccess(documentID: string, grantList: DocumentAccessList) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateAccessList(grantList);

    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(grantList);
    const payload: MT.DocumentGrantRequest = {
        type: "DOCUMENT_GRANT",
        message: {
            documentID,
            userGrants,
            groupGrants,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentGrantResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Revoke access to a document from the provided list of user and/or group IDs. There are limitations on who is able to revoke document access. Document
 * authors can revoke access from any other user or group. Other users can revoke access that they created to other users or groups.
 * @param {string}             documentID Unique ID of document to revoke access
 * @param {DocumentAccessList} revokeList List of IDs (user IDs and/or groupIDs) from which to revoke access
 */
export function revokeAccess(documentID: string, revokeList: DocumentAccessList) {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);
    ShimUtils.validateAccessList(revokeList);

    const [userRevocations, groupRevocations] = ShimUtils.dedupeAccessLists(revokeList);
    const payload: MT.DocumentRevokeRequest = {
        type: "DOCUMENT_REVOKE",
        message: {
            documentID,
            userRevocations,
            groupRevocations,
        },
    };
    return FrameMediator.sendMessage<MT.DocumentRevokeResponse>(payload)
        .map(({message}) => message)
        .toPromise();
}

/**
 * Parse the version header, header JSON, and IV from the beginning of an encrypted ReadableStream.
 * Returns the document ID, IV, and a new ReadableStream starting after the header+IV (ciphertext only).
 */
function parseStreamHeader(
    encryptedStream: ReadableStream<Uint8Array>
): Future<Error, {documentID: string | null; iv: Uint8Array; ciphertextStream: ReadableStream<Uint8Array>}> {
    return Future.tryP<SDKError, Uint8Array>(async () => {
        const reader = encryptedStream.getReader();
        let buffer = new Uint8Array(0);

        async function readAtLeast(n: number): Promise<void> {
            while (buffer.length < n) {
                const {done, value} = await reader.read();
                if (done) throw new SDKError(new Error("Encrypted stream ended before header could be parsed"), ErrorCodes.DOCUMENT_HEADER_PARSE_FAILURE);
                const next = new Uint8Array(buffer.length + value.length);
                next.set(buffer, 0);
                next.set(value, buffer.length);
                buffer = next;
            }
        }

        // Buffer enough to determine the full header size: version(1) + potentially header length(2)
        await readAtLeast(VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH);
        // For v2, compute total needed: version + length prefix + headerJson + IV(12)
        // For v1, we just need version + IV(12) — but we've already buffered more than that
        let totalNeeded: number;
        if (buffer[0] === 2) {
            const headerJsonLength = new DataView(buffer.buffer, buffer.byteOffset).getUint16(VERSION_HEADER_LENGTH, false);
            totalNeeded = VERSION_HEADER_LENGTH + HEADER_META_LENGTH_LENGTH + headerJsonLength + 12;
        } else {
            totalNeeded = VERSION_HEADER_LENGTH + 12;
        }
        await readAtLeast(totalNeeded);

        reader.releaseLock();
        return buffer;
    }).flatMap((buffer) =>
        parseDocumentHeader(buffer).map((parsed) => {
            const remainder = buffer.slice(parsed.contentOffset);

            let remainderSent = false;
            let ongoingReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
            const ciphertextStream = new ReadableStream<Uint8Array>({
                pull(controller) {
                    if (!remainderSent) {
                        remainderSent = true;
                        if (remainder.length > 0) {
                            controller.enqueue(remainder);
                            return;
                        }
                    }
                    if (!ongoingReader) {
                        ongoingReader = encryptedStream.getReader();
                    }
                    return ongoingReader.read().then(({done, value}) => {
                        if (done) {
                            controller.close();
                        } else {
                            controller.enqueue(value);
                        }
                    });
                },
                cancel() {
                    if (ongoingReader) {
                        ongoingReader.cancel();
                    }
                },
            });

            return {documentID: parsed.documentID, iv: parsed.iv, ciphertextStream};
        })
    );
}

/**
 * Encrypt a plaintext stream. Returns a Promise which resolves with the encrypted stream and document metadata.
 * The output stream produces bytes in the same format as encrypt(): [header][IV][ciphertext][auth_tag].
 *
 * @param {ReadableStream<Uint8Array>} plaintextStream  Plaintext data as a ReadableStream
 * @param {DocumentCreateOptions}      options           Document create options
 */
export function encryptStream(
    plaintextStream: ReadableStream<Uint8Array>,
    options?: DocumentCreateOptions
): Promise<{documentID: string; documentName: string | null; encryptedStream: ReadableStream<Uint8Array>; created: string; updated: string}> {
    ShimUtils.checkSDKInitialized();
    const encryptOptions = calculateDocumentCreateOptionsDefault(options);
    if (encryptOptions.documentID) {
        ShimUtils.validateID(encryptOptions.documentID);
    }
    const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
    const {readable: encryptedStream, writable: ciphertextWritable} = new TransformStream<Uint8Array, Uint8Array>();

    const payload: MT.DocumentStreamEncryptRequest = {
        type: "DOCUMENT_STREAM_ENCRYPT",
        message: {
            documentID: encryptOptions.documentID,
            documentName: encryptOptions.documentName,
            plaintextStream,
            ciphertextStream: ciphertextWritable,
            userGrants,
            groupGrants,
            grantToAuthor: encryptOptions.accessList.grantToAuthor,
            policy: encryptOptions.policy,
        },
    };

    // Cast needed because TS's Transferable type doesn't yet include ReadableStream/WritableStream
    return FrameMediator.sendMessage<MT.DocumentStreamEncryptResponse>(payload, [
        plaintextStream as unknown as Transferable,
        ciphertextWritable as unknown as Transferable,
    ])
        .map(({message}) => ({
            documentID: message.documentID,
            documentName: message.documentName,
            encryptedStream,
            created: message.created,
            updated: message.updated,
        }))
        .toPromise();
}

/**
 * Decrypt an encrypted document stream. Parses the header and IV from the stream, then streams decrypted
 * plaintext back via the returned ReadableStream. If the auth tag fails at the end of the stream, the
 * readable side errors — which propagates through pipeTo() to abort any destination WritableStream.
 *
 * @param {string}                     documentID      ID of the document to decrypt
 * @param {ReadableStream<Uint8Array>} encryptedStream Encrypted document as a ReadableStream (from fetch().body, file.stream(), etc.)
 */
export function decryptStream(
    documentID: string,
    encryptedStream: ReadableStream<Uint8Array>
): Promise<StreamDecryptResponse> {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(documentID);

    return parseStreamHeader(encryptedStream)
        .flatMap(({iv, ciphertextStream}) => {
            const {readable: plaintextStream, writable: plaintextWritable} = new TransformStream<Uint8Array, Uint8Array>();

            const payload: MT.DocumentStreamDecryptRequest = {
                type: "DOCUMENT_STREAM_DECRYPT",
                message: {documentID, iv, encryptedStream: ciphertextStream, plaintextStream: plaintextWritable},
            };

            return FrameMediator.sendMessage<MT.DocumentStreamDecryptResponse>(payload, [
                ciphertextStream as unknown as Transferable,
                plaintextWritable as unknown as Transferable,
            ]).map(({message}) => ({
                documentID,
                documentName: message.documentName,
                visibleTo: message.visibleTo,
                association: message.association,
                created: message.created,
                updated: message.updated,
                plaintextStream,
            }));
        })
        .toPromise();
}

/**
 * A collection of methods for advanced encryption/decryption use cases. Currently focused on methods which require the caller to manage the encrypted
 * DEKs.
 */
export const advanced = {
    /**
     * Decrypt the provided document given the edeks of the document and its data. Returns a Promise which will be resolved once the document has been successfully decrypted.
     * @param {Uint8Array}  documentData Document data to decrypt
     * @param {Uint8Array}  edeks        The encrypted deks for the documentData.
     */
    decryptUnmanaged: (documentData: Uint8Array, edeks: Uint8Array): Promise<DecryptedUnmanagedDocumentResponse> => {
        ShimUtils.checkSDKInitialized();
        ShimUtils.validateEncryptedDeks(edeks);
        ShimUtils.validateEncryptedDocument(documentData);
        return Future.tryP(() => getDocumentIDFromBytes(documentData))
            .flatMap((documentId) => {
                const payload: MT.DocumentUnmanagedDecryptRequest = {
                    type: "DOCUMENT_UNMANAGED_DECRYPT",
                    message: {
                        edeks,
                        documentData: documentData.slice(),
                    },
                };
                return FrameMediator.sendMessage<MT.DocumentUnmanagedDecryptResponse>(payload, [payload.message.documentData]).map(({message}) => ({
                    data: message.data,
                    //There is no way to create a version 1 document with unmanaged edeks so this is safe.
                    documentID: documentId!,
                    accessVia: message.accessVia,
                }));
            })
            .toPromise();
    },

    /**
     * Streaming decrypt with caller-provided EDEKs. Parses the header/IV from the stream, then decrypts.
     * If the auth tag fails, the returned plaintextStream errors.
     */
    decryptStreamUnmanaged: (
        encryptedStream: ReadableStream<Uint8Array>,
        edeks: Uint8Array
    ): Promise<{documentID: string; plaintextStream: ReadableStream<Uint8Array>; accessVia: UserOrGroup}> => {
        ShimUtils.checkSDKInitialized();
        ShimUtils.validateEncryptedDeks(edeks);

        return parseStreamHeader(encryptedStream)
            .flatMap(({documentID, iv, ciphertextStream}) => {
                const {readable: plaintextStream, writable: plaintextWritable} = new TransformStream<Uint8Array, Uint8Array>();

                const payload: MT.DocumentUnmanagedStreamDecryptRequest = {
                    type: "DOCUMENT_UNMANAGED_STREAM_DECRYPT",
                    message: {edeks, iv, encryptedStream: ciphertextStream, plaintextStream: plaintextWritable},
                };

                return FrameMediator.sendMessage<MT.DocumentUnmanagedStreamDecryptResponse>(payload, [
                    ciphertextStream as unknown as Transferable,
                    plaintextWritable as unknown as Transferable,
                ]).map(({message}) => ({
                    documentID: documentID!,
                    plaintextStream,
                    accessVia: message.accessVia,
                }));
            })
            .toPromise();
    },

    /**
     * Streaming encrypt with caller-managed EDEKs. Returns the encrypted stream and EDEKs to the caller.
     * The output stream produces bytes in the same format as encrypt(): [header][IV][ciphertext][auth_tag].
     */
    encryptStreamUnmanaged: (
        plaintextStream: ReadableStream<Uint8Array>,
        options?: Omit<DocumentCreateOptions, "documentName">
    ): Promise<{documentID: string; encryptedStream: ReadableStream<Uint8Array>; edeks: Uint8Array}> => {
        ShimUtils.checkSDKInitialized();
        const encryptOptions = calculateDocumentCreateOptionsDefault(options);
        if (encryptOptions.documentID) {
            ShimUtils.validateID(encryptOptions.documentID);
        }
        const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
        const {readable: encryptedStream, writable: ciphertextWritable} = new TransformStream<Uint8Array, Uint8Array>();

        const payload: MT.DocumentUnmanagedStreamEncryptRequest = {
            type: "DOCUMENT_UNMANAGED_STREAM_ENCRYPT",
            message: {
                documentID: encryptOptions.documentID,
                plaintextStream,
                ciphertextStream: ciphertextWritable,
                userGrants,
                groupGrants,
                grantToAuthor: encryptOptions.accessList.grantToAuthor,
                policy: encryptOptions.policy,
            },
        };

        return FrameMediator.sendMessage<MT.DocumentUnmanagedStreamEncryptResponse>(payload, [
            plaintextStream as unknown as Transferable,
            ciphertextWritable as unknown as Transferable,
        ])
            .map(({message}) => ({
                documentID: message.documentID,
                encryptedStream,
                edeks: message.edeks,
            }))
            .toPromise();
    },

    /**
     * Encrypt the provided document with various document create options. Does not store any part of the document within IronCore and instead returns
     * the encrypted DEKs to the caller. These encrypted DEKs must be then be provided as input in order to decrypt the document.
     * @param {Uint8Array}            documentData Document data to encrypt
     * @param {DocumentCreateOptions} options Options when creating the document. Allows for encrypting to other users and groups among others.
     */
    encryptUnmanaged: (documentData: Uint8Array, options?: Omit<DocumentCreateOptions, "documentName">): Promise<EncryptedUnmanagedDocumentResponse> => {
        ShimUtils.checkSDKInitialized();
        ShimUtils.validateDocumentData(documentData);
        const encryptOptions = calculateDocumentCreateOptionsDefault(options);
        if (encryptOptions.documentID) {
            ShimUtils.validateID(encryptOptions.documentID);
        }
        const [userGrants, groupGrants] = ShimUtils.dedupeAccessLists(encryptOptions.accessList);
        const payload: MT.DocumentUnmanagedEncryptRequest = {
            type: "DOCUMENT_UNMANAGED_ENCRYPT",
            message: {
                documentData: documentData.slice(),
                documentID: encryptOptions.documentID,
                userGrants,
                groupGrants,
                grantToAuthor: encryptOptions.accessList.grantToAuthor,
                policy: encryptOptions.policy,
            },
        };
        return FrameMediator.sendMessage<MT.DocumentUnmanagedEncryptResponse>(payload, [payload.message.documentData])
            .map(({message}) => message)
            .toPromise();
    },
};

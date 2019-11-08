import SDKError from "../../lib/SDKError";
import {ErrorResponse, RequestMessage, ResponseMessage} from "../../WorkerMessageTypes";
import * as DocumentCrypto from "./DocumentCrypto";
import * as GroupCrypto from "./GroupCrypto";
import * as UserCrypto from "./UserCrypto";

type WorkerMessageCallback = (message: RequestMessage, callback: (response: ResponseMessage, transferList?: Uint8Array[]) => void) => void;

//The postMessage function in a WebWorker has a different signature than the frame postMessage function. The "correct" fix here would be to include
//the "webworker" lib in the tsconfig file. But you can't use that in conjunction with the "dom" lib, so everything breaks down. So instead of trying
//to do tons of work to hack those together, we're just redefining this method to match the signature we know it has.
declare function postMessage(message: any, transfer?: ArrayBuffer[]): void;

class ParentThreadMessenger {
    onMessageCallback!: WorkerMessageCallback;
    constructor() {
        self.addEventListener("message", this.processMessageIntoWorker, false);
    }

    /**
     * Subscribe a callback to when a new message is posted to this frame
     */
    onMessage(callback: WorkerMessageCallback) {
        this.onMessageCallback = callback;
    }

    /**
     * Post a response message back to the parent window
     * @param {ResponseMessage} data         Response message to post
     * @param {number}          replyID      ID of original message into frame. Used to invoke the proper callback on the parent window
     * @param {Uint8Array[]}    transferList  List of Uint8Arrays to transfer to parent
     */
    postMessageToParent(data: ResponseMessage, replyID: number, transferList: Uint8Array[] = []) {
        const message: WorkerEvent<ResponseMessage> = {
            replyID,
            data,
        };
        postMessage(message, transferList.map((intByteArray) => intByteArray.buffer));
    }

    /**
     * Process a received message into the iFrame
     * @param {MessageEvent} event Frame postMessage event object
     */
    processMessageIntoWorker = (event: MessageEvent) => {
        const message: WorkerEvent<RequestMessage> = event.data;
        this.onMessageCallback(message.data, (responseData: ResponseMessage, transferList?: Uint8Array[]) => {
            this.postMessageToParent(responseData, message.replyID, transferList);
        });
    };
}

export const messenger = new ParentThreadMessenger();

/**
 * Generic method to convert SDK error messages down into the message/code parts for transfer back to the parent window
 */
function errorResponse(callback: (response: ErrorResponse) => void, error: SDKError) {
    callback({
        type: "ERROR_RESPONSE",
        message: {
            code: error.code,
            text: error.message,
        },
    });
}

/* tslint:disable cyclomatic-complexity */
messenger.onMessage((data: RequestMessage, callback: (message: ResponseMessage, transferList?: Uint8Array[]) => void): void => {
    const errorHandler = errorResponse.bind(null, callback);
    switch (data.type) {
        case "USER_DEVICE_KEYGEN":
            const {message} = data;
            return UserCrypto.generateDeviceAndSigningKeys(
                message.jwtToken,
                message.passcode,
                message.keySalt,
                message.encryptedPrivateUserKey,
                message.publicUserKey
            ).engage(errorHandler, (keys) => callback({type: "USER_DEVICE_KEYGEN_RESPONSE", message: keys}));
        case "NEW_USER_AND_DEVICE_KEYGEN":
            return UserCrypto.generateNewUserAndDeviceKeys(data.message.passcode).engage(errorHandler, (keys) =>
                callback({type: "NEW_USER_AND_DEVICE_KEYGEN_RESPONSE", message: keys})
            );
        case "NEW_USER_KEYGEN":
            return UserCrypto.generateNewUserKeys(data.message.passcode).engage(errorHandler, (keys) =>
                callback({type: "NEW_USER_KEYGEN_RESPONSE", message: keys})
            );
        case "DECRYPT_LOCAL_KEYS":
            return UserCrypto.decryptDeviceAndSigningKeys(
                data.message.encryptedDeviceKey,
                data.message.encryptedSigningKey,
                data.message.symmetricKey,
                data.message.nonce
            ).engage(errorHandler, (deviceAndSigningKeys) => callback({type: "DECRYPT_LOCAL_KEYS_RESPONSE", message: deviceAndSigningKeys}));
        case "ROTATE_USER_PRIVATE_KEY":
            return UserCrypto.rotatePrivateKey(data.message.passcode, data.message.encryptedPrivateUserKey).engage(errorHandler, (userRotationResult) =>
                callback({type: "ROTATE_USER_PRIVATE_KEY_RESPONSE", message: userRotationResult})
            );
        case "CHANGE_USER_PASSCODE":
            return UserCrypto.changeUsersPasscode(data.message.currentPasscode, data.message.newPasscode, data.message.encryptedPrivateUserKey).engage(
                errorHandler,
                (encryptedPrivateKey) => callback({type: "CHANGE_USER_PASSCODE_RESPONSE", message: encryptedPrivateKey})
            );
        case "SIGNATURE_GENERATION":
            return UserCrypto.signRequestPayload(
                data.message.segmentID,
                data.message.userID,
                data.message.signingKeys,
                data.message.method,
                data.message.url,
                data.message.body
            ).engage(errorHandler, (signature) => callback({type: "SIGNATURE_GENERATION_RESPONSE", message: signature}));
        case "DOCUMENT_ENCRYPT":
            return DocumentCrypto.encryptDocument(data.message.document, data.message.userKeyList, data.message.groupKeyList, data.message.signingKeys).engage(
                errorHandler,
                (encryptedContent) => callback({type: "DOCUMENT_ENCRYPT_RESPONSE", message: encryptedContent}, [encryptedContent.encryptedDocument.content])
            );
        case "DOCUMENT_DECRYPT":
            return DocumentCrypto.decryptDocument(data.message.document, data.message.encryptedSymmetricKey, data.message.privateKey).engage(
                errorHandler,
                (decryptedDocument) => callback({type: "DOCUMENT_DECRYPT_RESPONSE", message: {decryptedDocument}}, [decryptedDocument])
            );
        case "DOCUMENT_REENCRYPT":
            return DocumentCrypto.reEncryptDocument(data.message.document, data.message.existingDocumentSymmetricKey, data.message.privateKey).engage(
                errorHandler,
                (encryptedDocument) => callback({type: "DOCUMENT_REENCRYPT_RESPONSE", message: {encryptedDocument}}, [encryptedDocument.content])
            );
        case "DOCUMENT_ENCRYPT_TO_KEYS":
            return DocumentCrypto.encryptToKeys(
                data.message.symmetricKey,
                data.message.userKeyList,
                data.message.groupKeyList,
                data.message.privateKey,
                data.message.signingKeys
            ).engage(errorHandler, (keyList) => callback({type: "DOCUMENT_ENCRYPT_TO_KEYS_RESPONSE", message: keyList}));
        case "GROUP_CREATE":
            return GroupCrypto.createGroup(data.message.userPublicKey, data.message.signingKeys, data.message.addAsMember).engage(errorHandler, (group) =>
                callback({type: "GROUP_CREATE_RESPONSE", message: group})
            );
        case "GROUP_ADD_ADMINS":
            return GroupCrypto.addAdminsToGroup(
                data.message.encryptedGroupKey,
                data.message.userKeyList,
                data.message.adminPrivateKey,
                data.message.signingKeys
            ).engage(errorHandler, (accessKeyList) => callback({type: "GROUP_ADD_ADMINS_RESPONSE", message: accessKeyList}));
        case "GROUP_ADD_MEMBERS":
            return GroupCrypto.addMembersToGroup(
                data.message.encryptedGroupKey,
                data.message.groupPublicKey,
                data.message.groupID,
                data.message.userKeyList,
                data.message.adminPrivateKey,
                data.message.signingKeys
            ).engage(errorHandler, (result) => callback({type: "GROUP_ADD_MEMBERS_RESPONSE", message: result}));
        default:
            //Force TS to tell us if we ever create a new request type that we don't handle here
            const exhaustiveCheck: never = data;
            return exhaustiveCheck;
    }
});

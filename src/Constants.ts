declare const SDK_NPM_VERSION_PLACEHOLDER: string;
declare const _ICL_FRAME_DOMAIN_REPLACEMENT_: string;

/**
 * Number which is prepended onto encrypted documents to denote which classification of encrypted data
 * the document represents. Used to have a place to denote header info, symmetric encryption details, etc
 */
export const DOCUMENT_ENCRYPTION_DETAILS_VERSION_NUMBER = 2;
export const VERSION_HEADER_LENGTH = 1;
export const HEADER_META_LENGTH_LENGTH = 2;

/**
 * Regex of allowed characters that users can provide as part of user, group, and document IDs.
 */
export const ALLOWED_ID_CHAR_REGEX = /^[a-zA-Z0-9_.$#|@/:;=+'-]{1,100}$/;

export const CryptoConstants = {
    VERSION_HEADER_LENGTH: 1,
    IV_LENGTH: 12,
    SALT_LENGTH: 32,
    AES_SYMMETRIC_KEY_LENGTH: 32,
    PBKDF2_ITERATIONS: () => 250000, //Set this as a function so that we can mock it during unit tests
    NATIVE_DECRYPT_FAILURE_ERROR: "OperationError",
};

export enum ErrorCodes {
    JWT_FORMAT_FAILURE = 100,
    JWT_RETRIEVAL_FAILURE = 101,
    VERIFY_API_REQUEST_FAILURE = 102,
    BROWSER_FRAME_MESSAGE_FAILURE = 103,
    RANDOM_NUMBER_GENERATION_FAILURE = 104,
    PASSCODE_FORMAT_FAILURE = 105,
    PASSCODE_RETRIEVAL_FAILURE = 106,
    SIGNATURE_GENERATION_FAILURE = 107,
    USER_NOT_SYNCED_FAILURE = 108,
    WEBASSEMBLY_SUPPORT_FAILURE = 109,
    USER_VERIFY_API_REQUEST_FAILURE = 200,
    USER_CREATE_REQUEST_FAILURE = 201,
    USER_UPDATE_REQUEST_FAILURE = 202,
    USER_PASSCODE_INCORRECT = 203,
    USER_KEY_LIST_REQUEST_FAILURE = 204,
    USER_DEVICE_ADD_REQUEST_FAILURE = 205,
    USER_MASTER_KEY_GENERATION_FAILURE = 206,
    USER_DEVICE_KEY_GENERATION_FAILURE = 207,
    USER_DEVICE_KEY_DECRYPTION_FAILURE = 208,
    USER_PASSCODE_CHANGE_FAILURE = 209,
    USER_DEVICE_DELETE_REQUEST_FAILURE = 210,
    DOCUMENT_LIST_REQUEST_FAILURE = 300,
    DOCUMENT_GET_REQUEST_FAILURE = 301,
    DOCUMENT_CREATE_REQUEST_FAILURE = 302,
    DOCUMENT_UPDATE_REQUEST_FAILURE = 303,
    DOCUMENT_GRANT_ACCESS_REQUEST_FAILURE = 304,
    DOCUMENT_REVOKE_ACCESS_REQUEST_FAILURE = 305,
    DOCUMENT_DECRYPT_FAILURE = 306,
    DOCUMENT_ENCRYPT_FAILURE = 307,
    DOCUMENT_REENCRYPT_FAILURE = 308,
    DOCUMENT_GRANT_ACCESS_FAILURE = 309,
    DOCUMENT_MAX_SIZE_EXCEEDED = 310,
    DOCUMENT_CREATE_WITH_ACCESS_FAILURE = 311,
    DOCUMENT_HEADER_PARSE_FAILURE = 312,
    DOCUMENT_TRANSFORM_REQUEST_FAILURE = 313,
    GROUP_LIST_REQUEST_FAILURE = 400,
    GROUP_GET_REQUEST_FAILURE = 401,
    GROUP_CREATE_REQUEST_FAILURE = 402,
    GROUP_ADD_MEMBERS_REQUEST_FAILURE = 403,
    GROUP_ADD_MEMBER_NOT_ADMIN_FAILURE = 404,
    GROUP_REMOVE_MEMBERS_REQUEST_FAILURE = 405,
    GROUP_REMOVE_SELF_REQUEST_FAILURE = 406,
    GROUP_KEY_GENERATION_FAILURE = 407,
    GROUP_MEMBER_KEY_ENCRYPTION_FAILURE = 408,
    GROUP_ADD_ADMINS_NOT_ADMIN_FAILURE = 409,
    GROUP_ADD_ADMINS_REQUEST_FAILURE = 410,
    GROUP_KEY_DECRYPTION_FAILURE = 411,
    GROUP_REMOVE_ADMINS_REQUEST_FAILURE = 412,
    GROUP_UPDATE_REQUEST_FAILURE = 413,
    GROUP_DELETE_REQUEST_FAILURE = 414,
    REQUEST_RATE_LIMITED = 500,
    POLICY_APPLY_REQUEST_FAILURE = 600,
}

/*
 * Constants around frame communication
 */
const Frame = {
    //By default we point to production. We modify this via webpack at runtime for local development to allow us to
    //point to dev/stage.
    FRAME_DOMAIN: "https://api.ironcorelabs.com",
    FRAME_PATH: "/ironweb-frame",
};
//Support the ability to switch out the domain to point to different environments. This should only ever
//be used internally for local development and the Google Integration. Clients should always hit production.
if (typeof _ICL_FRAME_DOMAIN_REPLACEMENT_ === "string" && _ICL_FRAME_DOMAIN_REPLACEMENT_.length) {
    Frame.FRAME_DOMAIN = _ICL_FRAME_DOMAIN_REPLACEMENT_;
}

export {Frame};

export const GroupPermissions = {
    ADMIN: "admin",
    MEMBER: "member",
};

export const UserAndGroupTypes = {
    USER: "user",
    GROUP: "group",
};

export const Versions = {
    //This define is replaced at runtime during development, and at build time in the build script with the proper version
    SDK_VERSION: SDK_NPM_VERSION_PLACEHOLDER,
};

import {ironcorelabs} from "./EncryptedDeks";
const edeks = ironcorelabs.proto.EncryptedDeks;

/**
 * Protobuf encode the provided list of edeks
 */
export const encodeEdeks = (edekList: ironcorelabs.proto.IEncryptedDeks) => edeks.encode(edekList);

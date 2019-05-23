import * as DocumentSDK from "./sdk/DocumentSDK";
import * as GroupSDK from "./sdk/GroupSDK";
import * as UserSDK from "./sdk/UserSDK";
import * as CodecSDK from "./sdk/CodecSDK";

import * as IronWeb from "../../ironweb";

// https://github.com/Microsoft/TypeScript/issues/420
// whenever this lands in TS we can get stronger compiler checking of our API <-> API Interface definition.
export const document: IronWeb.Document = DocumentSDK;
export const user: IronWeb.User = UserSDK;
export const group: IronWeb.Group = GroupSDK;
export const codec: IronWeb.Codec = CodecSDK;

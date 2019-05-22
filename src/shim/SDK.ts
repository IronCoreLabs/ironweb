import * as DocumentSDK from "./sdk/DocumentSDK";
import * as GroupSDK from "./sdk/GroupSDK";
import * as UserSDK from "./sdk/UserSDK";
import * as CodecSDK from "./sdk/CodecSDK";

import * as IronWeb from "../../ironweb";

export const document: IronWeb.Document = DocumentSDK;
export const user: IronWeb.User = UserSDK;
export const group: IronWeb.Group = GroupSDK;
export const codec: IronWeb.Codec = CodecSDK;

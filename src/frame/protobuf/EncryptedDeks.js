/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const ironcorelabs = $root.ironcorelabs = (() => {

    /**
     * Namespace ironcorelabs.
     * @exports ironcorelabs
     * @namespace
     */
    const ironcorelabs = {};

    ironcorelabs.proto = (function() {

        /**
         * Namespace proto.
         * @memberof ironcorelabs
         * @namespace
         */
        const proto = {};

        proto.PublicKey = (function() {

            /**
             * Properties of a PublicKey.
             * @memberof ironcorelabs.proto
             * @interface IPublicKey
             * @property {Uint8Array|null} [x] PublicKey x
             * @property {Uint8Array|null} [y] PublicKey y
             */

            /**
             * Constructs a new PublicKey.
             * @memberof ironcorelabs.proto
             * @classdesc Represents a PublicKey.
             * @implements IPublicKey
             * @constructor
             * @param {ironcorelabs.proto.IPublicKey=} [properties] Properties to set
             */
            function PublicKey(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * PublicKey x.
             * @member {Uint8Array} x
             * @memberof ironcorelabs.proto.PublicKey
             * @instance
             */
            PublicKey.prototype.x = $util.newBuffer([]);

            /**
             * PublicKey y.
             * @member {Uint8Array} y
             * @memberof ironcorelabs.proto.PublicKey
             * @instance
             */
            PublicKey.prototype.y = $util.newBuffer([]);

            /**
             * Encodes the specified PublicKey message. Does not implicitly {@link ironcorelabs.proto.PublicKey.verify|verify} messages.
             * @function encode
             * @memberof ironcorelabs.proto.PublicKey
             * @static
             * @param {ironcorelabs.proto.IPublicKey} message PublicKey message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PublicKey.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.x != null && message.hasOwnProperty("x"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.x);
                if (message.y != null && message.hasOwnProperty("y"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.y);
                return writer;
            };

            /**
             * Encodes the specified PublicKey message, length delimited. Does not implicitly {@link ironcorelabs.proto.PublicKey.verify|verify} messages.
             * @function encodeDelimited
             * @memberof ironcorelabs.proto.PublicKey
             * @static
             * @param {ironcorelabs.proto.IPublicKey} message PublicKey message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            PublicKey.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            return PublicKey;
        })();

        proto.UserOrGroup = (function() {

            /**
             * Properties of a UserOrGroup.
             * @memberof ironcorelabs.proto
             * @interface IUserOrGroup
             * @property {string|null} [userId] UserOrGroup userId
             * @property {string|null} [groupId] UserOrGroup groupId
             * @property {ironcorelabs.proto.IPublicKey|null} [masterPublicKey] UserOrGroup masterPublicKey
             */

            /**
             * Constructs a new UserOrGroup.
             * @memberof ironcorelabs.proto
             * @classdesc Represents a UserOrGroup.
             * @implements IUserOrGroup
             * @constructor
             * @param {ironcorelabs.proto.IUserOrGroup=} [properties] Properties to set
             */
            function UserOrGroup(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * UserOrGroup userId.
             * @member {string} userId
             * @memberof ironcorelabs.proto.UserOrGroup
             * @instance
             */
            UserOrGroup.prototype.userId = "";

            /**
             * UserOrGroup groupId.
             * @member {string} groupId
             * @memberof ironcorelabs.proto.UserOrGroup
             * @instance
             */
            UserOrGroup.prototype.groupId = "";

            /**
             * UserOrGroup masterPublicKey.
             * @member {ironcorelabs.proto.IPublicKey|null|undefined} masterPublicKey
             * @memberof ironcorelabs.proto.UserOrGroup
             * @instance
             */
            UserOrGroup.prototype.masterPublicKey = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * UserOrGroup UserOrGroupId.
             * @member {"userId"|"groupId"|undefined} UserOrGroupId
             * @memberof ironcorelabs.proto.UserOrGroup
             * @instance
             */
            Object.defineProperty(UserOrGroup.prototype, "UserOrGroupId", {
                get: $util.oneOfGetter($oneOfFields = ["userId", "groupId"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified UserOrGroup message. Does not implicitly {@link ironcorelabs.proto.UserOrGroup.verify|verify} messages.
             * @function encode
             * @memberof ironcorelabs.proto.UserOrGroup
             * @static
             * @param {ironcorelabs.proto.IUserOrGroup} message UserOrGroup message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UserOrGroup.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.userId != null && message.hasOwnProperty("userId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.userId);
                if (message.groupId != null && message.hasOwnProperty("groupId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.groupId);
                if (message.masterPublicKey != null && message.hasOwnProperty("masterPublicKey"))
                    $root.ironcorelabs.proto.PublicKey.encode(message.masterPublicKey, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified UserOrGroup message, length delimited. Does not implicitly {@link ironcorelabs.proto.UserOrGroup.verify|verify} messages.
             * @function encodeDelimited
             * @memberof ironcorelabs.proto.UserOrGroup
             * @static
             * @param {ironcorelabs.proto.IUserOrGroup} message UserOrGroup message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UserOrGroup.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            return UserOrGroup;
        })();

        proto.EncryptedDekData = (function() {

            /**
             * Properties of an EncryptedDekData.
             * @memberof ironcorelabs.proto
             * @interface IEncryptedDekData
             * @property {Uint8Array|null} [encryptedBytes] EncryptedDekData encryptedBytes
             * @property {ironcorelabs.proto.IPublicKey|null} [ephemeralPublicKey] EncryptedDekData ephemeralPublicKey
             * @property {Uint8Array|null} [signature] EncryptedDekData signature
             * @property {Uint8Array|null} [authHash] EncryptedDekData authHash
             * @property {Uint8Array|null} [publicSigningKey] EncryptedDekData publicSigningKey
             */

            /**
             * Constructs a new EncryptedDekData.
             * @memberof ironcorelabs.proto
             * @classdesc Represents an EncryptedDekData.
             * @implements IEncryptedDekData
             * @constructor
             * @param {ironcorelabs.proto.IEncryptedDekData=} [properties] Properties to set
             */
            function EncryptedDekData(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EncryptedDekData encryptedBytes.
             * @member {Uint8Array} encryptedBytes
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @instance
             */
            EncryptedDekData.prototype.encryptedBytes = $util.newBuffer([]);

            /**
             * EncryptedDekData ephemeralPublicKey.
             * @member {ironcorelabs.proto.IPublicKey|null|undefined} ephemeralPublicKey
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @instance
             */
            EncryptedDekData.prototype.ephemeralPublicKey = null;

            /**
             * EncryptedDekData signature.
             * @member {Uint8Array} signature
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @instance
             */
            EncryptedDekData.prototype.signature = $util.newBuffer([]);

            /**
             * EncryptedDekData authHash.
             * @member {Uint8Array} authHash
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @instance
             */
            EncryptedDekData.prototype.authHash = $util.newBuffer([]);

            /**
             * EncryptedDekData publicSigningKey.
             * @member {Uint8Array} publicSigningKey
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @instance
             */
            EncryptedDekData.prototype.publicSigningKey = $util.newBuffer([]);

            /**
             * Encodes the specified EncryptedDekData message. Does not implicitly {@link ironcorelabs.proto.EncryptedDekData.verify|verify} messages.
             * @function encode
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @static
             * @param {ironcorelabs.proto.IEncryptedDekData} message EncryptedDekData message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDekData.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.encryptedBytes != null && message.hasOwnProperty("encryptedBytes"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.encryptedBytes);
                if (message.ephemeralPublicKey != null && message.hasOwnProperty("ephemeralPublicKey"))
                    $root.ironcorelabs.proto.PublicKey.encode(message.ephemeralPublicKey, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.signature != null && message.hasOwnProperty("signature"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.signature);
                if (message.authHash != null && message.hasOwnProperty("authHash"))
                    writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.authHash);
                if (message.publicSigningKey != null && message.hasOwnProperty("publicSigningKey"))
                    writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.publicSigningKey);
                return writer;
            };

            /**
             * Encodes the specified EncryptedDekData message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDekData.verify|verify} messages.
             * @function encodeDelimited
             * @memberof ironcorelabs.proto.EncryptedDekData
             * @static
             * @param {ironcorelabs.proto.IEncryptedDekData} message EncryptedDekData message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDekData.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            return EncryptedDekData;
        })();

        proto.EncryptedDek = (function() {

            /**
             * Properties of an EncryptedDek.
             * @memberof ironcorelabs.proto
             * @interface IEncryptedDek
             * @property {ironcorelabs.proto.IUserOrGroup|null} [userOrGroup] EncryptedDek userOrGroup
             * @property {ironcorelabs.proto.IEncryptedDekData|null} [encryptedDekData] EncryptedDek encryptedDekData
             */

            /**
             * Constructs a new EncryptedDek.
             * @memberof ironcorelabs.proto
             * @classdesc Represents an EncryptedDek.
             * @implements IEncryptedDek
             * @constructor
             * @param {ironcorelabs.proto.IEncryptedDek=} [properties] Properties to set
             */
            function EncryptedDek(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EncryptedDek userOrGroup.
             * @member {ironcorelabs.proto.IUserOrGroup|null|undefined} userOrGroup
             * @memberof ironcorelabs.proto.EncryptedDek
             * @instance
             */
            EncryptedDek.prototype.userOrGroup = null;

            /**
             * EncryptedDek encryptedDekData.
             * @member {ironcorelabs.proto.IEncryptedDekData|null|undefined} encryptedDekData
             * @memberof ironcorelabs.proto.EncryptedDek
             * @instance
             */
            EncryptedDek.prototype.encryptedDekData = null;

            /**
             * Encodes the specified EncryptedDek message. Does not implicitly {@link ironcorelabs.proto.EncryptedDek.verify|verify} messages.
             * @function encode
             * @memberof ironcorelabs.proto.EncryptedDek
             * @static
             * @param {ironcorelabs.proto.IEncryptedDek} message EncryptedDek message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDek.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.userOrGroup != null && message.hasOwnProperty("userOrGroup"))
                    $root.ironcorelabs.proto.UserOrGroup.encode(message.userOrGroup, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.encryptedDekData != null && message.hasOwnProperty("encryptedDekData"))
                    $root.ironcorelabs.proto.EncryptedDekData.encode(message.encryptedDekData, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified EncryptedDek message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDek.verify|verify} messages.
             * @function encodeDelimited
             * @memberof ironcorelabs.proto.EncryptedDek
             * @static
             * @param {ironcorelabs.proto.IEncryptedDek} message EncryptedDek message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDek.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            return EncryptedDek;
        })();

        proto.EncryptedDeks = (function() {

            /**
             * Properties of an EncryptedDeks.
             * @memberof ironcorelabs.proto
             * @interface IEncryptedDeks
             * @property {Array.<ironcorelabs.proto.IEncryptedDek>|null} [edeks] EncryptedDeks edeks
             * @property {string|null} [documentId] EncryptedDeks documentId
             * @property {number|null} [segmentId] EncryptedDeks segmentId
             */

            /**
             * Constructs a new EncryptedDeks.
             * @memberof ironcorelabs.proto
             * @classdesc Represents an EncryptedDeks.
             * @implements IEncryptedDeks
             * @constructor
             * @param {ironcorelabs.proto.IEncryptedDeks=} [properties] Properties to set
             */
            function EncryptedDeks(properties) {
                this.edeks = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * EncryptedDeks edeks.
             * @member {Array.<ironcorelabs.proto.IEncryptedDek>} edeks
             * @memberof ironcorelabs.proto.EncryptedDeks
             * @instance
             */
            EncryptedDeks.prototype.edeks = $util.emptyArray;

            /**
             * EncryptedDeks documentId.
             * @member {string} documentId
             * @memberof ironcorelabs.proto.EncryptedDeks
             * @instance
             */
            EncryptedDeks.prototype.documentId = "";

            /**
             * EncryptedDeks segmentId.
             * @member {number} segmentId
             * @memberof ironcorelabs.proto.EncryptedDeks
             * @instance
             */
            EncryptedDeks.prototype.segmentId = 0;

            /**
             * Encodes the specified EncryptedDeks message. Does not implicitly {@link ironcorelabs.proto.EncryptedDeks.verify|verify} messages.
             * @function encode
             * @memberof ironcorelabs.proto.EncryptedDeks
             * @static
             * @param {ironcorelabs.proto.IEncryptedDeks} message EncryptedDeks message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDeks.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.edeks != null && message.edeks.length)
                    for (let i = 0; i < message.edeks.length; ++i)
                        $root.ironcorelabs.proto.EncryptedDek.encode(message.edeks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.documentId != null && message.hasOwnProperty("documentId"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.documentId);
                if (message.segmentId != null && message.hasOwnProperty("segmentId"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.segmentId);
                return writer;
            };

            /**
             * Encodes the specified EncryptedDeks message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDeks.verify|verify} messages.
             * @function encodeDelimited
             * @memberof ironcorelabs.proto.EncryptedDeks
             * @static
             * @param {ironcorelabs.proto.IEncryptedDeks} message EncryptedDeks message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            EncryptedDeks.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            return EncryptedDeks;
        })();

        return proto;
    })();

    return ironcorelabs;
})();

export { $root as default };

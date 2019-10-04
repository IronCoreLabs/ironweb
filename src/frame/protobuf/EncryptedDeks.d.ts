import * as $protobuf from "protobufjs";
/** Namespace ironcorelabs. */
export namespace ironcorelabs {

    /** Namespace proto. */
    namespace proto {

        /** Properties of a PublicKey. */
        interface IPublicKey {

            /** PublicKey x */
            x?: (Uint8Array|null);

            /** PublicKey y */
            y?: (Uint8Array|null);
        }

        /** Represents a PublicKey. */
        class PublicKey implements IPublicKey {

            /**
             * Constructs a new PublicKey.
             * @param [properties] Properties to set
             */
            constructor(properties?: ironcorelabs.proto.IPublicKey);

            /** PublicKey x. */
            public x: Uint8Array;

            /** PublicKey y. */
            public y: Uint8Array;

            /**
             * Encodes the specified PublicKey message. Does not implicitly {@link ironcorelabs.proto.PublicKey.verify|verify} messages.
             * @param message PublicKey message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: ironcorelabs.proto.IPublicKey, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified PublicKey message, length delimited. Does not implicitly {@link ironcorelabs.proto.PublicKey.verify|verify} messages.
             * @param message PublicKey message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: ironcorelabs.proto.IPublicKey, writer?: $protobuf.Writer): $protobuf.Writer;
        }

        /** Properties of a UserOrGroup. */
        interface IUserOrGroup {

            /** UserOrGroup userId */
            userId?: (string|null);

            /** UserOrGroup groupId */
            groupId?: (string|null);

            /** UserOrGroup masterPublicKey */
            masterPublicKey?: (ironcorelabs.proto.IPublicKey|null);
        }

        /** Represents a UserOrGroup. */
        class UserOrGroup implements IUserOrGroup {

            /**
             * Constructs a new UserOrGroup.
             * @param [properties] Properties to set
             */
            constructor(properties?: ironcorelabs.proto.IUserOrGroup);

            /** UserOrGroup userId. */
            public userId: string;

            /** UserOrGroup groupId. */
            public groupId: string;

            /** UserOrGroup masterPublicKey. */
            public masterPublicKey?: (ironcorelabs.proto.IPublicKey|null);

            /** UserOrGroup UserOrGroupId. */
            public UserOrGroupId?: ("userId"|"groupId");

            /**
             * Encodes the specified UserOrGroup message. Does not implicitly {@link ironcorelabs.proto.UserOrGroup.verify|verify} messages.
             * @param message UserOrGroup message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: ironcorelabs.proto.IUserOrGroup, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified UserOrGroup message, length delimited. Does not implicitly {@link ironcorelabs.proto.UserOrGroup.verify|verify} messages.
             * @param message UserOrGroup message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: ironcorelabs.proto.IUserOrGroup, writer?: $protobuf.Writer): $protobuf.Writer;
        }

        /** Properties of an EncryptedDekData. */
        interface IEncryptedDekData {

            /** EncryptedDekData encryptedBytes */
            encryptedBytes?: (Uint8Array|null);

            /** EncryptedDekData ephemeralPublicKey */
            ephemeralPublicKey?: (ironcorelabs.proto.IPublicKey|null);

            /** EncryptedDekData signature */
            signature?: (Uint8Array|null);

            /** EncryptedDekData authHash */
            authHash?: (Uint8Array|null);

            /** EncryptedDekData publicSigningKey */
            publicSigningKey?: (Uint8Array|null);
        }

        /** Represents an EncryptedDekData. */
        class EncryptedDekData implements IEncryptedDekData {

            /**
             * Constructs a new EncryptedDekData.
             * @param [properties] Properties to set
             */
            constructor(properties?: ironcorelabs.proto.IEncryptedDekData);

            /** EncryptedDekData encryptedBytes. */
            public encryptedBytes: Uint8Array;

            /** EncryptedDekData ephemeralPublicKey. */
            public ephemeralPublicKey?: (ironcorelabs.proto.IPublicKey|null);

            /** EncryptedDekData signature. */
            public signature: Uint8Array;

            /** EncryptedDekData authHash. */
            public authHash: Uint8Array;

            /** EncryptedDekData publicSigningKey. */
            public publicSigningKey: Uint8Array;

            /**
             * Encodes the specified EncryptedDekData message. Does not implicitly {@link ironcorelabs.proto.EncryptedDekData.verify|verify} messages.
             * @param message EncryptedDekData message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: ironcorelabs.proto.IEncryptedDekData, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptedDekData message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDekData.verify|verify} messages.
             * @param message EncryptedDekData message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: ironcorelabs.proto.IEncryptedDekData, writer?: $protobuf.Writer): $protobuf.Writer;
        }

        /** Properties of an EncryptedDek. */
        interface IEncryptedDek {

            /** EncryptedDek userOrGroup */
            userOrGroup?: (ironcorelabs.proto.IUserOrGroup|null);

            /** EncryptedDek encryptedDekData */
            encryptedDekData?: (ironcorelabs.proto.IEncryptedDekData|null);
        }

        /** Represents an EncryptedDek. */
        class EncryptedDek implements IEncryptedDek {

            /**
             * Constructs a new EncryptedDek.
             * @param [properties] Properties to set
             */
            constructor(properties?: ironcorelabs.proto.IEncryptedDek);

            /** EncryptedDek userOrGroup. */
            public userOrGroup?: (ironcorelabs.proto.IUserOrGroup|null);

            /** EncryptedDek encryptedDekData. */
            public encryptedDekData?: (ironcorelabs.proto.IEncryptedDekData|null);

            /**
             * Encodes the specified EncryptedDek message. Does not implicitly {@link ironcorelabs.proto.EncryptedDek.verify|verify} messages.
             * @param message EncryptedDek message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: ironcorelabs.proto.IEncryptedDek, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptedDek message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDek.verify|verify} messages.
             * @param message EncryptedDek message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: ironcorelabs.proto.IEncryptedDek, writer?: $protobuf.Writer): $protobuf.Writer;
        }

        /** Properties of an EncryptedDeks. */
        interface IEncryptedDeks {

            /** EncryptedDeks edeks */
            edeks?: (ironcorelabs.proto.IEncryptedDek[]|null);

            /** EncryptedDeks documentId */
            documentId?: (string|null);

            /** EncryptedDeks segmentId */
            segmentId?: (number|null);
        }

        /** Represents an EncryptedDeks. */
        class EncryptedDeks implements IEncryptedDeks {

            /**
             * Constructs a new EncryptedDeks.
             * @param [properties] Properties to set
             */
            constructor(properties?: ironcorelabs.proto.IEncryptedDeks);

            /** EncryptedDeks edeks. */
            public edeks: ironcorelabs.proto.IEncryptedDek[];

            /** EncryptedDeks documentId. */
            public documentId: string;

            /** EncryptedDeks segmentId. */
            public segmentId: number;

            /**
             * Encodes the specified EncryptedDeks message. Does not implicitly {@link ironcorelabs.proto.EncryptedDeks.verify|verify} messages.
             * @param message EncryptedDeks message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: ironcorelabs.proto.IEncryptedDeks, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified EncryptedDeks message, length delimited. Does not implicitly {@link ironcorelabs.proto.EncryptedDeks.verify|verify} messages.
             * @param message EncryptedDeks message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: ironcorelabs.proto.IEncryptedDeks, writer?: $protobuf.Writer): $protobuf.Writer;
        }
    }
}

import {BlindSearchIndex} from "../../../ironweb";
import * as MT from "../../FrameMessageTypes";
import * as FrameMediator from "../FrameMediator";
import * as ShimUtils from "../ShimUtils";

/**
 * Class that is used to represent an initialized search index. Holds the search index ID (which is just a random ID used in the
 * frames decrypted salt in-memory cache) so it can pass that down to the frame when tokenizing data.
 */
class InitializedSearchIndex {
    private searchIndexId: string;
    constructor(searchIndexId: string) {
        this.searchIndexId = searchIndexId;
    }

    tokenizeData(data: string, partitionId?: string) {
        return FrameMediator.sendMessage<MT.BlindSearchIndexTokenizeDataResponse>({
            type: "BLIND_SEARCH_INDEX_TOKENIZE_DATA",
            message: {
                data,
                partitionId,
                searchIndexId: this.searchIndexId,
            },
        })
            .map(({message}) => message)
            .toPromise();
    }

    tokenizeQuery(query: string, partitionId?: string) {
        return FrameMediator.sendMessage<MT.BlindSearchIndexTokenizeDataResponse>({
            type: "BLIND_SEARCH_INDEX_TOKENIZE_QUERY",
            message: {
                query,
                partitionId,
                searchIndexId: this.searchIndexId,
            },
        })
            .map(({message}) => message)
            .toPromise();
    }
}

/**
 * Create a new blind search index and allow it to be decryptable by the provided group members. Creates and encrypts a new unmanaged
 * document which is returned to the caller to store.
 */
export const createBlindSearchIndex = (groupId: string): Promise<BlindSearchIndex> => {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateID(groupId);
    return FrameMediator.sendMessage<MT.BlindSearchIndexCreateResponse>({type: "BLIND_SEARCH_INDEX_CREATE", message: {groupId}})
        .map(({message}) => message)
        .toPromise();
};

/**
 * Initialize a blind search index using the fields returned from the createBlindSearchIndex method. Resolves with an instance of the
 * InitializedSearchIndex class which
 */
export const initializeBlindSearchIndex = (index: BlindSearchIndex): Promise<InitializedSearchIndex> => {
    ShimUtils.checkSDKInitialized();
    ShimUtils.validateDocumentData(index.searchIndexEncryptedSalt);
    ShimUtils.validateDocumentData(index.searchIndexEdeks);

    return FrameMediator.sendMessage<MT.BlindSearchIndexInitResponse>({type: "BLIND_SEARCH_INDEX_INIT", message: {...index}})
        .map(({message}) => new InitializedSearchIndex(message.searchIndexId))
        .toPromise();
};

/**
 * Transliterate the provided string by latinizing each character and removing all special characters.
 */
export const transliterateString = (string: string): Promise<string> => {
    return FrameMediator.sendMessage<MT.SearchTransliterateStringResponse>({type: "SEARCH_TRANSLITERATE_STRING", message: string})
        .map(({message}) => message)
        .toPromise();
};

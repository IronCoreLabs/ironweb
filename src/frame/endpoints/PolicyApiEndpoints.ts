import {ErrorCodes} from "../../Constants";
import * as ApiRequest from "../ApiRequest";
import ApiState from "../ApiState";
import Future from "futurejs";
import {SDKError} from "../../shim";
import {UserOrGroup, Policy} from "ironweb";

export type UserOrGroupWithKey = UserOrGroup & {masterPublicKey: PublicKey<string>};

interface PolicyApplyResponse {
    usersAndGroups: UserOrGroupWithKey[];
    invalidUsersAndGroups: UserOrGroup[];
}

/**
 * Generate signature message from current user state
 */
function getSignatureHeader() {
    const {segmentId, id} = ApiState.user();
    return ApiRequest.getRequestSignature(segmentId, id, ApiState.signingKeys());
}

/**
 * Transform one of the edeks for the logged in user.
 * @param {Uint8Array} edeks The encrypted deks to send.
 */
export function applyPolicy(req: Policy) {
    const classification = req.classification !== undefined ? [`classification=${encodeURIComponent(req.classification)}`] : [];
    const category = req.category !== undefined ? [`category=${encodeURIComponent(req.category)}`] : [];
    const dataSubject = req.dataSubject !== undefined ? [`dataSubject=${encodeURIComponent(req.dataSubject)}`] : [];
    const id = req.substituteId !== undefined ? [`id=${encodeURIComponent(req.substituteId)}`] : [];

    const params = [...classification, ...category, ...dataSubject, ...id].join(`&`);
    return {
        url: `policies?${params}`,
        options: {
            method: "GET",
        },
        errorCode: ErrorCodes.POLICY_APPLY_REQUEST_FAILURE,
    };
}

export default {
    /**
     * Call the `policies` endpoint passing all the set values in the `policyApplyRequest` as needed.
     * @param policyApplyRequest - The policy which you want to get users and groups for
     */
    callApplyPolicyApi(policyApplyRequest?: Policy): Future<SDKError, PolicyApplyResponse> {
        if (policyApplyRequest === undefined) {
            return Future.of<PolicyApplyResponse>({usersAndGroups: [], invalidUsersAndGroups: []});
        }

        const {url, options, errorCode} = applyPolicy(policyApplyRequest);
        return ApiRequest.fetchJSON(url, errorCode, options, getSignatureHeader());
    },
};

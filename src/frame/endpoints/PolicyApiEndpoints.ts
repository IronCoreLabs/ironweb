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
 * Create the policy apply request based on the `policy`.
 * @param policy The policy to be applied.
 */
export function applyPolicy(policy: Policy) {
    const classification = policy.classification !== undefined ? [`classification=${encodeURIComponent(policy.classification)}`] : [];
    const category = policy.category !== undefined ? [`category=${encodeURIComponent(policy.category)}`] : [];
    const dataSubject = policy.dataSubject !== undefined ? [`dataSubject=${encodeURIComponent(policy.dataSubject)}`] : [];
    const id = policy.substituteId !== undefined ? [`id=${encodeURIComponent(policy.substituteId)}`] : [];

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

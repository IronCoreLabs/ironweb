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
    const category = policy.category ? [`category=${encodeURIComponent(policy.category)}`] : [];
    const sensitivity = policy.sensitivity ? [`sensitivity=${encodeURIComponent(policy.sensitivity)}`] : [];
    const dataSubject = policy.dataSubject ? [`dataSubject=${encodeURIComponent(policy.dataSubject)}`] : [];
    const substituteId = policy.substituteUser ? [`substituteId=${encodeURIComponent(policy.substituteUser)}`] : [];

    const params = [...sensitivity, ...category, ...dataSubject, ...substituteId].join(`&`);
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

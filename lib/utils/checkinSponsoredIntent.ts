import { PAYOUT_CLAIMS_CHAIN_ID } from "@/lib/config/payoutClaims";
import { PAYOUT_CLAIM_CONTRACT } from "@/lib/config/wagmi";

export interface SponsoredCheckinClaimPayload {
  user: `0x${string}`;
  day: number;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
}

export const buildSponsoredCheckinIntentMessage = (
  claim: SponsoredCheckinClaimPayload
) => {
  return [
    "Chess Puzzles Sponsored Check-In Claim",
    `contract:${PAYOUT_CLAIM_CONTRACT.toLowerCase()}`,
    `chainId:${PAYOUT_CLAIMS_CHAIN_ID}`,
    `user:${claim.user.toLowerCase()}`,
    `day:${claim.day}`,
    `nonce:${claim.nonce}`,
    `deadline:${claim.deadline}`,
    `signature:${claim.signature.toLowerCase()}`,
  ].join("\n");
};

import { celo } from "viem/chains";
import { PAYOUT_CLAIM_CONTRACT } from "@workspace/contracts";

// Re-export ABIs and types from shared contracts package
export { PAYOUT_CLAIMS_ABI, ERC20_METADATA_ABI, CHECK_IN_CLAIM_TYPES } from "@workspace/contracts";

export const PAYOUT_CLAIMS_CHAIN_ID = celo.id;
export const CHECKIN_RESERVATION_TTL_MINUTES = 10;
export const CHECKIN_SIGNATURE_TTL_SECONDS = 10 * 60;
export const DAILY_CHALLENGE_MIN_RATING = 2000;
export const DAILY_CHALLENGE_MAX_RATING = 3000;

export const PAYOUT_CLAIMS_EIP712_DOMAIN = {
  name: "MiniPayPayoutClaims",
  version: "1",
  chainId: PAYOUT_CLAIMS_CHAIN_ID,
  verifyingContract: PAYOUT_CLAIM_CONTRACT as `0x${string}`,
} as const;

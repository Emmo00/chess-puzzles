import { celo } from "viem/chains";

import { PAYOUT_CLAIM_CONTRACT } from "./wagmi";

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

export const PAYOUT_CLAIMS_ABI = [
  {
    type: "function",
    name: "serverSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "eip712Domain",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "payoutToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "checkInAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxDailyCheckIns",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimDailyCheckIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "day", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const ERC20_METADATA_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const CHECK_IN_CLAIM_TYPES = {
  CheckInClaim: [
    { name: "user", type: "address" },
    { name: "day", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

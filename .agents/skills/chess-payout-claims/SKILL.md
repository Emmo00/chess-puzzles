---
name: chess-payout-claims
description: Integration guide for connecting backend services and MiniPay apps to payout and revenue-collection contracts on Celo. Use when building signed claim flows, funding operations, treasury sweeps, or claim monitoring.
license: Apache-2.0
compatibility: Requires EVM RPC access, an ethers-compatible backend signer, and optional Foundry/cast tooling for operational scripts.
metadata:
  author: project-team
  version: "2.0.0"
---

# Chess Payout Claims Integration Skill

This skill is written for teams integrating with deployed contracts, not for editing contract source code.

## Scope

Use this skill when you need to:

- Integrate a MiniPay app with signed claim endpoints
- Build backend signing for daily check-ins and leaderboard rewards
- Operate token funding and withdrawals safely
- Integrate platform revenue collection and treasury sweeps
- Monitor claim and treasury events

## Contract Roles

### Claims Contract

The claims contract has two user claim paths:

- Daily check-in claims: fixed payout, one per user per day, global daily cap
- Leaderboard claims: variable payout, one-time claim ID

It verifies backend-issued EIP-712 signatures and transfers ERC20 payouts to users.

### Revenue Collector Contract

The revenue collector contract accepts ERC20 deposits and supports owner-managed withdrawals.

Typical usage:

- Application collects token revenue into collector contract
- Operator sweeps funds to treasury wallet
- Treasury funds claims contract for user payouts

## Integration Prerequisites

Collect and store these values in your backend config:

- claimsContract: deployed claims contract address
- revenueCollectorContract: deployed revenue collector address
- payoutToken: ERC20 token address used for payouts and/or revenue
- chainId: Celo Mainnet 42220 or Celo Sepolia 11142220
- serverSignerPrivateKey: backend signing key for claims
- ownerOperatorKey: privileged key for admin operations

## Daily Check-In Flow

1. Backend computes the current day as Unix days: floor(timestamp / 86400).
2. Backend creates a payload with user, day, nonce, deadline.
3. Backend signs the payload with EIP-712 typed data.
4. Frontend sends the signed payload to the user wallet call.
5. User submits on-chain daily claim transaction.
6. App listens for claim event confirmation and updates UI.

Required payload fields:

- user: claimant address
- day: UTC day number
- nonce: backend-generated uniqueness value
- deadline: Unix timestamp expiry

## Leaderboard Claim Flow

1. Backend computes user reward amount and claim ID.
2. Backend creates payload with user, amount, claimId, nonce, deadline.
3. Backend signs with EIP-712 typed data.
4. User submits on-chain leaderboard claim.
5. Backend marks claim ID as consumed in off-chain records after success.

Required payload fields:

- user: claimant address
- amount: payout token amount in base units
- claimId: unique identifier for payout record
- nonce: backend-generated uniqueness value
- deadline: Unix timestamp expiry

## Revenue Collector Flow

Recommended operations model:

1. Revenue intake: user approves token allowance, then calls deposit(token, amount).
2. Balance checks: operator reads tokenBalance(token).
3. Treasury routing: owner calls withdrawAllToTreasury(token) on schedule.
4. Controlled payouts: owner can use withdraw(token, to, amount) for manual transfers.
5. Treasury updates: owner rotates treasury using setTreasury(newTreasury).

Operational guardrails:

- Enforce allowed token list in backend and app UI
- Require multisig ownership for production treasury control
- Emit and index deposit/withdraw events for accounting

## EIP-712 Signing Reference

Domain values must match deployment exactly:

- name: MiniPayPayoutClaims
- version: 1
- chainId: active chain ID
- verifyingContract: claims contract address

Typed data definitions:

- CheckInClaim(address user,uint256 day,uint256 nonce,uint256 deadline)
- LeaderboardClaim(address user,uint256 amount,bytes32 claimId,uint256 nonce,uint256 deadline)

## Error Handling Expectations

Client and backend should handle these contract reverts as product states:

- SignatureExpired: claim link/request expired
- InvalidSigner: backend signature mismatch or wrong signer key
- AlreadyClaimedToday: daily claim already used by this user
- DailyLimitReached: first-N daily cap exhausted
- LeaderboardClaimAlreadyUsed: payout already consumed
- InsufficientContractBalance: claims contract needs funding

## Security Expectations for Integrators

- Keep signing key in KMS/HSM and never in frontend apps
- Use short signature validity windows
- Use unique claim IDs and robust nonce generation
- Rotate signer key periodically and on suspicion
- Monitor unusually large leaderboard amounts
- Require multisig for owner-level treasury actions

## Code Examples

Use these bundled examples for integration templates:

- Typed-data signing example: scripts/sign-typed-data.mjs
- Claim submission and collector operations with cast: scripts/cast-operations.sh

These files are templates for integrators and should be adapted to your backend policies and deployment addresses.

## Event Monitoring Checklist

Index these events for product and accounting systems:

- Daily check-in claim event
- Leaderboard claim event
- Signer update and payout parameter update events
- Revenue deposit and withdrawal events
- Treasury address update event

## Quick Validation Steps

After integration is wired:

1. Generate a short-lived check-in signature and submit from a test wallet.
2. Verify second same-day claim fails.
3. Submit a leaderboard claim, then attempt claim ID replay.
4. Confirm revenue deposit and treasury sweep emit expected events.
5. Simulate low-balance claims contract and verify graceful error handling.

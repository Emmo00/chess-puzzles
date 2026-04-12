#!/usr/bin/env bash
set -euo pipefail

# Example integration operations with cast.
# Required env vars:
# RPC_URL, PRIVATE_KEY, CLAIMS_CONTRACT, REVENUE_COLLECTOR, TOKEN

: "${RPC_URL:?Missing RPC_URL}"
: "${PRIVATE_KEY:?Missing PRIVATE_KEY}"
: "${CLAIMS_CONTRACT:?Missing CLAIMS_CONTRACT}"
: "${REVENUE_COLLECTOR:?Missing REVENUE_COLLECTOR}"
: "${TOKEN:?Missing TOKEN}"

# Claim payload fields (set these from backend output)
USER="${USER:-0x0000000000000000000000000000000000000000}"
DAY="${DAY:-0}"
NONCE="${NONCE:-1}"
DEADLINE="${DEADLINE:-0}"
SIGNATURE="${SIGNATURE:-0x}"

# Leaderboard payload fields
AMOUNT="${AMOUNT:-0}"
CLAIM_ID="${CLAIM_ID:-0x0000000000000000000000000000000000000000000000000000000000000000}"

# Revenue collector operations
DEPOSIT_AMOUNT="${DEPOSIT_AMOUNT:-0}"
WITHDRAW_AMOUNT="${WITHDRAW_AMOUNT:-0}"
TREASURY="${TREASURY:-0x0000000000000000000000000000000000000000}"

echo "== Read claim contract settings =="
cast call "$CLAIMS_CONTRACT" "serverSigner()(address)" --rpc-url "$RPC_URL"
cast call "$CLAIMS_CONTRACT" "checkInAmount()(uint256)" --rpc-url "$RPC_URL"
cast call "$CLAIMS_CONTRACT" "maxDailyCheckIns()(uint256)" --rpc-url "$RPC_URL"

echo "== Daily claim submit (user wallet key required) =="
# Replace PRIVATE_KEY with user key if claiming as user directly.
cast send "$CLAIMS_CONTRACT" \
  "claimDailyCheckIn(uint256,uint256,uint256,bytes)" \
  "$DAY" "$NONCE" "$DEADLINE" "$SIGNATURE" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

echo "== Leaderboard claim submit =="
cast send "$CLAIMS_CONTRACT" \
  "claimLeaderboardPayout(uint256,bytes32,uint256,uint256,bytes)" \
  "$AMOUNT" "$CLAIM_ID" "$NONCE" "$DEADLINE" "$SIGNATURE" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

echo "== Revenue collector read =="
cast call "$REVENUE_COLLECTOR" "tokenBalance(address)(uint256)" "$TOKEN" --rpc-url "$RPC_URL"

echo "== Revenue collector withdraw =="
cast send "$REVENUE_COLLECTOR" \
  "withdraw(address,address,uint256)" \
  "$TOKEN" "$TREASURY" "$WITHDRAW_AMOUNT" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

echo "== Revenue collector treasury sweep =="
cast send "$REVENUE_COLLECTOR" \
  "withdrawAllToTreasury(address)" "$TOKEN" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY"

echo "Done."

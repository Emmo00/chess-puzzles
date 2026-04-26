---
name: chess-puzzles-store
description: Integration guide for managing daily puzzle IDs, user reservations, and puzzle attempts on-chain. Use when building backend services that update the game state and track user progress.
license: Apache-2.0
compatibility: Requires EVM RPC access and an authorized server wallet with the SERVER_ROLE.
metadata:
  author: project-team
  version: "1.0.0"
---

# Chess Puzzles Store Integration Skill

This skill is written for teams integrating with the `ChessPuzzlesStore` contract, focusing on backend state management and user progress tracking.

## Scope

Use this skill when you need to:

- Store the daily puzzle ID and reward metadata on-chain
- Manage user check-in reservations for daily challenges
- Record user puzzle attempts, completions, and points
- Monitor puzzle and reservation events for off-chain indexing

## Contract Roles

### SERVER_ROLE

The `SERVER_ROLE` is required for all state-modifying operations. This role should be held by the backend service's wallet. Authorized actions include:
- `setDailyPuzzle`: Publishing the puzzle of the day.
- `setReservation`: Managing user eligibility for daily rewards.
- `recordPuzzleAttempt`: Logging user activity and points.

### DEFAULT_ADMIN_ROLE

The admin role (initially the deployer) can grant or revoke the `SERVER_ROLE`.

## Integration Prerequisites

Collect and store these values in your backend config:

- `chessPuzzlesStore`: Deployed contract address.
- `serverWalletPrivateKey`: Private key of the wallet authorized with `SERVER_ROLE`.
- `chainId`: Celo Mainnet (42220) or Celo Sepolia (11142220).

## Core Integration Flows

### 1. Setting the Daily Puzzle

Every UTC day, the backend should publish the puzzle ID and its associated reward metadata.

**Function signature:**
`function setDailyPuzzle(uint256 utcDay, string calldata puzzleId, uint256 rewardAmount, uint256 maxCheckIns)`

**Steps:**
1. Compute the `utcDay` (e.g., UTC epoch day: `Math.floor(Date.now() / 86400000)`).
2. Call `setDailyPuzzle` with the Lichess `puzzleId`, the reward in Wei, and the max allowed check-ins for the day.

> [!IMPORTANT]
> Detailed puzzle data (FEN, moves, rating) is no longer stored on-chain to save gas. The backend is responsible for providing this data to the frontend via an API.

### 2. Managing Reservations

Reservations track user progress towards earning a daily check-in reward.

**Function signature:**
`function setReservation(uint256 utcDay, address user, ReservationStatus status, uint256 rewardAmount, uint256 solvedAt)`

**Statuses:**
- `None`, `Pending`, `Earned`, `Claiming`, `Claimed`, `Expired`, `Failed`

**Flow:**
1. When a user starts a challenge, set status to `Pending`.
2. When a user solves the puzzle, update status to `Earned` and record the `solvedAt` timestamp.
3. Once the reward is claimed via `PayoutClaims`, update status to `Claimed`.

### 3. Recording Puzzle Attempts

For both daily and random puzzles, the backend logs user performance.

**Function signature:**
`function recordPuzzleAttempt(address user, string calldata puzzleId, bool completed, uint256 attempts, uint256 points, uint256 solvedAt)`

**Usage:**
- Log every completion or attempt to maintain a permanent on-chain record of user activity.
- These records can be used for off-chain leaderboards or achievement systems.

## Event Monitoring Checklist

Index these events to sync your off-chain database with the contract state:

- `DailyPuzzleSet(uint256 indexed utcDay, string puzzleId)`
- `ReservationSet(uint256 indexed utcDay, address indexed user, ReservationStatus status)`
- `PuzzleAttemptRecorded(string indexed puzzleId, address indexed user, bool completed)`

## Error Handling

Handle these common reverts in your backend logic:

- `AccessControlUnauthorizedAccount`: The calling wallet does not have the `SERVER_ROLE`.
- `Transaction reverted`: Check if the `utcDay` or `puzzleId` parameters are valid.

## Security Best Practices

- Keep the `SERVER_ROLE` private key in a secure environment (KMS/Vault).
- Only update reservations and attempts after successful off-chain validation of the user's solution.
- Monitor gas usage and set appropriate limits for batch operations.

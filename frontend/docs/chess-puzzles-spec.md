# Chess Puzzles: Feature and Gameplay Specification

## Executive Summary

Chess Puzzles is a mobile-first chess tactics game that combines daily puzzle practice, competitive progression, and optional on-chain rewards on the Celo network. Players connect a wallet, solve tactical positions by finding the expected move sequence, earn points based on puzzle difficulty and solving accuracy, maintain daily streaks, and compete on an all-time leaderboard.

The app has two primary game modes:

1. **Classic Mode** gives each player up to five puzzles per UTC day. It is the main points, streak, and leaderboard progression loop.
2. **Daily Challenge** gives all players a shared, high-rated puzzle each day. Early eligible solvers can reserve a limited reward slot, complete the challenge, and claim a token reward on Celo.

The experience is designed for MiniPay, Farcaster Mini Apps, and standard injected Celo wallets. It uses a bold neo-brutalist visual style, supports touch and desktop controls, and includes configurable puzzle difficulty, tactical themes, sound, social sharing, and post-solve analysis.

## Product Goals

- Make short daily chess training easy to start and complete on mobile.
- Reward skill and accuracy without preventing players from retrying mistakes.
- Encourage repeat play through daily limits, streaks, points, progression, and rankings.
- Use wallet identity without requiring a traditional username and password.
- Offer transparent, verifiable token rewards for a limited daily challenge.
- Allow players to tune classic puzzles to their preferred difficulty and tactical themes.

## Core Features

### Wallet and Player Identity

- Supports Celo mainnet.
- Supports MiniPay, Farcaster Mini App wallets, and injected browser wallets.
- Automatically links a Farcaster identity to the connected wallet when available.
- Uses the wallet address as the primary account identifier.
- Stores player statistics, settings, puzzle attempts, reservations, and payment or claim records.

### Interactive Chess Puzzle Board

- Loads tactical positions from FEN.
- Shows the opponent's setup move before giving control to the player.
- Automatically orients the board to the player's side.
- Accepts drag-and-drop moves and tap/click piece-to-square moves.
- Shows legal destination squares for the selected piece.
- Automatically plays the opponent's expected response after each correct move.
- Requires the player to complete the full expected tactical sequence.
- Provides distinct sound feedback for correct and incorrect moves.

### Wrong Moves and Retry

- Incorrect source and destination squares are highlighted in red.
- The board pauses after a wrong move.
- The player can use **Retry** to undo the incorrect move and continue from the previous valid position.
- Mistakes do not permanently fail the puzzle, but they reduce the points earned in Classic Mode.

### Hint System

Hints are revealed in two stages:

1. The first hint action highlights the piece that should move.
2. The second hint action highlights the destination square.

The hint resets after the next correct move. Fully revealing a move counts as a used hint and reduces the Classic Mode score.

### Post-Solve Analysis

- Players can move backward and forward through the recorded position history.
- Analysis includes the opening setup move, player moves, opponent replies, and incorrect attempts recorded during play.
- The completion result shows elapsed time, mistakes, hints used, and points earned.
- Players can close the completion dialog to inspect the solved line or immediately start the next puzzle.

### Classic Mode

- Provides up to five puzzles per player per UTC day.
- Resets the daily allowance at midnight UTC.
- Uses the player's saved rating range and enabled tactical themes when selecting puzzles.
- Displays puzzle themes and whose turn it is.
- Awards points after each completed puzzle.
- Updates total puzzles solved and daily streak statistics.
- Prevents additional Classic Mode puzzle starts after the daily limit is reached.

### Daily Challenge

- Publishes one shared challenge per UTC day.
- Selects a high-rated puzzle in the 2000-3000 rating range.
- Allows one completion per wallet per day.
- Displays the current reward amount and remaining reward slots.
- Lets early players reserve an available reward slot before solving.
- Uses a time-limited reservation for reward eligibility.
- Still allows play when reward slots are unavailable; the solve can continue to count toward streak and statistics.
- Marks an eligible completed reservation as claimable.
- Supports wallet-submitted and sponsored Celo claim transactions.
- Confirms the claim on-chain and stores the transaction hash.
- Links claimed transactions to the Celo block explorer.
- Uses confetti and status feedback for successful solves and claims.

### Points and Performance Scoring

Classic Mode points are calculated as:

`points awarded = base points x hint multiplier x mistake multiplier`

Base points by puzzle rating:

| Puzzle rating | Difficulty | Base points |
| --- | --- | ---: |
| Below 1000 | Easy | 10 |
| 1000-1399 | Medium | 25 |
| 1400-1799 | Hard | 50 |
| 1800 and above | Expert | 100 |

Hint multiplier:

| Hints used | Multiplier |
| ---: | ---: |
| 0 | 1.00 |
| 1 | 0.50 |
| 2 | 0.25 |
| 3 or more | 0.00 |

Mistake multiplier:

| Mistakes | Multiplier |
| ---: | ---: |
| 0 | 1.00 |
| 1 | 0.80 |
| 2 or more | 0.60 |

The final result is rounded to the nearest whole point.

### Streaks and Player Statistics

- A streak represents consecutive UTC days on which the player solves at least one puzzle.
- Solving again on the same day does not add another streak day.
- Missing a day resets the active streak when the player next solves.
- Tracks current streak, longest streak, last puzzle date, total puzzles solved, and total points.
- Presents the player's progress in a dedicated streak and statistics panel.

### Leaderboard

- Shows players with at least one completed puzzle.
- Ranks players primarily by total puzzles solved.
- Uses total points as the secondary ranking criterion.
- Displays the connected player's global rank separately.
- Supports paginated leaderboard browsing.

### Point Progression Map

- Represents the player's accumulated point total as sequential levels.
- Treats every level number as a point threshold rather than a named or repeated stage.
- Shows up to the latest 20 completed levels and the next 20 uncompleted levels.
- Centers the view on the next uncompleted level.
- Hides progression beyond the visible future window behind an animated cloud bank.
- Marks every fifth level as a chest milestone.
- Shows completed chest milestones as unlocked.

Chest contents and reward-claim behavior are not currently defined. The map presently provides the visual milestone and unlocked state only.

### Player Settings

- Sets a minimum and maximum Classic Mode puzzle rating.
- Enables or disables individual tactical themes.
- Groups themes into selectable categories.
- Ensures at least one tactical theme remains enabled.
- Stores gameplay settings per wallet.
- Enables or disables background music locally on the device.

### Social and Retention Features

- Generates a dedicated share page and Open Graph image for the Daily Challenge.
- Supports sharing completed Daily Challenges to Farcaster and X.
- Integrates Farcaster Mini App lifecycle and wallet linking.
- Stores Farcaster notification tokens.
- Supports daily, reminder, and administrative notification delivery.
- Provides direct Telegram support links on relevant error screens.

## Gameplay Description

### Starting the App

1. The player opens the app in MiniPay, Farcaster, or a compatible browser.
2. The player connects a Celo wallet. MiniPay and Farcaster connections may be initiated automatically by their host environment.
3. The home screen displays the wallet control, current streak, and navigation to puzzles, leaderboard, settings, and help.
4. Selecting **Puzzles** opens a choice between Daily Challenge and Classic Mode.

### Classic Mode Gameplay

1. The player enters Classic Mode and sees the number of puzzles already used from the five-puzzle daily allowance.
2. The player starts a new puzzle.
3. The app selects a puzzle matching the player's configured rating range and enabled themes.
4. The board loads the source position and automatically plays the opponent's first move.
5. The player finds the best response by dragging a piece or selecting a piece and destination square.
6. If the move is correct, the app records it and automatically plays the opponent's reply.
7. If the move is wrong, the attempted move is highlighted and play pauses until the player presses **Retry**.
8. If needed, the player can request a two-stage hint showing the piece and then the destination.
9. The sequence continues until every required player move is correct.
10. The app submits the completed result and calculates points using rating, mistakes, and hints.
11. The player's total points, puzzle count, streak, leaderboard standing, and map progression are updated.
12. The player can review the solution or continue to the next puzzle until the daily limit is reached.

### Daily Challenge Gameplay

1. The player opens the Daily Challenge and views the reward amount and remaining reward slots.
2. The player starts the challenge.
3. If a reward slot is available, the app creates a temporary reservation for that wallet. If no slot is available, the player may still solve without a token reward.
4. The shared high-rated daily position loads and follows the same move-validation, retry, hint, and opponent-response rules as Classic Mode.
5. When the full line is solved, the server verifies the puzzle completion.
6. Eligible players receive a claimable reward state.
7. The player switches to Celo if necessary and selects **Claim Reward**.
8. The app submits the signed claim through the wallet or uses the sponsored transaction fallback when appropriate.
9. After on-chain confirmation, the reward is marked claimed and the transaction can be viewed in the block explorer.
10. The player can share the completed challenge to Farcaster or X.
11. The player must wait until the next UTC day for a new Daily Challenge.

## Current Scope Notes

- Classic Mode currently allows five puzzles per UTC day.
- The active Daily Challenge reward amount and maximum number of rewarded players are read from the payout contract rather than fixed in the UI.
- A legacy cUSD daily-pass payment component exists in the codebase, but the current Classic Mode start flow is not gated by that payment UI.
- The progression map is available at `/map`, but it is not currently linked from the main home navigation.
- Chest milestones are visual progression markers; chest inventory, contents, opening interactions, and reward settlement remain to be specified.

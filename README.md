# Chess Puzzles

Chess Puzzles is a Next.js Mini App for solving chess puzzles with on-chain payment and reward flows on Celo. It includes daily challenges, streak tracking, leaderboard logic, and check-in claim APIs backed by MongoDB.

## What this app includes

- Daily challenge and puzzle-solving flows
- Streak, user stats, and leaderboard endpoints
- Celo wallet integration (MiniPay + injected wallets)
- Multi-currency Celo payment support (USDT, USDC, cUSD, cEUR, cREAL)
- Check-in reservation, solve, and signed claim endpoints
- Hidden admin operations page for payout/revenue contract operations

## Smart contract configuration

These values are currently defined in `lib/config/wagmi.ts`.

## Tech stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- MongoDB + Mongoose
- wagmi + viem on Celo mainnet
- react-chessboard + chess.js

## Prerequisites

- Node.js 18.18+ (Node.js 20+ recommended)
- pnpm (recommended) or npm
- MongoDB instance
- Celo wallet (MiniPay and/or injected wallet for browser testing)

## Quick start

1. Install dependencies

```bash
pnpm install
```

2. Create `.env.local`

```env
# Required
MONGO_CONNECTION_URL=mongodb://127.0.0.1:27017/chess-puzzles
PUZZLE_API_KEY=your_api_key_here

# Strongly recommended for chain reads/writes used by check-in APIs
CELO_RPC_URL=https://forno.celo.org

# Optional (fallback default is https://your-api-domain.com)
PUZZLE_API_URL=https://your-api-domain.com

# Optional (required only for server-signed check-in claim flows)
CHECKIN_SIGNER_PRIVATE_KEY=0xYourPrivatekey

# Required for game asset operations on the smart contract
# ASSET_CONSUMPTION_KEY=0x...  # Server wallet with CONSUMER_ROLE (spends user assets)
# ASSET_GRANTING_KEY=0x...     # Server wallet with ADMIN_ROLE (grants assets to users)

# Optional app metadata
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Optional hidden admin page settings
NEXT_PUBLIC_ADMIN_PAGE_KEY=
NEXT_PUBLIC_REVENUE_COLLECTOR_CONTRACT=
```

3. Run development server

```bash
pnpm dev
```

4. Open the app

- Local: http://localhost:3000
- MiniPay testing: deploy to HTTPS and open the deployed URL in the in-app browser

## Scripts

```bash
pnpm dev     # next dev --turbo
pnpm build   # next build
pnpm start   # next start
pnpm lint    # eslint .
```

If you prefer npm, replace `pnpm` with `npm run`.

## API surface (high level)

- `/api/puzzles/*` puzzle retrieval and solve flows
- `/api/checkin/*` reserve, solve, status, claim payload/confirm/sponsored flows
- `/api/payments/*` payment verification and status
- `/api/leaderboard` leaderboard reads
- `/api/users/*` streak and settings routes

The root API route returns service metadata at `/api`.

## Project structure

```text
app/
  api/
  daily-challenge/
  solve-puzzles/
  leaderboard/
components/
lib/
  config/
  hooks/
  models/
  services/
  utils/
abis/
```

## Additional docs

- MiniPay integration notes: `MINIPAY_INTEGRATION.md`
- External puzzle API doc reference: `api-documentation.md`

## License

MIT. See `LICENSE`.

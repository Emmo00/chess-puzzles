# ChessPuzzles

**ChessPuzzles** is a blockchain-integrated chess puzzle platform that brings engaging puzzle-solving experiences to the Celo network. Players can solve daily puzzles, participate in fast-paced “Puzzle Rush” sessions, track their progress, and earn rewards in `$CHESS`.

---

## Features

* **Core Puzzle Engine**: Solve daily chess puzzles and participate in timed Puzzle Rush challenges.
* **Streak & Progress Tracking**: Track daily activity and progress toward milestones.
* **Leaderboard Integration**: Compete with other users and rank on the top 100 leaderboard.
* **Celo Blockchain Hooks**: Anchor achievements on-chain and prepare for `$CHESS` reward distribution.
* **Premium Subscription Layer**: Unlock unlimited puzzle attempts for $1/month.
* **Basic User Flows**: Smooth navigation across Launch, Solve Puzzles, Puzzle Rush, Leaderboard, and Settings screens.
* **Reward Loop Prototype**: Testable model for distributing `$CHESS` rewards based on performance.

## 🚀 Setup Guide

### Prerequisites

- Node.js 18+ and npm
- Git
- MongoDB instance (local or cloud)
- MiniPay wallet (for testing) or any Celo-compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Emmo00/chess-puzzles.git
   cd chess-puzzles
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Connection
   MONGODB_URI=your_mongodb_connection_string
   
   # Next.js Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   
   # Optional: Analytics & Monitoring
   NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
   ```

4. **Database Setup**
   
   Make sure your MongoDB instance is running. The app will automatically create the required collections on first run.

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the App**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser or MiniPay.

### 📱 MiniPay Testing

To test the MiniPay integration:

1. Deploy to a public URL (Vercel, Netlify, etc.)
2. Open the deployed URL in MiniPay browser
3. The wallet should auto-connect without prompts
4. Test cUSD payments for puzzle access

### 🔧 Build for Production

```bash
npm run build
npm start
```

### 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Blockchain**: Wagmi, Viem, Celo SDK (@celo/abis, @celo/identity)
- **Database**: MongoDB with Mongoose
- **Payments**: cUSD on Celo blockchain
- **Authentication**: Wallet-based (MiniPay optimized)

### 📂 Key Files

```
├── lib/config/wagmi.ts        # Celo blockchain configuration
├── lib/hooks/usePayment.ts    # Payment processing hook
├── app/api/payments/          # Payment verification APIs
├── app/components/            # React components
└── MINIPAY_INTEGRATION.md     # Detailed MiniPay guide
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ |

### 🚀 Deployment

**Vercel (Recommended)**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

**Other Platforms**: Netlify, Railway, Heroku, DigitalOcean

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

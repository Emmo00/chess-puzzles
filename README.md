# ChessPuzzles

**ChessPuzzles** is a blockchain-integrated chess puzzle platform that brings engaging puzzle-solving experiences to the Celo network. Players can solve daily puzzles, participate in fast-paced “Puzzle Rush” sessions, track their progress, and earn rewards in `$CHESS`.

---

## Smart Contract

[0xEA22ca862C3AFDA79Ef7Fb5Ae8f13D245354f05b](https://celoscan.io/address/0xEA22ca862C3AFDA79Ef7Fb5Ae8f13D245354f05b#code)

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

   # puzzle api setup
   PUZZLE_API_URL=chess-puzzles.p.rapidapi.com
   PUZZLE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
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

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Chess Engine**: react-chessboard 5.8.6, chess.js for game logic
- **Blockchain**: Wagmi, Viem, Celo SDK for cUSD payments
- **Database**: MongoDB with Mongoose ODM
- **Payments**: MiniPay integration with cUSD on Celo
- **UI Components**: Radix UI, Lucide icons, custom animations

## 📂 Project Structure

```
├── app/
│   ├── api/                   # API routes
│   │   ├── payments/          # Payment verification
│   │   ├── puzzles/           # Puzzle data endpoints
│   │   └── users/             # User management
│   ├── daily/                 # Main puzzle interface
│   └── demo-video/            # Demo redirect
├── components/
│   ├── chess-board.tsx        # Interactive chess component
│   ├── PaymentModal.tsx       # cUSD payment interface
│   └── paywall-card.tsx       # Access control UI
├── lib/
│   ├── config/wagmi.ts        # Celo blockchain config
│   ├── hooks/                 # React hooks
│   ├── services/              # API services
│   └── db.ts                  # MongoDB connection
└── MINIPAY_INTEGRATION.md     # MiniPay setup guide
```

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `MONGO_CONNECTION_URL` | MongoDB connection string | `mongodb://127.0.0.1:27017/chess-puzzles` |
| `PUZZLE_API_URL` | RapidAPI chess puzzles endpoint | `chess-puzzles.p.rapidapi.com` |
| `PUZZLE_API_KEY` | RapidAPI key for puzzle data | `your_rapidapi_key_here` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `8000` |
| `APP_PATH` | Application host | `127.0.0.1` |

### Getting API Keys

**RapidAPI (Required):**
1. Create account at [rapidapi.com](https://rapidapi.com/)
2. Subscribe to [Chess Puzzles API](https://rapidapi.com/KeeghanM/api/chess-puzzles)
3. Copy your API key from the dashboard

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables from your `.env`
   - Deploy automatically

3. **Configure for MiniPay**
   - Use your Vercel URL in MiniPay browser
   - Test cUSD payments in production

### Production Checklist
- [ ] MongoDB Atlas connection configured
- [ ] RapidAPI key added to environment
- [ ] Domain configured for MiniPay
- [ ] Payment flows tested with real cUSD
- [ ] Error monitoring setup (optional)

## 🐛 Troubleshooting

### Common Issues

**RapidAPI Rate Limits**
- Free tier has limited requests
- Upgrade plan or implement caching
- Check API usage in RapidAPI dashboard

**MiniPay Connection Issues**
- Ensure app is deployed to HTTPS URL
- Check wallet permissions in MiniPay
- Verify Celo network configuration

### Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Built with ♟️ for the Celo ecosystem and MiniPay**

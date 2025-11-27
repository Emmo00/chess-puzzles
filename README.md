# Chess-O-Clock Next.js API

A Next.js chess puzzle API with Farcaster authentication, converted from Express.js backend.

## 🚀 Features

- **Chess Puzzles**: Daily puzzle fetching with attempt tracking
- **Farcaster Authentication**: QuickAuth JWT token-based authentication
- **Leaderboards**: Points and solved puzzles rankings with friends filter
- **MongoDB Integration**: User data and puzzle progress storage
- **Rate Limiting**: 3 daily free puzzles per user
- **Points System**: Dynamic scoring based on puzzle attempts
- **Streak Tracking**: Daily login streak tracking

## 🛠 Technologies

- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) - Database
- [Farcaster QuickAuth](https://github.com/farcasterxyz/auth-monorepo) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React](https://reactjs.org/) - Frontend framework

## 📋 API Endpoints

### Authentication
- `GET /api/users/me` - Get/create authenticated user

### Puzzles
- `POST /api/puzzles/daily` - Fetch daily puzzle (max 3/day)
- `POST /api/puzzles/solve` - Submit puzzle solution
- `GET /api/puzzles/today/me` - Get today's puzzle count

### Leaderboards
- `GET /api/leaderboard/points` - Points leaderboard
- `GET /api/leaderboard/solved` - Solved puzzles leaderboard

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB instance
- Chess puzzle API access (RapidAPI or similar)
- Farcaster app credentials

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd chess-o-clock-nextjs
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your values:
   ```env
   MONGO_CONNECTION_URL=mongodb://127.0.0.1:27017/chess-o-clock
   PUZZLE_API_URL=your_puzzle_api_url
   PUZZLE_API_KEY=your_puzzle_api_key
   HOSTNAME=localhost:3000
   NODE_ENV=development
   NEYNAR_API_KEY=your_neynar_api_key
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Visit http://localhost:3000 to see the application.

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── users/         # User authentication
│   │   ├── puzzles/       # Puzzle endpoints
│   │   └── leaderboard/   # Leaderboard endpoints
│   ├── docs/              # API documentation page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── lib/                   # Shared libraries
│   ├── models/           # Mongoose models
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── db.ts             # Database connection
│   └── types.ts          # TypeScript types
├── public/               # Static files
└── src/                  # Legacy Express code (for reference)
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_CONNECTION_URL` | MongoDB connection string | Yes |
| `PUZZLE_API_URL` | Chess puzzle API endpoint | Yes |
| `PUZZLE_API_KEY` | Chess puzzle API key | Yes |
| `HOSTNAME` | Application hostname for JWT validation | Yes |
| `NEYNAR_API_KEY` | Neynar API key for Farcaster data | Optional |
| `NODE_ENV` | Environment (development/production) | Yes |

## 📖 Documentation

Visit `/docs` in your browser for complete API documentation with interactive examples.

## 🔄 Migration from Express

This project has been converted from Express.js to Next.js:

- **Routes**: Express routes → Next.js API routes (`app/api/`)
- **Middleware**: Express middleware → Next.js request handlers
- **Authentication**: Express middleware → Utility functions
- **Database**: Same MongoDB/Mongoose models (with Next.js optimizations)
- **Services**: Business logic preserved in `lib/services/`

## 🧪 Testing

```bash
npm run test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
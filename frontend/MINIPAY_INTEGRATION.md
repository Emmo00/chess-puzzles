# MiniPay Integration Guide

This chess puzzles app has been optimized for MiniPay on the Celo blockchain.

## Features

### 🔗 Wallet Integration
- **Auto-Connect**: MiniPay users are automatically connected when they open the app
- **Celo-Only**: Configured to work exclusively with Celo Mainnet and Celo Sepolia testnet
- **No Wallet Popup**: Seamless connection without wallet selection dialogs

### 💰 Payment System
- **cUSD Payments**: Uses Celo Dollar (cUSD) instead of USDC for payments
- **Two Payment Tiers**:
  - Daily Access: 0.1 cUSD for 3 puzzles per day
  - Premium: 1.0 cUSD for unlimited puzzles for 30 days
- **Blockchain Verification**: All payments are verified on-chain

### 📱 MiniPay Optimized
- **Mobile-First**: Designed for MiniPay's mobile interface
- **Visual Indicators**: MiniPay users see 📱 emojis to indicate MiniPay integration
- **Automatic Detection**: App detects when running inside MiniPay

## Technical Implementation

### Key Changes Made

1. **Wagmi Configuration** (`lib/config/wagmi.ts`)
   - Removed multi-chain support, now only supports Celo and Celo Sepolia
   - Added MiniPay detection helper function
   - Updated token addresses for cUSD

2. **Payment System** (`lib/utils/payment.ts`, `lib/hooks/usePayment.ts`)
   - Switched from USDC (6 decimals) to cUSD (18 decimals)
   - Updated payment amounts and contract addresses
   - Added MiniPay auto-connect functionality

3. **UI Components** 
   - `WalletConnect.tsx`: Auto-connects for MiniPay users
   - `PaymentModal.tsx`: Shows cUSD branding and MiniPay indicators
   
4. **Payment Verification** (`app/api/payments/verify/route.ts`)
   - Updated to verify cUSD transfers instead of USDC
   - Supports only Celo chains for verification

### Dependencies Added
```bash
npm install @celo/abis @celo/identity
```

### Environment Setup
- Supports Celo Mainnet and Celo Sepolia testnet
- Payment recipient: `0xEA22ca862C3AFDA79Ef7Fb5Ae8f13D245354f05b`

## Testing in MiniPay

1. Deploy the app to a public URL
2. Open in MiniPay browser
3. The app should auto-detect MiniPay and connect wallet automatically
4. Users can pay with cUSD directly from their MiniPay wallet

## Security Features

- On-chain payment verification
- Wallet address-based authentication
- Transaction hash validation
- Payment expiry tracking
- Protected puzzle access based on payment status

The app is now fully optimized for MiniPay users on Celo with seamless cUSD payments!
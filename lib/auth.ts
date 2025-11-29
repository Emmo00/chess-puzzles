import { NextRequest } from "next/server";

export interface WalletUser {
  walletAddress: string;
  displayName: string;
}

export async function authenticateWalletUser(request: NextRequest): Promise<WalletUser> {
  const walletAddress = request.headers.get("x-wallet-address");
  
  if (!walletAddress) {
    throw new Error("Wallet address not provided");
  }

  // Validate wallet address format (basic check)
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error("Invalid wallet address format");
  }

  return {
    walletAddress: walletAddress.toLowerCase(),
    displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
  };
}

// Legacy function for backward compatibility - will be updated in API routes
export async function authenticateUser(request: NextRequest) {
  return authenticateWalletUser(request);
}
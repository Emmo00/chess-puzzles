export interface PaymentStatus {
  hasPremium: boolean;
  premiumExpiresAt?: string;
  hasDailyAccess: boolean;
  dailyAccessDate?: string;
}

export interface PaymentVerification {
  transactionHash: string;
  amount: string;
  recipient: string;
  sender: string;
  chainId: number;
  timestamp: number;
}

export enum PaymentType {
  DAILY_ACCESS = "daily_access",
  PREMIUM = "premium"
}

export interface UserPaymentData {
  walletAddress: string;
  paymentType: PaymentType;
  transactionHash: string;
  amount: string;
  chainId: number;
  createdAt: string;
  expiresAt?: string; // For premium subscriptions
}
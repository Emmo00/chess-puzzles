export interface PaymentStatus {
  hasAccess: boolean;
  hasDailyAccess: boolean;
  hasPremiumAccess: boolean;
  dailyAccessDate?: string;
  premiumPlan?: PaymentType | null;
  premiumPlanLabel?: string | null;
  premiumExpiresAt?: string | null;
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
  PREMIUM_MONTHLY = "premium_monthly",
  PREMIUM_YEARLY = "premium_yearly",
}

export interface UserPaymentData {
  walletAddress: string;
  paymentType: PaymentType;
  transactionHash: string;
  amount: string;
  chainId: number;
  createdAt: string;
  expiresAt?: string;
}

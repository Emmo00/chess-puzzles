export interface PaymentStatus {
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
  DAILY_ACCESS = "daily_access"
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
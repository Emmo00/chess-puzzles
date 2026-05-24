import { Payment } from "@/lib/models/payment.model";
import { getPremiumPlan, PREMIUM_PAYMENT_TYPES } from "@/lib/config/premium";
import { PaymentType } from "@/lib/types/payment";

export interface PremiumAccessSummary {
  hasAccess: boolean;
  hasPremiumAccess: boolean;
  premiumPlan: PaymentType | null;
  premiumPlanLabel: string | null;
  premiumExpiresAt: string | null;
}

export interface ActivePremiumPayment {
  walletAddress: string;
  paymentType: PaymentType;
  transactionHash: string;
  amount: string;
  expiresAt: string | null;
  planLabel: string | null;
}

class PremiumService {
  public async getActivePremiumPayment(walletAddress: string): Promise<ActivePremiumPayment | null> {
    const normalizedWallet = walletAddress.toLowerCase();
    const now = new Date();

    const payment = await Payment.findOne({
      walletAddress: normalizedWallet,
      paymentType: { $in: PREMIUM_PAYMENT_TYPES },
      verified: true,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!payment) {
      return null;
    }

    const plan = getPremiumPlan(payment.paymentType as PaymentType);

    return {
      walletAddress: normalizedWallet,
      paymentType: payment.paymentType as PaymentType,
      transactionHash: payment.transactionHash,
      amount: payment.amount,
      expiresAt: payment.expiresAt ? new Date(payment.expiresAt).toISOString() : null,
      planLabel: plan?.label ?? null,
    };
  }

  public async getPremiumAccessSummary(walletAddress: string): Promise<PremiumAccessSummary> {
    const activePayment = await this.getActivePremiumPayment(walletAddress);

    return {
      hasAccess: Boolean(activePayment),
      hasPremiumAccess: Boolean(activePayment),
      premiumPlan: activePayment?.paymentType ?? null,
      premiumPlanLabel: activePayment?.planLabel ?? null,
      premiumExpiresAt: activePayment?.expiresAt ?? null,
    };
  }

  public async hasPremiumAccess(walletAddress: string): Promise<boolean> {
    return Boolean(await this.getActivePremiumPayment(walletAddress));
  }

  public async getActivePremiumWalletMap(walletAddresses: string[]): Promise<Map<string, ActivePremiumPayment>> {
    const normalizedWallets = walletAddresses.map((wallet) => wallet.toLowerCase());
    if (normalizedWallets.length === 0) {
      return new Map();
    }

    const now = new Date();
    const payments = await Payment.find({
      walletAddress: { $in: normalizedWallets },
      paymentType: { $in: PREMIUM_PAYMENT_TYPES },
      verified: true,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    const mappedPayments = new Map<string, ActivePremiumPayment>();

    for (const payment of payments) {
      const walletAddress = String(payment.walletAddress).toLowerCase();

      if (mappedPayments.has(walletAddress)) {
        continue;
      }

      const plan = getPremiumPlan(payment.paymentType as PaymentType);

      mappedPayments.set(walletAddress, {
        walletAddress,
        paymentType: payment.paymentType as PaymentType,
        transactionHash: payment.transactionHash,
        amount: payment.amount,
        expiresAt: payment.expiresAt ? new Date(payment.expiresAt).toISOString() : null,
        planLabel: plan?.label ?? null,
      });
    }

    return mappedPayments;
  }
}

export default PremiumService;

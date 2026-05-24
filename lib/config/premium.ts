import { parseUnits } from "viem";

import { PaymentType } from "@/lib/types/payment";

export const FREE_DAILY_PUZZLE_LIMIT = 4;

export const PREMIUM_BENEFITS = [
  "Unlimited puzzles",
  "Golden badge on the leaderboard",
  "More to come",
] as const;

export const PREMIUM_PLANS = {
  [PaymentType.PREMIUM_MONTHLY]: {
    paymentType: PaymentType.PREMIUM_MONTHLY,
    label: "Monthly",
    priceLabel: "$2",
    priceCusd: "2",
    amount: parseUnits("2", 18),
    durationDays: 30,
    durationLabel: "30 days",
    billingCopy: "Billed monthly",
    highlight: "Best for trying Premium",
    buttonLabel: "Go Monthly",
  },
  [PaymentType.PREMIUM_YEARLY]: {
    paymentType: PaymentType.PREMIUM_YEARLY,
    label: "Yearly",
    priceLabel: "$20",
    priceCusd: "20",
    amount: parseUnits("20", 18),
    durationDays: 365,
    durationLabel: "1 year",
    billingCopy: "Billed yearly",
    highlight: "Best value",
    buttonLabel: "Go Yearly",
  },
} as const;

export const PREMIUM_PLAN_ORDER = [
  PaymentType.PREMIUM_MONTHLY,
  PaymentType.PREMIUM_YEARLY,
] as const;

export const PREMIUM_PAYMENT_TYPES = [
  PaymentType.PREMIUM_MONTHLY,
  PaymentType.PREMIUM_YEARLY,
] as const;

export const getPremiumPlan = (paymentType: PaymentType) => {
  return PREMIUM_PLANS[paymentType as keyof typeof PREMIUM_PLANS] || null;
};

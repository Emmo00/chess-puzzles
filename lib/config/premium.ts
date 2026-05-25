import { PaymentType } from "@/lib/types/payment";

export const FREE_DAILY_PUZZLE_LIMIT = 4;

export const PREMIUM_BENEFITS = [
  "Unlimited puzzles",
  "Golden badge on the leaderboard",
  "More to come",
] as const;

export const PREMIUM_PLANS = {
  [PaymentType.DAILY_ACCESS]: {
    paymentType: PaymentType.DAILY_ACCESS,
    label: "Daily Access",
    priceLabel: "$0.10",
    priceCusd: "0.10",
    durationDays: 1,
    durationLabel: "1 day",
    billingCopy: "Billed once",
    highlight: "Best for trying out puzzles",
    buttonLabel: "Try Daily",
  },
  [PaymentType.PREMIUM_MONTHLY]: {
    paymentType: PaymentType.PREMIUM_MONTHLY,
    label: "Monthly",
    priceLabel: "$2",
    priceCusd: "2",
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
    durationDays: 365,
    durationLabel: "1 year",
    billingCopy: "Billed yearly",
    highlight: "Best value",
    buttonLabel: "Go Yearly",
  },
} as const;

// Single source of truth for premium prices. Update the plan config above and
// this derived map stays in sync for the rest of the app.
export const PAYMENT_PRICES = {
  [PaymentType.DAILY_ACCESS]: PREMIUM_PLANS[PaymentType.DAILY_ACCESS].priceCusd,
  [PaymentType.PREMIUM_MONTHLY]: PREMIUM_PLANS[PaymentType.PREMIUM_MONTHLY].priceCusd,
  [PaymentType.PREMIUM_YEARLY]: PREMIUM_PLANS[PaymentType.PREMIUM_YEARLY].priceCusd,
} as const;

export const PREMIUM_PAYMENT_TYPES = [
  PaymentType.DAILY_ACCESS,
  PaymentType.PREMIUM_MONTHLY,
  PaymentType.PREMIUM_YEARLY,
] as const;

export const getPremiumPlan = (paymentType: PaymentType) => {
  return PREMIUM_PLANS[paymentType as keyof typeof PREMIUM_PLANS] || null;
};

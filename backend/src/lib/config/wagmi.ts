// Contract constants re-exported for backward compatibility with services
// These values come from shared/src/contracts.ts but are inlined here
// to avoid rootDir issues with workspace imports

export const GAME_ASSETS_CONTRACT = "0xD4d151a188e6DfC7e5d6b7BF1811D2230716bd9b" as `0x${string}`;
export const PAYOUT_CLAIM_CONTRACT = "0x4DF823F6A36b35A3983afc41f7c3584C1DCBFDf1";
export const PAYMENT_RECIPIENT = "0xEA22ca862C3AFDA79Ef7Fb5Ae8f13D245354f05b";

export const GAME_ASSET_TYPES = {
  HINT: "0xd4693c831cfc202fc63a20c9fa3291821027841da966d7a234bd10995117dd44" as `0x${string}`,
  STREAK_FREEZE: "0x8a0a23a6e82096be4a488be5ca58830d9c70dfe27919e0d85bd61508dcf2bfd1" as `0x${string}`,
  DAILY_PASS: "0xa820493df1aaa1e0a96fd96fe9ffb12f4dd597ce0a289061861c619bfa95db11" as `0x${string}`,
};

export const SUPPORTED_CURRENCIES = [
  {
    symbol: "USDT",
    tokenAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    feeCurrencyAddress: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
    decimals: 6,
  },
  {
    symbol: "USDC",
    tokenAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    feeCurrencyAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    decimals: 6,
  },
  {
    symbol: "USDm",
    tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    feeCurrencyAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
] as const;

export const ALLOWLISTED_STABLECOINS = SUPPORTED_CURRENCIES.filter(
  (c) => c.symbol === "USDC" || c.symbol === "USDT" || c.symbol === "USDm"
);

export const CUSD_ADDRESSES: Record<number, string> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

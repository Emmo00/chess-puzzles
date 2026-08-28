import { cleanEnv, str } from "envalid";

function validateEnv() {
  return cleanEnv(process.env, {
    NODE_ENV: str({ default: "development" }),
    PORT: str({ default: "3001" }),
    MONGO_CONNECTION_URL: str(),
    PUZZLE_API_URL: str({ default: "" }),
    PUZZLE_API_KEY: str({ default: "" }),
    CHECKIN_SIGNER_PRIVATE_KEY: str({ default: "" }),
    CELO_RPC_URL: str({ default: "" }),
    ASSET_CONSUMPTION_KEY: str({ default: "" }),
    ASSET_GRANTING_KEY: str({ default: "" }),
    JWT_SECRET: str({ default: "" }),
    ADMIN_WALLET_ADDRESS: str({ default: "" }),
    ADMIN_API_KEY: str({ default: "" }),
    LOG_LEVEL: str({ default: "info" }),
    REDIS_URL: str({ default: "redis://127.0.0.1:6379" }),
    CORS_ORIGIN: str({ default: "https://chesspuzzles.xyz,https://miniapp.chesspuzzles.xyz" }),
  });
}

export const env = validateEnv();

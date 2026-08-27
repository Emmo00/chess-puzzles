import { cleanEnv, str } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, {
    NODE_ENV: str(),
    MONGO_CONNECTION_URL: str(),
    CHECKIN_SIGNER_PRIVATE_KEY: str({ default: "" }),
    CELO_RPC_URL: str({ default: "" }),
  });
}

export default validateEnv;
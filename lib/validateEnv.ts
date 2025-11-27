import { cleanEnv, str } from 'envalid';

export function validateEnv() {
  return cleanEnv(process.env, {
    NODE_ENV: str(),
    MONGO_CONNECTION_URL: str()
  });
}

export default validateEnv;
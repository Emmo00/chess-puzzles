import Redis from "ioredis";
import { env } from "./env";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected");
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
    console.log("[Redis] Connected successfully");
  } catch (err) {
    console.error("[Redis] Failed to connect:", err);
    // Don't crash — fail open for rate limiting
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

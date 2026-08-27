import mongoose from "mongoose";
import { env } from "./env";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(env.MONGO_CONNECTION_URL, {
      bufferCommands: false,
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });

    isConnected = true;
    console.log("[MongoDB] Connected successfully");
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err);
    throw err;
  }

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Error:", err);
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected");
    isConnected = false;
  });
}

export function isDBConnected(): boolean {
  return isConnected;
}

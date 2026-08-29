import "dotenv/config"
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { connectDB } from "./config/mongoose";
import { connectRedis } from "./config/redis";
import { errorHandler } from "./middleware/errorHandler";
import { requestLoggerMiddleware } from "./middleware/logging";
import { routes } from "./routes";

const app = express();

// Security
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN.split(","),
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Logging
app.use(requestLoggerMiddleware);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount all API routes
app.use("/api", routes);

// Error handler
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    await connectRedis();

    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      console.log(`[Server] Running on port ${port}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

start();

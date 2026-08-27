import * as mongoose from "mongoose";
import { logger } from "./logger";

declare global {
  var mongoose: any; // This must be a `var` and not a `let / const`
}

const MONGODB_URI = process.env.MONGO_CONNECTION_URL!;

if (!MONGODB_URI) {
  logger.error("db.uriMissing");
  throw new Error("Please define the MONGO_CONNECTION_URL environment variable inside .env.local");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    mongoose.set("strictQuery", false);
    logger.debug("db.connect.start", { host: redactUri(MONGODB_URI) });
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      logger.info("db.connect.success", { host: redactUri(MONGODB_URI) });
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error("db.connect.failed", err, { host: redactUri(MONGODB_URI) });
    throw e;
  }

  return cached.conn;
}

/** Hides credentials inside the connection URI for safe logging. */
function redactUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    parsed.username = "***";
    parsed.password = "***";
    return parsed.toString();
  } catch {
    // Not a valid URL — strip anything that looks like a password.
    return uri.replace(/\/\/[^@\s/]+@/, "//***@");
  }
}

export default dbConnect;
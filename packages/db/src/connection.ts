import * as mongoose from "mongoose";

declare global {
  var mongoose: any;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGO_CONNECTION_URL;
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGO_CONNECTION_URL environment variable inside .env"
    );
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    mongoose.set("strictQuery", false);
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

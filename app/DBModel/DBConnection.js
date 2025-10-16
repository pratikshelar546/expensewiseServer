import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function DBConnection() {
    console.log("cache cheking ",cached.conn);
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((conn) => {
      cached.conn = conn;
    });
  }

  await cached.promise;
  return cached.conn;
}

export default DBConnection;

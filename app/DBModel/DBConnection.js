import mongoose from "mongoose";

// Cache connection across hot reloads in serverless
const globalForMongoose = globalThis;
let cached = globalForMongoose.mongoose;

if (!cached) {
  cached = globalForMongoose.mongoose = { conn: null, promise: null };
}

async function DBConnection() {
  console.error("cache checking", cached.conn ? "connected" : "not connected");

  if (cached.conn) {
    console.error("Using cached connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.error("Creating new connection");
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5,          // ✅ lowered — serverless doesn't need 10
      minPoolSize: 1,          // ✅ keep 1 alive to reduce reconnects  
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    cached.promise = mongoose.connect(process.env.MONGODB, opts)
      .then((mongoose) => {
        console.error("✅ Connected to MongoDB");
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection error:", error);
        throw error;
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

export default DBConnection;




/**
 * Normal Connection Logic
 * No global caching, just a straight-up connection request.
*/
// async function DBConnection() {
//   const MONGODB_URI = process.env.MONGODB;
  
// if (!MONGODB_URI) {
//   throw new Error("Please define the MONGODB environment variable in .env");

// }
//   try {
//     // Check if we are already connected (Mongoose state 1 = connected)
//     if (mongoose.connection.readyState === 1) {
//       return mongoose.connection;
//     }

//     const opts = {
//       bufferCommands: false,
//     };

//     console.error("Establishing fresh MongoDB connection...");
//     const conn = await mongoose.connect(MONGODB_URI, opts);
    
//     console.error("✅ Connected");
//     return conn;
//   } catch (error) {
//     console.error("❌ MongoDB connection error:", error);
//     throw error;
//   }
// }

// export default DBConnection;
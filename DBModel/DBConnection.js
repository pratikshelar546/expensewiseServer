import mongoose from "mongoose";

let isConnected = false;

const DBConnection = async () => {
    if (isConnected) return;

    try {
        await mongoose.connect(process.env.MONGODB);
        isConnected = true;
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB connection error", err);
        throw err;
    }
};

export default DBConnection;

import express from "express";
import dotenv from "dotenv";
import DBConnect from "./app/DBModel/DBConnection.js";
import cors from "cors";
import expensesAPI from "./app/routes/expenses/index.js";
import userAPI from "./app/routes/user/index.js";
import organizationAPI from "./app/routes/organization/index.js";
import expenseFeildAPI from "./app/routes/ExpenseField/index.js";
import requestAPI from "./app/routes/Request/index.js";
import privateConfig from "./app/Config/routeConfig.js";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";

dotenv.config();

const app = express();
privateConfig(passport);

app.use(express.json()); // ✅ removed duplicate bodyParser

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("Backend is running!");
});
// ✅ FIX 1: Reuse the SAME mongoose connection for MongoStore
// Don't pass mongoUrl — pass the clientPromise from your existing connection
app.use(
  session({
    store: MongoStore.create({
      // Reuse existing mongoose connection instead of opening a new one
      clientPromise: DBConnect().then(() => mongoose.connection.getClient()),
      ttl: 14 * 24 * 60 * 60,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ FIX 2: Replace moment-timezone with native Intl (zero dependencies)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const method = req.method;
  const url = req.url;

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const timeTakenMs = Number(end - start) / 1_000_000; // convert nanoseconds to milliseconds

    console.log(
      `${req.headers["x-forwarded-for"] || req.ip} ${timeStr} ${method} ${url} ${res.statusCode} (${timeTakenMs.toFixed(2)} ms)`
    );
  });

  next();
});

// ✅ FIX 3: Connect DB once at startup, not per-request
// Pre-warm the connection when the serverless function initializes
let dbReady = false;
const dbPromise = DBConnect()
  .then(() => { dbReady = true; })
  .catch(console.error);

// Lightweight middleware — only awaits if not yet connected
app.use(async (req, res, next) => {
  if (!dbReady) {
    try {
      await dbPromise;
    } catch {
      return res.status(500).json({ error: "Database connection failed" });
    }
  }
  next();
});

app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI);
app.use("/request", requestAPI);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = process.env.PORT || 5000;
// if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server started at ${PORT}`));
// }
export default app;

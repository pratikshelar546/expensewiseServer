import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
import serverless from "serverless-http";
import privateConfig from "../app/Config/routeConfig.js";
import DBConnection from "../app/DBModel/DBConnection.js";
import expenseFeildAPI from "../app/routes/ExpenseField/index.js";
import expensesAPI from "../app/routes/expenses/index.js";
import organizationAPI from '../app/routes/organization/index.js';
import requestAPI from "../app/routes/Request/index.js";
import userAPI from "../app/routes/user/index.js";
import MongoStore from "connect-mongo";
const app = express();

dotenv.config();

// Don't initialize DB on startup - let it connect on first request
// This prevents Vercel timeout issues during cold starts

privateConfig(passport);
app.use(express.json());

const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '6mb' }));

// Session configuration optimized for Vercel serverless
const sessionConfig = {
    secret: "newProject",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day for serverless
    }
};

// Only use MongoStore if MongoDB is available
if (process.env.MONGODB) {
    sessionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGODB,
        ttl: 24 * 60 * 60, // 1 day
        touchAfter: 12 * 60 * 60, // 12 hours
    });
}

app.use(session(sessionConfig));

// Simple health check that doesn't require DB (MUST be before DB middleware)
app.get("/ping", (req, res) => {
    console.log("pingggggggg");
    res.send("pong");
});

// Health check endpoint for Vercel
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasMongoDb: !!process.env.MONGODB,
            mongoDbLength: process.env.MONGODB ? process.env.MONGODB.length : 0
        }
    });
});

// Ensure DB connection on each request (for Vercel serverless)
app.use(async (req, res, next) => {
    try {
        console.log(`Received request with body size: ${JSON.stringify(req.body).length} bytes`);
        // Ensure DB is connected on each request
        await DBConnection();
        next();
    } catch (error) {
        console.error('DB connection error in middleware:', error);
        // Continue anyway - some routes might not need DB
        next();
    }
});

app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI)
app.use("/request", requestAPI)

app.get("/", (req, res) => {
    if (!req.session.views) req.session.views = 0;
    req.session.views++;
    res.send(`Number of views: ${req.session.views}`);
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});
// Simple health check that doesn't require DB (put before DB middleware)
app.get("/ping", (req, res) => {
    console.log("pingggggggg");
    res.send("pong");
});

// Health check endpoint for Vercel
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasMongoDb: !!process.env.MONGODB,
            mongoDbLength: process.env.MONGODB ? process.env.MONGODB.length : 0
        }
    });
});
// Configure serverless handler for Vercel
const handler = serverless(app, {
    binary: false,
    request: (request, event, context) => {
        // Vercel serverless configuration
        context.callbackWaitsForEmptyEventLoop = false;
    }
});

export default handler;
export { app };
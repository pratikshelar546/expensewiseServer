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

// Initialize database connection with timeout
const initializeDB = async () => {
    try {
        console.log("connecting to DB");
        await Promise.race([
            DBConnection(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('DB connection timeout')), 10000)
            )
        ]);
        console.log("connected to DB");
    } catch (error) {
        console.log("error connecting to DB", error);
        // Don't fail the entire app, just log the error
    }
};

// Initialize DB but don't block the app startup
initializeDB();

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
app.use((req, res, next) => {
    console.log(`Received request with body size: ${JSON.stringify(req.body).length} bytes`);
    next();
});

app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI)
app.use("/request", requestAPI)


app.get("/ping", (req, res) => {
    console.log("pingggggggg");

    res.send("pong");
});

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

// Configure serverless with proper timeout
const handler = serverless(app, {
    binary: false,
    request: (request, event, context) => {
        // Set timeout for Vercel (max 10 seconds for hobby plan)
        context.callbackWaitsForEmptyEventLoop = false;
    }
});

export default handler;
export { app };
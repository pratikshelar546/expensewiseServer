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

await DBConnection(); // Make sure you cache the connection inside this function

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

app.use(session({
    secret: "newProject",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB,
        ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production", // only send over HTTPS
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    }
}));
app.use((req, res, next) => {
    console.log(`Received request with body size: ${JSON.stringify(req.body).length} bytes`);
    next();
});

app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI)
app.use("/request", requestAPI)

app.use(async (req, res, next) => {
    try {
        console.log("connecting to DB");

        console.log("connected");

        next();
    } catch (err) {
        console.error("❌ DB Connect error:", err);
        res.status(500).json({ error: "DB connection failed" });
    }
});
app.get("/ping", (req, res) => {
    console.log("pingggggggg");

    res.send("pong");
});

app.get("/", (req, res) => {
    if (!req.session.views) req.session.views = 0;
    req.session.views++;
    res.send(`Number of views: ${req.session.views}`);
  });

export default serverless(app);
export { app };
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import expensesAPI from "../app/routes/expenses/index.js"
import userAPI from "../app/routes/user/index.js";
import organizationAPI from '../app/routes/organization/index.js';
import expenseFeildAPI from "../app/routes/ExpenseField/index.js";
import requestAPI from "../app/routes/Request/index.js";
import privateConfig from "../app/Config/routeConfig.js";
import passport from "passport";
import session from "express-session";
import DBConnection from "../app/DBModel/DBConnection.js";
import serverless from "serverless-http";

dotenv.config();

const app = express();
privateConfig(passport);
app.use(express.json());
const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(session({
    secret: "newProject",
    resave: false,
    saveUninitialized: false
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '6mb' }));
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

        await DBConnection(); // Make sure you cache the connection inside this function
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

app.get('/', function (req, res) {
    console.log("hellosssss");

    res.send("hello")
    // res.json({ message: "hello" })
});

app.listen(8000, () => console.log('Server ready on port 8000.'));
export default serverless(app);
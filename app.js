import express from "express";
import dotenv from "dotenv";
import DBConnect from "./app/DBModel/DBConnection.js"
import cors from "cors";
import bodyParser from "body-parser";
import expensesAPI from "./app/routes/expenses/index.js"
import userAPI from "./app/routes/user/index.js";
import organizationAPI from './app/routes/organization/index.js';
import expenseFeildAPI from "./app/routes/ExpenseField/index.js";
import requestAPI from "./app/routes/Request/index.js";
import privateConfig from "./app/Config/routeConfig.js";
import passport from "passport";
import session from "express-session";

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
app.use(session({ secret: "newProject" }));
app.use(bodyParser.json());

// Initialize database connection before routes
app.use(async (req, res, next) => {
  try {
    await DBConnect();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI)
app.use("/request", requestAPI)

// app.use("/", (req, res) => {
//     res.redirect('https://expensewisee.vercel.app/');
// })
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// For Vercel deployment
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(5000, "0.0.0.0", () => {
    console.log(`Server Started at ${5000}`)
  })
}
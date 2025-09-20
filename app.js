import express from "express";
import dotenv from "dotenv";
import DBConnect from "./DBModel/DBConnection.js"
import cors from "cors";
import bodyParser from "body-parser";
import expensesAPI from "./routes/expenses/index.js"
import userAPI from "./routes/user/index.js";
import organizationAPI from './routes/organization/index.js';
import expenseFeildAPI from "./routes/ExpenseField/index.js";
import requestAPI from "./routes/Request/index.js";
import privateConfig from "./Config/routeConfig.js";
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
app.use("/expenses", expensesAPI);
app.use("/user", userAPI);
app.use("/organization", organizationAPI);
app.use("/field", expenseFeildAPI)
app.use("/request", requestAPI)

app.use("/", (req, res) => {
    res.redirect('https://expensewisee.vercel.app/');
})

app.listen(8000, "0.0.0.0",() => {
    DBConnect().then(() => {
        console.log("server connected");
    }).catch((error) => {
        console.error(error);
    })
    console.log(`Server Started at ${8000}`)
})

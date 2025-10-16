import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Simple test working!");
});

app.get("/ping", (req, res) => {
    res.send("pong");
});

export default app;


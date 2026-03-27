const express = require("express");
require("dotenv").config();
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth")
const userRouter  = require("./routes/user")
const websiteRouter = require("./routes/website")
const paymentRouter = require("./routes/payment")
const app = express();   
const PORT = process.env.PORT || 7777;
const localOrigin = "http://localhost:5173";
const frontendOrigin = (process.env.FRONTEND_URL || localOrigin).trim().replace(/\/$/, "");

app.use(express.json()); 
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = (req.headers.origin || "").trim().replace(/\/$/, "");

  if (origin === frontendOrigin || origin === localOrigin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, PUT, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});


app.use("/" , authRouter)
app.use("/" , userRouter)
app.use("/" , websiteRouter)
app.use("/" , paymentRouter)

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`app is listening at port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Database Connection failed", err.message);
  });

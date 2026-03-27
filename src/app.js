const express = require("express");
require("dotenv").config();
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth")
const userRouter  = require("./routes/user")
const websiteRouter = require("./routes/website")
const paymentRouter = require("./routes/payment")
const app = express();   
const cors = require("cors");
const PORT = process.env.PORT || 7777;
const allowedOrigin = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (
      normalizedOrigin === allowedOrigin ||
      normalizedOrigin === "http://localhost:5173"
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(express.json()); 
app.use(cookieParser());
app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions));

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

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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://aivoraxx.vercel.app",
].filter(Boolean);

app.use(express.json()); 
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, 
   methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
}))



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

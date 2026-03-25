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

app.use(express.json()); 
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173', 
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
    app.listen(process.env.PORT, () => {
      console.log("app is listening at port 7777");
    });
  })
  .catch((err) => {
    console.log("Database Connection failed", err.message);
  });

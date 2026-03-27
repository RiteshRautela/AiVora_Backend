const express = require("express")
const authRouter = express.Router()
const bcrypt = require("bcryptjs")
const { validateSignupInput, validateLogIn } = require("../util/validation")
const User = require("../models/user")
const jwt = require("jsonwebtoken");

const getCookieOptions = () => {
    return {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: true,
        sameSite: "none",
        secure: true,
    };
};

// const getCookieOptions = () => {
//     const isProduction = process.env.NODE_ENV === "production";

//     return {
//         expires: new Date(Date.now() + 8 * 3600000),
//         httpOnly: true,
//         sameSite: none,
//         secure: true,
//     };
// };

// creating signup router
authRouter.post("/signup", async (req, res) => {
    try {
        validateSignupInput(req)
        // exctracting validate data from the req.body
        const { firstName, lastName, emailId, password } = req.body;

        // hashing the password using bcrypt.hash(password , saltround)
        const passwordHash = await bcrypt.hash(password, 10)
        const user = new User({
            firstName,
            lastName,
            emailId,
            password: passwordHash,

        })

        const savedUser = await user.save()
        const token = jwt.sign({ _id: savedUser._id }, "secretmasala@123_321", { expiresIn: "7d" });
        res.cookie("token", token, getCookieOptions())
        res.status(201).json(savedUser)

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
})



authRouter.post("/login", async (req, res) => {
    try {
        validateLogIn(req)
        // exctracting validate data from the req.body
        const { password, emailId } = req.body
        // Searching the database for a user with the provided emailId
        // findOne() returns the first matching document or null if not found
        const user = await User.findOne({ emailId: emailId })
        

        if (!user) {
            throw new Error("Invalid user")
        }

        // Comparing the plain password (from client) with the hashed password stored in the database (user.password)
        // bcrypt.compare() returns true if passwords match, otherwise false
        // const isPasswordValid = await bcrypt.compare(password, user.password);
        // dont forget to use await , face problem to show error in frontend bc error are not showing up

        const isPasswordValid = await bcrypt.compare(password, user.password)
        // If password doesn't match, throw an error in json 
        if (!isPasswordValid) {
            //    return res.status(401).json({ error: "Invalid password" });
            throw new Error("Invalid password");
        }


        // create a token using jwt.sign(payload , secret)
        const token = jwt.sign({ _id: user._id }, "secretmasala@123_321", { expiresIn: "7d" });
        // sending back the cookie
        res.cookie("token", token, getCookieOptions())
        // If both email and password are valid, send the user data as response
        res.json(user)

    } catch (err) {
        res.status(400).json({ error: err.message })
    }
})


authRouter.post("/logout", (req, res) => {
    try {
        // to log out we just simple have to clear the cookies
        const { expires, ...clearCookieOptions } = getCookieOptions();
        res.clearCookie("token", clearCookieOptions)
        res.json("user Logged out Successfully")
    } catch (err) {
        res.status(400).json("error logging out the user", err.message)
    }
})



module.exports = authRouter

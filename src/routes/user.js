const express = require("express");
const userRouter = express.Router()
const { userAuth } = require("../middleware/auth");

userRouter.get("/me", userAuth, (req, res) => {
    try {
        const { firstName, lastName, emailId, _id , credits } = req.user;

        res.status(200).json({
            _id,
            firstName,
            lastName,
            emailId,
            credits

        });
    } catch (err) {
        res.status(400).json({ message: "Failed to fetch user data" });
    }
});

module.exports = userRouter



const express = require("express");
const userRouter = express.Router()
const { userAuth } = require("../middleware/auth");
const toPublicUser = require("../util/publicUser");

userRouter.get("/me", userAuth, (req, res) => {
    try {
        res.status(200).json(toPublicUser(req.user));
    } catch (err) {
        res.status(400).json({ message: "Failed to fetch user data" });
    }
});

module.exports = userRouter



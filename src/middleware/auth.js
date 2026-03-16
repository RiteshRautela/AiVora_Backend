const User = require("../models/user")
const jwt = require("jsonwebtoken");

const userAuth = async (req, res, next) => {
    try {
        const { token } = req.cookies
        if (!token) {
            throw new Error("Authentication failed")
        }



        // verify  the token using token.verify()
        // here the decodedpayload will be the _id
        const decodedpayload = await jwt.verify(token, "secretmasala@123_321")
        const { _id } = decodedpayload

        // find the user based on the id and add it to the req object
        const user = await User.findById({ _id })


        if (!user) {
            throw new Error("Authentication Failed: user not found")
        }

        // add the user to req
        req.user = user
        next()
    } catch (err) {
        res.status(401).send("error" + err.message);
    }
}

module.exports = {
    userAuth
}
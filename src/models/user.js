const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: true
    },

    lastName: {
        type: String
    },

    emailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    gender: {
        type: String,
        lowercase: true,
        enum: {
            values: ["male", "female", "others"],
            message: '{VALUE} is not a valid gender'
        }
    },

    password: {
        type: String,
        required: true
    },

    credits: {
        type: Number,
        default: 100,
        min: 0
    },

    plan: {
        type: String,
        enum: ["free", "pro", "enterprise"]
    }

}, { timestamps: true })


module.exports = mongoose.model("User", userSchema)
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    credits: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: true,
      default: "created",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    receipt: {
      type: String,
      required: true,
    },
    notes: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      emailId: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);

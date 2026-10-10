const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const plans = require("../config/plans");
const { userAuth } = require("../middleware/auth");
const Payment = require("../models/payment");
const User = require("../models/user");
const instance = require("../util/razorpay");

const paymentRouter = express.Router();

const applyPaymentCredits = async (payment, session) => {
  if (payment.creditsApplied === true) {
    return;
  }

  const user = await User.findById(payment.userId).session(session);
  if (!user) {
    throw new Error("Payment user not found");
  }

  user.credits += payment.credits;
  user.plan = payment.plan;
  await user.save({ session });
  payment.creditsApplied = true;
};

const verifyWebhookSignature = (body, signature, secret) => {
  const expectedSignature = crypto
    .createHmac("sha256", secret.trim())
    .update(body)
    .digest();
  const providedSignature = Buffer.from(signature, "hex");

  return providedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(expectedSignature, providedSignature);
};

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;

    if (!plan) {
      return res.status(400).json({ message: "Plan is required" });
    }

    if (!billingCycle) {
      return res
        .status(400)
        .json({ message: "Billing cycle is required" });
    }

    const selectedPlan = plans[plan];

    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const selectedBillingCycle = selectedPlan.billingCycles?.[billingCycle];

    if (!selectedBillingCycle) {
      return res.status(400).json({
        message: "Invalid billing cycle for selected plan",
      });
    }

    if (selectedBillingCycle.amount <= 0) {
      return res.status(400).json({
        message: "Free plan does not require payment",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        message: "Razorpay keys are missing in environment variables",
      });
    }

    const receipt = `rcpt_${Date.now().toString(36)}`;
    const order = await instance.orders.create({
      amount: selectedBillingCycle.amount * 100,
      currency: "INR",
      receipt,
      notes: {
        firstName: req.user.firstName,
        lastName: req.user.lastName || "",
        emailId: req.user.emailId,
        plan: selectedPlan.plan,
        billingCycle,
        credits: String(selectedBillingCycle.credits),
      },
    });

    const payment = new Payment({
      userId: req.user._id,
      plan: selectedPlan.plan,
      billingCycle,
      credits: selectedBillingCycle.credits,
      orderId: order.id,
      status: order.status,
      creditsApplied: false,
      amount: selectedBillingCycle.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    const savedPayment = await payment.save();

    return res.status(201).json({
      message: "Payment order created successfully",
      keyId: process.env.RAZORPAY_KEY_ID.trim(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: savedPayment.plan,
      billingCycle: savedPayment.billingCycle,
      credits: savedPayment.credits,
      paymentId: savedPayment._id,
    });
  } catch (err) {
    console.error("PAYMENT CREATE ERROR:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

paymentRouter.post("/premium/verify", userAuth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        message: "Razorpay secret is missing in environment variables",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET.trim())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }

    const session = await mongoose.startSession();
    let result;

    try {
      await session.withTransaction(async () => {
        const payment = await Payment.findOne({
          orderId: razorpay_order_id,
          userId: req.user._id,
        }).session(session);

        if (!payment) {
          result = { notFound: true };
          return;
        }

        const alreadyPaid = payment.status === "paid";
        if (!alreadyPaid || payment.creditsApplied === false) {
          await applyPaymentCredits(payment, session);
        }

        payment.paymentId = razorpay_payment_id;
        payment.signature = razorpay_signature;
        payment.status = "paid";
        await payment.save({ session });

        const user = await User.findById(req.user._id).session(session);
        result = {
          alreadyPaid,
          credits: user.credits,
          plan: user.plan,
          billingCycle: payment.billingCycle,
        };
      });
    } finally {
      await session.endSession();
    }

    if (result?.notFound) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    return res.status(200).json({
      message: result.alreadyPaid
        ? "Payment already verified"
        : "Payment verified successfully",
      credits: result.credits,
      plan: result.plan,
      billingCycle: result.billingCycle,
    });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_webhook_Secret;

    if (!webhookSecret) {
      return res.status(500).json({
        message: "Razorpay webhook secret is missing in environment variables",
      });
    }

    const webhookSignature = req.get("X-Razorpay-Signature");

    if (!webhookSignature) {
      return res.status(400).json({
        message: "Webhook signature is required",
      });
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      return res.status(400).json({ message: "Raw webhook body is unavailable" });
    }

    const isWebhookValid = verifyWebhookSignature(
      req.rawBody,
      webhookSignature,
      webhookSecret
    );

    if (!isWebhookValid) {
      return res.status(400).json({
        message: "Webhook signature is invalid",
      });
    }

    const paymentDetails = req.body?.payload?.payment?.entity;

    if (!paymentDetails?.order_id) {
      return res.status(400).json({
        message: "Payment details are missing in webhook payload",
      });
    }

    const session = await mongoose.startSession();
    let paymentFound = false;

    try {
      await session.withTransaction(async () => {
        const payment = await Payment.findOne({
          orderId: paymentDetails.order_id,
        }).session(session);

        if (!payment) {
          return;
        }
        paymentFound = true;
        payment.paymentId = paymentDetails.id || payment.paymentId;

        if (req.body.event === "payment.captured") {
          const wasAlreadyPaid = payment.status === "paid";
          payment.status = "paid";
          if (
            payment.creditsApplied === false ||
            (!wasAlreadyPaid && payment.creditsApplied === undefined)
          ) {
            await applyPaymentCredits(payment, session);
          }
        } else if (payment.status !== "paid") {
          payment.status = paymentDetails.status || req.body.event || payment.status;
        }

        await payment.save({ session });
      });
    } finally {
      await session.endSession();
    }

    if (!paymentFound) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    return res.status(200).json({
      message: "Webhook received successfully",
    });
  } catch (err) {
    console.error("PAYMENT WEBHOOK ERROR:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = paymentRouter;

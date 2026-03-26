const crypto = require("crypto");
const express = require("express");
const plans = require("../config/plans");
const { userAuth } = require("../middleware/auth");
const Payment = require("../models/payment");
const User = require("../models/user");
const instance = require("../util/razorpay");

const paymentRouter = express.Router();

const verifyWebhookSignature = (body, signature, secret) => {
  const expectedSignature = crypto
    .createHmac("sha256", secret.trim())
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
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

    const payment = await Payment.findOne({
      orderId: razorpay_order_id,
      userId: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment record not found",
      });
    }

    if (payment.status === "paid") {
      return res.status(200).json({
        message: "Payment already verified",
        credits: req.user.credits,
        plan: req.user.plan,
      });
    }

    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = "paid";

    req.user.credits += payment.credits;
    req.user.plan = payment.plan;

    await payment.save();
    await req.user.save();

    return res.status(200).json({
      message: "Payment verified successfully",
      credits: req.user.credits,
      plan: req.user.plan,
      billingCycle: payment.billingCycle,
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

    const isWebhookValid = verifyWebhookSignature(
      JSON.stringify(req.body),
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

    const payment = await Payment.findOne({
      orderId: paymentDetails.order_id,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment record not found",
      });
    }

    payment.paymentId = paymentDetails.id || payment.paymentId;
    payment.status = paymentDetails.status || payment.status;

    if (req.body.event === "payment.captured" && payment.status !== "paid") {
      payment.status = "paid";
    }

    if (
      req.body.event === "payment.captured" &&
      payment.status === "paid" &&
      !payment.signature
    ) {
      const user = await User.findById(payment.userId);

      if (user) {
        user.credits += payment.credits;
        user.plan = payment.plan;
        await user.save();
      }
    }

    payment.signature = webhookSignature;
    await payment.save();

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

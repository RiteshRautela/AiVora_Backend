const plans = {
  free: {
    name: "Free",
    plan: "free",
    billingCycles: {
      monthly: {
        amount: 0,
        credits: 100,
      },
    },
  },
  pro: {
    name: "Pro",
    plan: "pro",
    billingCycles: {
      monthly: {
        amount: 499,
        credits: 500,
      },
    },
  },
  enterprise: {
    name: "Enterprise",
    plan: "enterprise",
    billingCycles: {
      monthly: {
        amount: 1499,
        credits: 1000,
      },
    },
  },
};

module.exports = plans;

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
      yearly: {
        // Annual billing is charged once per year at a 20% discount.
        amount: 4788,
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
      yearly: {
        // Annual billing is charged once per year at a 20% discount.
        amount: 14388,
        credits: 1000,
      },
    },
  },
};

module.exports = plans;

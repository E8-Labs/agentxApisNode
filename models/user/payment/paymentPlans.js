const PaymentHistory = (sequelize, Sequelize) => {
  const PaymentHistory = sequelize.define("PaymentHistory", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    type: {
      type: Sequelize.ENUM,
      values: [
        "PhonePurchase",
        "Plan30",
        "Plan120",
        "Plan360",
        "Plan720",
        ChargeTypes.SupportPlan,
        ChargeTypes.DNCCheck,
        ChargeTypes.LeadEnrichmentBatch,
        ChargeTypes.LeadEnrichmentBundle,
      ],
      defaultValue: "PhonePurchase",
    },
    price: {
      type: Sequelize.DOUBLE,
      defaultValue: 2,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    environment: {
      type: Sequelize.STRING,
      defaultValue: "Sandbox",
    },
    phone: {
      // if Phone number purchase then add phone
      type: Sequelize.STRING,
      allowNull: true,
    },
    transactionId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    chargeType: {
      // "subscription"
      type: Sequelize.STRING,
      allowNull: true,
    },
    connectedAccountId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    planId: {
      // if agency subscribed a plan or agency subaccount subscribed a plan
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    // agencySubAccountPlanId: {
    //   // if agency subaccount subscribed a plan
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // },
  });

  return PaymentHistory;
};

export default PaymentHistory;

export const PayAsYouGoPlanTypes = {
  Plan30Min: "Plan30",
  Plan120Min: "Plan120",
  Plan360Min: "Plan360",
  Plan720Min: "Plan720",
};

export const ChargeTypes = {
  Subscription: "Subscription",
  MinutesRenewed: "MinutesRenewed",
  PhonePurchase: "PhonePurchase",
  SupportPlan: "SupportPlan",
  DNCCheck: "DNCCheck",
  LeadEnrichmentBatch: "LeadEnrichmentBatch",
  LeadEnrichmentBundle: "LeadEnrichmentBundle",
  AgencySubscription: "AgencySubscription",
  SubaccountSubscription: "SubaccountSubscription",
};

let TestPlans = [
  {
    type: PayAsYouGoPlanTypes.Plan30Min,
    price: 45,
    oldPrice: 45,
    duration: 30 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan120Min,
    price: 99,
    oldPrice: 99,
    duration: 120 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan360Min,
    price: 299,
    oldPrice: 270,
    duration: 360 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan720Min,
    price: 599,
    oldPrice: 480,
    duration: 720 * 60,
  },
];

let LivePlans = [
  {
    type: PayAsYouGoPlanTypes.Plan30Min,
    price: 45,
    oldPrice: 45,
    duration: 30 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan120Min,
    price: 99,
    oldPrice: 99,
    duration: 120 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan360Min,
    price: 299,
    oldPrice: 299,
    duration: 360 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan720Min,
    price: 599,
    oldPrice: 480,
    duration: 720 * 60,
  },
];

// let LivePlans = [
//   { type: PayAsYouGoPlanTypes.Plan30Min, price: 0.6, duration: 30 * 60 },
//   { type: PayAsYouGoPlanTypes.Plan120Min, price: 0.61, duration: 120 * 60 },
//   {
//     type: PayAsYouGoPlanTypes.Plan360Min,
//     price: 0.62,
//     duration: 360 * 60,
//   },
//   {
//     type: PayAsYouGoPlanTypes.Plan720Min,
//     price: 0.63,
//     duration: 720 * 60,
//   },
// ];

export const PayAsYouGoPlans =
  process.env.environment === "Production" ? LivePlans : TestPlans;

console.log("Plans ", PayAsYouGoPlans);

export function FindPlanWithMinutes(minutes) {
  let p = null;
  for (const plan of PayAsYouGoPlans) {
    if (plan.duration == minutes * 60) {
      p = plan;
    }
  }
  return p;
}

export function FindPlanWithPrice(price) {
  // in dollars
  let p = null;
  for (const plan of PayAsYouGoPlans) {
    if (plan.price == price || plan.oldPrice == price) {
      p = plan;
    }
  }
  return p;
}
export function FindPlanWithtype(type) {
  // in dollars
  let p = null;
  for (const plan of PayAsYouGoPlans) {
    if (plan.type == type) {
      p = plan;
    }
  }
  return p;
}
// module.exports = { PayAsYouGoPlans };

export const SupportPlanTypes = {
  Starter: "Starter",
  Professional: "Professional",
  Enterprise: "Enterprise",
};
export const SupportPlans = [
  { type: SupportPlanTypes.Starter, price: 997, minutes: 250 },
  { type: SupportPlanTypes.Professional, price: 2997, minutes: 750 },
  { type: SupportPlanTypes.Enterprise, price: 4997, minutes: 1500 },
];

export function findSupportPlan(type) {
  let p = null;
  for (const plan of SupportPlans) {
    if (type == plan.type) {
      p = plan;
    }
  }
  return p;
}

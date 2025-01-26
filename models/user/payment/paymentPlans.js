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
      values: ["PhonePurchase", "Plan30", "Plan120", "Plan360", "Plan720"],
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
};

let TestPlans = [
  { type: PayAsYouGoPlanTypes.Plan30Min, price: 45, duration: 30 * 60 },
  {
    type: PayAsYouGoPlanTypes.Plan120Min,
    price: 99,
    duration: 120 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan360Min,
    price: 270,
    duration: 360 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan720Min,
    price: 480,
    duration: 720 * 60,
  },
];

// let LivePlans = [
//   { type: PayAsYouGoPlanTypes.Plan30Min, price: 45, duration: 30 * 60 },
//   { type: PayAsYouGoPlanTypes.Plan120Min, price: 99, duration: 120 * 60 },
//   {
//     type: PayAsYouGoPlanTypes.Plan360Min,
//     price: 270,
//     duration: 360 * 60,
//   },
//   {
//     type: PayAsYouGoPlanTypes.Plan720Min,
//     price: 480,
//     duration: 720 * 60,
//   },
// ];

let LivePlans = [
  { type: PayAsYouGoPlanTypes.Plan30Min, price: 0.55, duration: 30 * 60 },
  { type: PayAsYouGoPlanTypes.Plan120Min, price: 0.56, duration: 120 * 60 },
  {
    type: PayAsYouGoPlanTypes.Plan360Min,
    price: 0.57,
    duration: 360 * 60,
  },
  {
    type: PayAsYouGoPlanTypes.Plan720Min,
    price: 0.58,
    duration: 720 * 60,
  },
];

export const PayAsYouGoPlans = LivePlans;
// process.env.environment === "Production" ? LivePlans : TestPlans;

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
    if (plan.price == price) {
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

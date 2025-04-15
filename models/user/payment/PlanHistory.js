// Record the history of user's plans. The last one would be current plan

// import { ChargeTypes } from "./paymentPlans";

const PlanHistory = (sequelize, Sequelize) => {
  const PlanHistory = sequelize.define("PlanHistory", {
    type: {
      type: Sequelize.STRING,
      // values: [
      //   "Plan30",
      //   "Plan120",
      //   "Plan360",
      //   "Plan720",
      //   ChargeTypes.AgencySubscription,
      //   ChargeTypes.AgencySubscriptionOneTimeFee,
      //   ChargeTypes.SubaccountSubscription,
      // ],
      defaultValue: "Plan30",
    },
    price: {
      type: Sequelize.DOUBLE,
      defaultValue: 45,
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
    status: {
      type: Sequelize.ENUM,
      values: ["active", "cancelled", "upgraded"],
      defaultValue: "active",
    },
    environment: {
      type: Sequelize.STRING,
      defaultValue: "Sandbox",
    },
    planId: {
      //Plans for Agencies or
      //AgencyHostedPlans
      //Plans from agencies
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return PlanHistory;
};

export default PlanHistory;

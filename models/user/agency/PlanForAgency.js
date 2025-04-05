// Record the history of user's plans. The last one would be current plan

const PlanForAgency = (sequelize, Sequelize) => {
  const PlanForAgency = sequelize.define("PlanForAgency", {
    originalPrice: {
      type: Sequelize.DOUBLE,
    },
    discountedPrice: {
      type: Sequelize.DOUBLE,
      allowNull: true,
    },
    percentageDiscount: {
      type: Sequelize.DOUBLE,
      allowNull: true,
    },
    minutes: {
      type: Sequelize.INTEGER,
    },

    title: {
      type: Sequelize.STRING,
    },
    planDescription: {
      type: Sequelize.STRING,
    },
    tag: {
      // tag that we show. Like Recommended etc
      type: Sequelize.STRING,
      allowNull: true,
    },
    userId: {
      // agency who owns these plans
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    hasTrial: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    trialMinutes: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    trialValidForDays: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return PlanForAgency;
};

export default PlanForAgency;

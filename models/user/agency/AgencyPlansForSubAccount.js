// Record the history of user's plans. The last one would be current plan

const AgencyPlanForSubaccount = (sequelize, Sequelize) => {
  const AgencyPlanForSubaccount = sequelize.define("AgencyPlanForSubaccount", {
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
    planId: {
      // agency who owns these plans
      type: Sequelize.INTEGER,
      allowNull: false,
      //   references: {
      //     model: "AgencyHostedPlans",
      //     key: "id",
      //   },
      //   onDelete: "CASCADE",
      //   onUpdate: "CASCADE",
    },
    xbar: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  });

  return AgencyPlanForSubaccount;
};

export default AgencyPlanForSubaccount;

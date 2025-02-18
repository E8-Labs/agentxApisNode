// Record the history of user's plans. The last one would be current plan

const PaymentMethodFails = (sequelize, Sequelize) => {
  const PaymentMethod = sequelize.define("PaymentMethodFails", {
    emailSent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
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
    data: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
  });

  return PaymentMethod;
};

export default PaymentMethodFails;

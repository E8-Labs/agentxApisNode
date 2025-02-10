// Record the history of user's plans. The last one would be current plan

const PaymentMethod = (sequelize, Sequelize) => {
  const PaymentMethod = sequelize.define("PaymentMethod", {
    paymentMethodId: {
      type: Sequelize.STRING,
      allowNull: true,
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
      type: Sequelize.STRING,
      defaultValue: "",
    },

    environment: {
      type: Sequelize.STRING,
      defaultValue: "Sandbox",
    },
  });

  return PaymentMethod;
};

export default PaymentMethod;

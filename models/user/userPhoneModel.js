const UserPhoneNumbers = (sequelize, Sequelize) => {
  const UserPhoneNumbers = sequelize.define("UserPhoneNumbers", {
    phone: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    phoneSid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    phoneStatus: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "active", //pending, released
    },
    nextBillingDate: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    lastChargeAttempt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    chargeStatus: {
      type: Sequelize.ENUM,
      values: ["pending", "success", "failed"],
      defaultValue: "success",
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
  });

  return UserPhoneNumbers;
};

export default UserPhoneNumbers;

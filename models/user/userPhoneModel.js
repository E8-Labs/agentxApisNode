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
    cancelAtPeriodEnd: {
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
      // onDelete: "CASCADE",
      // onUpdate: "CASCADE",
    },
    subAccountSid: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });

  return UserPhoneNumbers;
};

export default UserPhoneNumbers;

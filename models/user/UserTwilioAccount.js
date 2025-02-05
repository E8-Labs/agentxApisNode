export const UserTwilioAccounts = (sequelize, Sequelize) => {
  const UserTwilioAccounts = sequelize.define("UserTwilioAccounts", {
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
    subAccountSid: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return UserTwilioAccounts;
};

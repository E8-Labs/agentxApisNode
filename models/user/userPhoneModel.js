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
      defaultValue: "active",
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

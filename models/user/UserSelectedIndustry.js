const UserSelectedIndustryModel = (sequelize, Sequelize) => {
  const UserServicesModel = sequelize.define("UserSelectedIndustryModel", {
    industry: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "UserIndustries",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
  });

  return UserServicesModel;
};

export default UserSelectedIndustryModel;

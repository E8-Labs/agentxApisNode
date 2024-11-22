const UserFocusModel = (sequelize, Sequelize) => {
  const UserFocusModel = sequelize.define("UserFocusModel", {
    areaOfFocus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AreaOfFocus",
        key: "id",
      },
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

  return UserFocusModel;
};

export default UserFocusModel;

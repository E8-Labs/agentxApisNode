const UserFocusModel = (sequelize, Sequelize) => {
  const UserFocusModel = sequelize.define("UserFocusModel", {
    areaOfFocus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AreaOfFocus",
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

  return UserFocusModel;
};

export default UserFocusModel;

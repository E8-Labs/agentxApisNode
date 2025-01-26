const UserActivityModel = (sequelize, Sequelize) => {
  const UserActivityModel = sequelize.define("UserActivityModel", {
    activityData: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    action: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    method: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authMethod: {
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
  });

  return UserActivityModel;
};

export default UserActivityModel;

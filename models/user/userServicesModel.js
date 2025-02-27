const UserServicesModel = (sequelize, Sequelize) => {
  const UserServicesModel = sequelize.define("UserServicesModel", {
    agentService: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AgentServices",
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

export default UserServicesModel;

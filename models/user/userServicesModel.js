const UserServicesModel = (sequelize, Sequelize) => {
  const UserServicesModel = sequelize.define("UserServicesModel", {
    agentService: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AgentServices",
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

  return UserServicesModel;
};

export default UserServicesModel;

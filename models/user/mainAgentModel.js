const MainAgentModel = (sequelize, Sequelize) => {
  const MainAgentModel = sequelize.define("MainAgentModel", {
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
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
  });

  return MainAgentModel;
};

export default MainAgentModel;

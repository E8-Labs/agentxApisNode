const AgentModelSynthflow = (sequelize, Sequelize) => {
  const AgentModelSynthflow = sequelize.define("AgentModelSynthflow", {
    agentModelId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AgentModels",
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

    modelId: {
      //synthflow Model Id
      type: Sequelize.STRING,
      allowNull: true,
    },
  });

  return AgentModelSynthflow;
};

export default AgentModelSynthflow;

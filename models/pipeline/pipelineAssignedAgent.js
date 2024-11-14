const Pipeline = (sequelize, Sequelize) => {
  const Pipeline = sequelize.define("Pipeline", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "Default Pipeline",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
    },
  });

  return Pipeline;
};

export default Pipeline;

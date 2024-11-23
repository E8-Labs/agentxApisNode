const PipelineStages = (sequelize, Sequelize) => {
  const PipelineStages = sequelize.define("PipelineStages", {
    stageTitle: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    defaultColor: {
      type: Sequelize.STRING,
      defaultValue: "red",
    },
    pipelineId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Pipelines",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    identifier: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    stageId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Stages",
        key: "id",
      },
    },
  });

  return PipelineStages;
};

export default PipelineStages;

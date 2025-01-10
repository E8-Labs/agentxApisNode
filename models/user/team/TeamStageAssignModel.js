//Teams assigned to stages

const TeamStageAssignModel = (sequelize, Sequelize) => {
  const TeamStageAssignModel = sequelize.define("TeamStageAssignModel", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    stageId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return TeamStageAssignModel;
};

export default TeamStageAssignModel;

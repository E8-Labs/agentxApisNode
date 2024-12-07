const StageTagModel = (sequelize, Sequelize) => {
  const StageTagModel = sequelize.define("StageTagModel", {
    tag: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },

    pipelineStageId: {
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
  //   LeadSheetTagModel.associate = (models) => {
  //     LeadSheetTagModel.belongsTo(models.LeadSheetModel, {
  //       foreignKey: "sheetId",
  //       as: "LeadSheet",
  //     });
  //   };

  return StageTagModel;
};

export default StageTagModel;

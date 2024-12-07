const LeadSheetTagModel = (sequelize, Sequelize) => {
  const LeadSheetTagModel = sequelize.define("LeadSheetTagModel", {
    tag: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },

    sheetId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "LeadSheetModels",
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

  return LeadSheetTagModel;
};

export default LeadSheetTagModel;

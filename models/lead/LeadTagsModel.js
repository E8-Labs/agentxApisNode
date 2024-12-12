const LeadTagsModel = (sequelize, Sequelize) => {
  const LeadTagsModel = sequelize.define("LeadTagsModel", {
    tag: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },

    leadId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "LeadModels",
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

  return LeadTagsModel;
};

export default LeadTagsModel;

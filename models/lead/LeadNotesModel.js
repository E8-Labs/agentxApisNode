const LeadNotesModel = (sequelize, Sequelize) => {
  const LeadNotesModel = sequelize.define("LeadNotesModel", {
    note: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      // defaultValue: "",
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
  });
  //   LeadSheetTagModel.associate = (models) => {
  //     LeadSheetTagModel.belongsTo(models.LeadSheetModel, {
  //       foreignKey: "sheetId",
  //       as: "LeadSheet",
  //     });
  //   };

  return LeadNotesModel;
};

export default LeadNotesModel;

const LeadSheetColumnModel = (sequelize, Sequelize) => {
  const LeadSheetColumnModel = sequelize.define("LeadSheetColumnModel", {
    columnName: {
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

  return LeadSheetColumnModel;
};

export default LeadSheetColumnModel;

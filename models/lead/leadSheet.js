const LeadSheetModel = (sequelize, Sequelize) => {
  const LeadSheetModel = sequelize.define("LeadSheetModel", {
    sheetName: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },

    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
  });

  return LeadSheetModel;
};

export default LeadSheetModel;

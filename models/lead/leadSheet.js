const LeadSheetModel = (sequelize, Sequelize) => {
  const LeadSheetModel = sequelize.define("LeadSheetModel", {
    sheetName: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "active",
    },

    type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "general", //inbound
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

  // LeadSheetModel.associate = (models) => {
  //   LeadSheetModel.belongsTo(models.LeadSheetTagModel, {
  //     foreignKey: "sheetId",
  //     as: "tags",
  //   });
  // };
  return LeadSheetModel;
};

export default LeadSheetModel;

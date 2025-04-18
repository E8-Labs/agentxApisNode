const TeamLeadAssignModel = (sequelize, Sequelize) => {
  const TeamLeadAssignModel = sequelize.define("TeamLeadAssignModel", {
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
    fromStage: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  });

  return TeamLeadAssignModel;
};

export default TeamLeadAssignModel;

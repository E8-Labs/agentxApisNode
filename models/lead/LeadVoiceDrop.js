const LeadVoicedropModel = (sequelize, Sequelize) => {
  const LeadVoicedropModel = sequelize.define("LeadVoicedropModel", {
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "LeadModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    batchId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "CadenceBatchModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return LeadVoicedropModel;
};

export default LeadVoicedropModel;

const LeadKycsExtracted = (sequelize, Sequelize) => {
  const LeadKycsExtracted = sequelize.define("LeadKycsExtracted", {
    question: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    answer: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
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

    callId: {
      // synthflow call id
      type: Sequelize.STRING,
      allowNull: true,
      //   references: {
      //     model: "LeadCallsSents",
      //     key: "id",
      //   },
    },
  });

  return LeadKycsExtracted;
};

export default LeadKycsExtracted;

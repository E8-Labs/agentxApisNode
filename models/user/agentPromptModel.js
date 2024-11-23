const AgentPromptModel = (sequelize, Sequelize) => {
  const AgentPromptModel = sequelize.define("AgentPromptModel", {
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    objective: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    companyAgentInfo: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    personalCharacteristics: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    communication: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    callScript: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    greeting: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    booking: {
      type: Sequelize.TEXT("long"),
      allowNull: false,
      defaultValue: "",
    },
    objectionHandling: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    guardRails: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    streetAddress: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
    getTools: {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
      defaultValue: "",
    },
  });

  return AgentPromptModel;
};

export default AgentPromptModel;

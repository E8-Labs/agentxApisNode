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
      allowNull: true,
      // defaultValue: "",
    },
    companyAgentInfo: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    personalCharacteristics: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    communication: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    callScript: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    greeting: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    booking: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      // defaultValue: "",
    },
    objectionHandling: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    guardRails: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    streetAddress: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    getTools: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
  });

  return AgentPromptModel;
};

export default AgentPromptModel;

const ObjectionAndGuradrails = (sequelize, Sequelize) => {
  const ObjectionAndGuradrails = sequelize.define("ObjectionAndGuradrails", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    description: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: "objection", // guardrail
    },
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
    agentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "AgentModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return ObjectionAndGuradrails;
};

export default ObjectionAndGuradrails;

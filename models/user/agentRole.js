const AgentRole = (sequelize, Sequelize) => {
  const AgentRole = sequelize.define("AgentRole", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: "system",
    },
  });

  return AgentRole;
};

export default AgentRole;

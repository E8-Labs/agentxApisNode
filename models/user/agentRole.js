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
  });

  return AgentRole;
};

export default AgentRole;

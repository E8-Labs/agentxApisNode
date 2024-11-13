const AgentService = (sequelize, Sequelize) => {
  const AgentService = sequelize.define("AgentService", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
  });

  return AgentService;
};

export default AgentService;

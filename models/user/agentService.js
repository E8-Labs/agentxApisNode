import { UserTypes } from "./userModel.js";
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
    agentType: {
      type: Sequelize.STRING,
      defaultValue: UserTypes.RealEstateAgent,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return AgentService;
};

export default AgentService;

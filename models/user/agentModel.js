const AgentModel = (sequelize, Sequelize) => {
  const AgentModel = sequelize.define("AgentModel", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    agentRole: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    // agentService: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: "AgentServices",
    //     key: "id",
    //   },
    // },

    // areaOfFocus: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: "AreaOfFocus",
    //     key: "id",
    //   },
    // },

    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    agentType: {
      type: Sequelize.ENUM,
      values: ["inbound", "outbound"],
      defaultValue: "outbound",
    },
    agentRole: {
      //Ex: Senior Property Acquisition Specialist
      type: Sequelize.STRING,
      defaultValue: "",
    },
    agentObjective: {
      //Community Update
      type: Sequelize.STRING,
      defaultValue: "",
    },
    agentObjectiveDescription: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    // inboundAgentId: {
    //   type: Sequelize.STRING,
    //   allowNull: true,
    // },
    // outboundAgentId: {
    //   type: Sequelize.STRING,
    //   allowNull: true,
    // },
    status: {
      //what's the status
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      //Address. Google map picker
      type: Sequelize.STRING,
      allowNull: true,
    },
    modelId: {
      //synthflow Model Id
      type: Sequelize.STRING,
      allowNull: true,
    },
    type: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "outbound", // inbound and outbound
    },
    voiceId: {
      //Address. Google map picker
      type: Sequelize.STRING,
      allowNull: true,
    },
  });

  return AgentModel;
};

export default AgentModel;

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

    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
    },
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

    agentObjectiveId: {
      //Community Update
      type: Sequelize.INTEGER,
      allowNull: true,
      // defaultValue:
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
    prompt: {
      //Address. Google map picker
      type: Sequelize.TEXT("long"),
      allowNull: true,
    },
    modelId: {
      //synthflow Model Id
      type: Sequelize.STRING,
      allowNull: true,
    },
    // type: {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    //   defaultValue: "outbound", // inbound and outbound
    // },
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },

    phoneSid: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },

    phoneStatus: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "active", // inactive if payment fails
    },
    phoneNumberPrice: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2",
    },
    phonePurchasedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    callbackNumber: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },
    liveTransferNumber: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
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

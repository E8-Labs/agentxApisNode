// import LeadCadence from "./LeadsCadence";

//
const LeadCallsSent = (sequelize, Sequelize) => {
  const LeadCallsSent = sequelize.define("LeadCallsSent", {
    //   pipelineId: {
    //     // can identify the agent, pipeline and stage
    //     type: Sequelize.INTEGER,
    //     allowNull: false,
    //     references: {
    //       model: "Pipelines",
    //       key: "id",
    //     },
    //   },

    //   mainAgentId: {
    //     type: Sequelize.INTEGER,
    //     allowNull: true,
    //     references: {
    //       model: "MainAgentModels",
    //       key: "id",
    //     },
    //   },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "LeadModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    leadCadenceId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "LeadCadences",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
    },
    duration: {
      type: Sequelize.DOUBLE,
      allowNull: true,
    },

    callTriggerTime: {
      // we may use it. If user have a limit on the number of calls then we have to update it.
      //We may not use it
      type: Sequelize.DATE,
      allowNull: true,
    },
    synthflowCallId: {
      // synthflowCallId
      type: Sequelize.STRING,
      allowNull: true,
    },
    transcript: {
      // synthflowCallId
      type: Sequelize.TEXT("long"),
      allowNull: true,
    },
    summary: {
      // synthflowCallId
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      default: "",
      allowNull: false,
    },

    callData: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },

    recordingUrl: {
      type: Sequelize.TEXT("medium"),
      // defaultValue: "",
      allowNull: true,
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
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });
  LeadCallsSent.associate = (models) => {
    LeadCallsSent.belongsTo(models.LeadModel, {
      foreignKey: "leadId",
      as: "LeadModel",
    });

    LeadCallsSent.belongsTo(models.LeadCadence, {
      foreignKey: "leadCadenceId",
      as: "LeadCadence",
    });

    LeadCallsSent.belongsTo(models.PipelineStages, {
      foreignKey: "stage",
      as: "PipelineStages",
    });
  };

  return LeadCallsSent;
};

export default LeadCallsSent;

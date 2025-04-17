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

    batchId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "LeadModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    leadCadenceId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "LeadCadences",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "SET NULL",
    },
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "SET NULL",
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
    endCallReason: {
      type: Sequelize.STRING,
      defaultValue: "",
      allowNull: false,
    },

    callData: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    originalRecordingUrl: {
      type: Sequelize.TEXT("medium"),
      // defaultValue: "",
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
    pipelineId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      // references: {
      //   model: "Pipeline",
      //   key: "id",
      // },
      // onDelete: "CASCADE",
      // onUpdate: "CASCADE",
    },

    dnd: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    nodecisionmaker: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    wrongnumber: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    humancalldrop: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    voicemail: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    Busycallback: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    nodecisionmaker: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    meetingscheduled: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    notinterested: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    hotlead: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    callmeback: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    call_review_worthy: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    testCall: {
      type: Sequelize.BOOLEAN,
      // allowNull: false,
      defaultValue: false,
    },
    bookingCall: {
      type: Sequelize.BOOLEAN,
      // allowNull: false,
      defaultValue: false,
    },
    meeting: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    movedToStage: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    callOutcome: {
      type: Sequelize.STRING,
      // allowNull: false,
      defaultValue: "",
    },
    conversation_detected: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    call_violation_detected: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    ai_non_responsive_detected: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    callRecordingDownloaded: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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

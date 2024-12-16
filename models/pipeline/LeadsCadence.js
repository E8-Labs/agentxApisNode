// When a lead is assigned to an agent in a pipeline then Add to this table
// leadId, agentId, pipelineId, leads initial stage becomes New Lead if the lead has no stage
// We allow user to select Leads(array of lead ids), allow him to select agents(array of agents)
//Then tap on assign button.
// Get PipeLineCadenceId: The api will get the cadence using agentId, stageId() and pipelineId

//
const LeadCadence = (sequelize, Sequelize) => {
  const LeadCadence = sequelize.define("LeadCadence", {
    pipelineId: {
      // can identify the agent, pipeline and stage
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Pipelines",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    // pipelineCadenceId: {
    //   // can identify the agent, pipeline and stage
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: "PipelineCadences",
    //     key: "id",
    //   },
    //   onDelete: "CASCADE",
    //   onUpdate: "CASCADE",
    // },
    batchId: {
      // can identify the agent, pipeline and stage
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: "CadenceBatchModels",
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
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
    },

    callTriggerTime: {
      // we may use it. If user have a limit on the number of calls then we have to update it.
      //We may not use it
      type: Sequelize.DATE,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: CadenceStatus.Pending, // when user assigns that lead to another pipeline then that cadence status changes to Paused
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
  });

  LeadCadence.associate = (models) => {
    LeadCadence.hasMany(models.LeadCallsSent, {
      foreignKey: "leadCadenceId",
      as: "LeadCalls",
    });

    LeadCadence.belongsTo(models.LeadModel, {
      foreignKey: "leadId",
      as: "Lead",
    });
  };

  return LeadCadence;
};

export const CadenceStatus = {
  Pending: "Pending",
  Started: "Started",
  Paused: "Paused",
  Errored: "Errored", // invalid number or something else. Call status is error
  Booked: "Booked", // the rest of the cadence for that
};

export const CallStatus = {
  Pending: "Pending",
  Called: "Called",
  Cancelled: "Cancelled",
};

export default LeadCadence;

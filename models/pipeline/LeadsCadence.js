// When a lead is assigned to an agent in a pipeline then Add to this table
// leadId, agentId, pipelineId, leads initial stage becomes New Lead if the lead has no stage
// We allow user to select Leads(array of lead ids), allow him to select agents(array of agents)
//Then tap on assign button.
// Get PipeLineCadenceId: The api will get the cadence using agentId, stageId() and pipelineId

//
const LeadCadence = (sequelize, Sequelize) => {
  const PipelineCadence = sequelize.define("LeadCadence", {
    pipelineId: {
      // can identify the agent, pipeline and stage
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Pipelines",
        key: "id",
      },
    },

    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
    },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "LeadModels",
        key: "id",
      },
    },

    callTriggerTime: {
      // we may use it. If user have a limit on the number of calls then we have to update it.
      //We may not use it
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: CadenceStatus.Pending,
    },
    callStatus: {
      // statuses from synthflow for calls
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: CadenceStatus.Pending,
    },
  });

  return LeadCadence;
};

export const CadenceStatus = {
  Pending: "Pending",
  Called: "Called",
  Cancelled: "Cancelled",
  //   Booked: "Booked", // the rest of the cadence for that
};

export const CallStatus = {
  Pending: "Pending",
  Called: "Called",
  Cancelled: "Cancelled",
};

export default LeadCadence;

import db from "../models/index.js";

export async function GetAgentPipeline(mainAgentId) {
  let pipeline = null;

  let cadence = await db.PipelineCadence.findOne({
    where: {
      mainAgentId: mainAgentId,
    },
  });
  if (cadence) {
    pipeline = await db.Pipeline.findByPk(cadence.pipelineId);
  }

  return pipeline;
}

//new_lead, booking, etc
export async function GetPipelineStageWithIdentifier(
  identifier = "new_lead",
  pipelineId
) {
  let stage = await db.PipelineStages.findOne({
    where: {
      pipelineId: pipelineId,
      identifier: identifier,
    },
  });

  return stage;
}

export async function GetAllMainAgentsForUser(userId) {
  let agents = await db.MainAgentModel.findAll({
    where: {
      userId: userId,
    },
  });

  return agents;
}

export async function GetAgentsWorkingOnStage(stageId, userId) {
  let foundAgents = null;
  let agents = await db.MainAgentModel.findAll({
    where: {
      userId: userId,
    },
  });
  let agentIds = [];
  if (agents && agents.length > 0) {
    agentIds = agents.map((item) => item.id);
  }

  let cadence = await db.PipelineCadence.findAll({
    where: {
      mainAgentId: {
        [db.Sequelize.Op.in]: agentIds,
        stage: stageId,
      },
    },
  });
  if (cadence && cadence.length > 0) {
    let agentsIdsInBooking = cadence.map((item) => item.mainAgentId);
    foundAgents = await db.AgentModel.findAll({
      where: {
        mainAgentId: {
          [db.Sequelize.Op.in]: agentsIdsInBooking,
        },
        agentType: "outbound",
      },
    });
  }
  console.log("Found agents working on stage ", foundAgents?.length || 0);
  return foundAgents;
}

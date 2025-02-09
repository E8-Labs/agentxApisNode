import db from "../models/index.js";
import SubAgentLiteResource from "./SubAgentLiteResource.js";

const Op = db.Sequelize.Op;

const LeadCallResource = async (user, currentUser = null) => {
  if (!Array.isArray(user)) {
    ////////console.log("Not array")
    return await getUserData(user, currentUser);
  } else {
    ////////console.log("Is array")
    const data = [];
    for (let i = 0; i < user.length; i++) {
      const p = await getUserData(user[i], currentUser);
      ////////console.log("Adding to index " + i)
      data.push(p);
    }

    return data;
  }
};

async function getUserData(call, currentUser = null) {
  let pipelineId = call.pipelineId || null;
  if (pipelineId == null) {
    let leadCadId = call.leadCadenceId;
    let leadCad = await db.LeadCadence.findByPk(leadCadId);
    if (leadCad) {
      pipelineId = leadCad.pipelineId;
    }
  }
  let pipeline = null;
  if (pipelineId) {
    pipeline = await db.Pipeline.findByPk(pipelineId);
  }
  let callData = null;
  try {
    callData = { ...call.get() };
    delete callData.callData;
  } catch (error) {
    callData = call;
  }
  callData.pipeline = pipeline;

  let PipelineStages = null;
  if (callData?.LeadModel?.stage) {
    PipelineStages = await db.PipelineStages.findByPk(callData.LeadModel.stage);
    callData.PipelineStages = PipelineStages;
  } else {
    let leadId = callData.leadId;
    let leadModel = await db.LeadModel.findByPk(leadId);
    callData.LeadModel = leadModel;
    PipelineStages = await db.PipelineStages.findByPk(callData.LeadModel.stage);
    callData.PipelineStages = PipelineStages;
  }

  if (callData?.LeadModel?.id) {
    let tags = await db.LeadTagsModel.findAll({
      where: {
        leadId: callData?.LeadModel?.id,
      },
    });
    if (tags && tags.length > 0) {
      callData.tags = tags.map((tag) => tag.tag);
    }
  }

  let subAgentId = callData.agentId;
  let agent = await db.AgentModel.findByPk(subAgentId);
  callData.agent = SubAgentLiteResource(agent);

  let callStage = null;
  if (callData.stage) {
    callStage = await db.PipelineStages.findByPk(callData.stage);
    callData.callStage = callStage;
  }

  const LeadCallResource = callData;

  return LeadCallResource;
}

export default LeadCallResource;

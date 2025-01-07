import db from "../models/index.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

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
  } catch (error) {
    callData = call;
  }
  callData.pipeline = pipeline;

  let PipelineStages = null;
  if (callData.LeadModel.stage) {
    PipelineStages = await db.PipelineStages.findByPk(callData.LeadModel.stage);
    callData.PipelineStages = PipelineStages;
  }

  const LeadCallResource = callData;

  return LeadCallResource;
}

export default LeadCallResource;

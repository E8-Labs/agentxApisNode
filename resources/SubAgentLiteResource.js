import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import KycResource from "./kycResource.js";
import PipelineStages from "../models/pipeline/pipelineStages.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const SubAgentLiteResource = async (user, currentUser = null) => {
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

async function getUserData(subAgent, currentUser = null) {
  //   let agent = await db.AgentModel.findByPk(subAgent.id);

  //   let agentRes = [];
  //   for (const ag of agents) {
  //     let agent = { ...ag.get() };
  //     let totalDuration = await db.LeadCallsSent.sum("duration", {
  //       where: {
  //         agentId: ag.id,
  //       },
  //     });
  //     agent.totalDuration = totalDuration;

  //     let calls = await db.LeadCallsSent.count({
  //       where: {
  //         agentId: ag.id,
  //       },
  //     });
  //     agent.calls = calls;
  //     let callsGt10 = await db.LeadCallsSent.count({
  //       where: {
  //         agentId: ag.id,
  //         duration: {
  //           [db.Sequelize.Op.gt]: 10,
  //         },
  //       },
  //     });
  //     agent.callsGt10 = callsGt10;

  //     let durationText = "";
  //     if (totalDuration < 60) {
  //       durationText = "Less than a min";
  //     } else {
  //       let min = parseInt(totalDuration / 60);
  //       let sec = totalDuration % 60;
  //       durationText = `${min}`;
  //     }
  //     agent.durationText = durationText;
  //     if (agent.agentType == "outbound") {
  //       agent.prompt = {
  //         id: prompt.id,
  //         objective: prompt.objective,
  //         callScript: prompt.callScript,
  //         greeting: prompt.greeting,
  //       };
  //     } else {
  //       agent.prompt = {
  //         id: promptInbound.id,
  //         objective: promptInbound.objective,
  //         callScript: promptInbound.callScript,
  //         greeting: promptInbound.greeting,
  //       };
  //     }
  //     agentRes.push(agent);
  //   }

  const AgentLiteResource = {
    id: subAgent.id,
    mainAgentId: subAgent.mainAgentId,
    name: subAgent.name,
    agentRole: subAgent.agentRole,
    agentType: subAgent.agentType,
    agentObjective: subAgent.agentObjective,
    modelId: subAgent.modelId,
    phoneNumber: subAgent.phoneNumber,
    voiceId: subAgent.voiceId,
    thumb_profile_image: subAgent.thumb_profile_image,
  };

  return AgentLiteResource;
}

export default SubAgentLiteResource;

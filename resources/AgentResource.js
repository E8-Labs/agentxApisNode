import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
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

const AgentResource = async (user, currentUser = null) => {
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

async function getUserData(mainAgent, currentUser = null) {
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let agents = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  let pipelineCadences = await db.PipelineCadence.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });
  let pipeline = null;
  if (pipelineCadences && pipelineCadences.length > 0) {
    let pc = pipelineCadences[0];
    pipeline = await db.Pipeline.findOne({
      where: {
        id: pc.pipelineId,
      },
    });
  }

  let stages = [];
  if (pipelineCadences && pipelineCadences.length > 0) {
    for (let i = 0; i < pipelineCadences.length; i++) {
      let pc = pipelineCadences[i];
      let st = await db.PipelineStages.findOne({
        where: {
          id: pc.stage,
        },
      });
      if (st) {
        stages.push(st);
      }
    }
  }

  let prompt = await db.AgentPromptModel.findOne({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  let leadsAssigned = await db.LeadCadence.findAll({
    where: {
      mainAgentId: mainAgent.id,
      status: {
        [db.Sequelize.Op.in]: [CadenceStatus.Pending, CadenceStatus.Started],
      },
    },
  });

  const AgentResource = {
    ...mainAgent.get(),
    agents: agents,
    stages: stages,
    pipeline: pipeline,
    greeting: prompt?.greeting || "",
    callScript: prompt?.callScript || "",
    leadsAssigned: leadsAssigned?.length || 0,
  };

  return AgentResource;
}

export default AgentResource;

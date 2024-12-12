import db from "../models/index.js";
import AgentResource from "./AgentResource.js";
import AgentLiteResource from "./AgentLiteResource.js";
import { GetScheduledCallsForAgent } from "../controllers/pipelineController.js";
import LeadResource from "./LeadResource.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const BatchResource = async (user, currentUser = null) => {
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

async function getUserData(batch, currentUser = null) {
  //   let matchingAgents = agents.map((agent)=> agent.id == )
  let leadCad = await db.LeadCadence.findAll({
    where: {
      batchId: batch.id,
    },
  });
  let agentIds = leadCad.map((lc) => lc.mainAgentId);
  let agents = await db.MainAgentModel.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: agentIds,
      },
    },
  });
  let leadIds = leadCad.map((lc) => lc.leadId);
  let leads = await db.LeadModel.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: leadIds,
      },
    },
  });
  let i = 0;
  for (const l of leads) {
    //check candence
    let cadence = await db.PipelineCadence.findAll({
      where: {
        stage: l.stage,
        mainAgentId: {
          [db.Sequelize.Op.in]: agentIds,
        },
      },
      order: [["stage", "ASC"]],
    });
    if (cadence && cadence.length > 0) {
      //status is in queue
      leads[i].status = "In Queue";
      console.log(
        `Lead Stage: ${l.stage}  Agents: ${JSON.stringify(agentIds)}`
      );
      console.log("Last Cad Stage:", cadence);
    } else {
      //status Called
      leads[i].status = "Called";
    }
    i++;
  }

  let agentCalls = [];
  for (const ag of agentIds) {
    let calls = await GetScheduledCallsForAgent(ag);
    agentCalls.push({ agentId: ag, calls: calls });
  }

  const BatchResource = {
    ...batch.get(),
    leads: await LeadResource(leads),
    agents: await AgentLiteResource(agents),
    agentCalls: agentCalls,
  };

  return BatchResource;
}

export default BatchResource;

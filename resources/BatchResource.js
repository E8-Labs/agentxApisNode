import db from "../models/index.js";
import AgentResource from "./AgentResource.js";
import AgentLiteResource from "./AgentLiteResource.js";
import {
  GetScheduledCallsForAgent,
  GetScheduledFutureCalls,
} from "../controllers/pipelineController.js";
import LeadResource from "./LeadResource.js";
import LeadCallResource from "./LeadCallResource.js";
import LeadLiteResource from "./LeadLiteResource.js";
import AgentExtraLiteResource from "./AgentExtraLiteResource.js";
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
  let user = await db.User.findByPk(batch.userId);

  let agentIds = [];
  leadCad.map((lc) => {
    if (!agentIds.includes(lc.mainAgentId)) {
      agentIds.push(lc.mainAgentId);
    }
  });
  let agents = await db.MainAgentModel.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: agentIds,
      },
    },
  });
  // let leadIds = [];
  // leadCad.map((lc) => {
  //   if (!leadIds.includes(lc.leadId)) {
  //     leadIds.push(lc.leadId);
  //   }
  // });
  // let leads = await db.LeadModel.findAll({
  //   where: {
  //     id: {
  //       [db.Sequelize.Op.in]: leadIds,
  //     },
  //     // status: "active",
  //   },
  // });
  // let i = 0;
  // for (const l of leads) {
  //   //check candence
  //   let cadence = await db.PipelineCadence.findAll({
  //     where: {
  //       stage: l.stage,
  //       mainAgentId: {
  //         [db.Sequelize.Op.in]: agentIds,
  //       },
  //     },
  //     order: [["stage", "ASC"]],
  //   });
  //   if (cadence && cadence.length > 0) {
  //     //status is in queue
  //     leads[i].status = "In Queue";
  //     console.log(
  //       `Lead Stage: ${l.stage}  Agents: ${JSON.stringify(agentIds)}`
  //     );
  //     console.log("Last Cad Stage:", cadence);
  //   } else {
  //     //status Called
  //     leads[i].status = "Called";
  //   }
  //   i++;
  // }

  // let agentCalls = [];
  // for (const ag of agentIds) {
  //   let calls = await GetScheduledFutureCalls(ag, batch.id);
  //   agentCalls.push({ agentId: ag, calls: calls });
  // }

  // let pastCalls = await db.LeadCallsSent.findAll({
  //   where: {
  //     batchId: batch.id,
  //     mainAgentId: {
  //       [db.Sequelize.Op.in]: agentIds,
  //     },
  //   },
  // });

  // let res = await LeadCallResource(pastCalls);
  const BatchResource = {
    ...batch.get(),
    // leadsCount: leads.length,
    user: {
      name: user?.name,
      email: user?.email,
      id: user?.id,
      phone: user?.phone,
    },
    agents: await AgentExtraLiteResource(agents),
    //Below three fields will be removed from here and will be fetched via an api call on request
    // leads: await LeadLiteResource(leads),
    // agentCalls: agentCalls,
    // pastCalls: res,
  };

  return BatchResource;
}

export default BatchResource;

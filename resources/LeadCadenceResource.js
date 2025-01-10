import db from "../models/index.js";
import AgentExtraLiteResource from "./AgentExtraLiteResource.js";
import LeadLiteResource from "./LeadLiteResource.js";
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

const LeadCadenceResource = async (user, currentUser = null) => {
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

async function getUserData(leadCadence, currentUser = null) {
  // const subscriptionDetails = await getSubscriptionDetails(user);

  let agent = await db.MainAgentModel.findByPk(leadCadence.mainAgentId);
  let lead = await db.LeadModel.findByPk(leadCadence.leadId);

  const LeadCadenceResource = {
    ...leadCadence.get(),
    agent: await AgentExtraLiteResource(agent),
    lead: await LeadLiteResource(lead), //{ ...lead.get(), ...sheetWithTags?.get() },
  };

  return LeadCadenceResource;
}

export default LeadCadenceResource;

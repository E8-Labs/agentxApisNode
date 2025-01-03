import db from "../models/index.js";
import AgentExtraLiteResource from "./AgentExtraLiteResource.js";
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
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let agent = await db.MainAgentModel.findByPk(leadCadence.mainAgentId);
  let lead = await db.LeadModel.findByPk(leadCadence.leadId);
  let sheetWithTags = await db.LeadSheetModel.findOne({
    where: {
      id: lead.sheetId,
    },
    include: [
      {
        model: db.LeadSheetTagModel, // Reference to the tag model
        as: "tags", // Alias for the association (optional but recommended)
        attributes: ["tag"], // Specify the fields you want from the tag model
      },
      {
        model: db.LeadSheetColumnModel, // Reference to the tag model
        as: "columns", // Alias for the association (optional but recommended)
        attributes: ["columnName"], // Specify the fields you want from the tag model
      },
    ],
  });
  const LeadCadenceResource = {
    ...leadCadence.get(),
    agent: await AgentExtraLiteResource(agent),
    lead: await LeadResource(lead), //{ ...lead.get(), ...sheetWithTags?.get() },
  };

  return LeadCadenceResource;
}

export default LeadCadenceResource;

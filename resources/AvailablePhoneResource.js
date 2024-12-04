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

const AvailablePhoneResource = async (phone, currentUser = null) => {
  if (!Array.isArray(phone)) {
    ////////console.log("Not array")
    return await getUserData(phone, currentUser);
  } else {
    ////////console.log("Is array")
    const data = [];
    for (let i = 0; i < phone.length; i++) {
      const p = await getUserData(phone[i], currentUser);
      ////////console.log("Adding to index " + i)
      data.push(p);
    }

    return data;
  }
};

async function getUserData(phoneNumber, currentUser = null) {
  let userId = currentUser.id;

  let mainAgents = await db.MainAgentModel.findAll({
    where: {
      userId: userId,
    },
  });
  let mainAgentIds = mainAgents.map((mainAg) => mainAg.id);
  let claimedByAgent = await db.AgentModel.findOne({
    where: {
      mainAgentId: {
        [db.Sequelize.Op.in]: mainAgentIds,
      },
      phoneNumber: phoneNumber,
      agentType: "inbound",
    },
  });
  let claimedBy = null;
  if (claimedByAgent && typeof claimedByAgent !== "undefined") {
    claimedBy = {
      id: claimedByAgent.id,
      name: claimedByAgent.name,
      mainAgentId: claimedByAgent.mainAgentId,
      agentType: claimedByAgent.agentType,
    };
  }
  const AvailablePhoneResource = {
    phoneNumber,
    claimedBy: claimedBy,
  };

  return AvailablePhoneResource;
}

export default AvailablePhoneResource;

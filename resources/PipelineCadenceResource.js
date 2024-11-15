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

const PipelineCadenceResource = async (user, currentUser = null) => {
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

async function getUserData(cadence, currentUser = null) {
  //   console.log("Type of kyc is ", typeof kyc);

  let calls = await db.CadenceCalls.findAll({
    where: {
      pipelineCadenceId: cadence.id,
    },
  });
  const PipelineCadenceResource = {
    ...cadence.get(),
    calls: calls,
  };

  return PipelineCadenceResource;
}

export default PipelineCadenceResource;

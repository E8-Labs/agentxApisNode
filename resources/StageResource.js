import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import LeadCadenceResource from "./LeadCadenceResource.js";
import PipelineCadenceResource from "./PipelineCadenceResource.js";
import PipelineStageResource from "./PipelineStageResource.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const StageResource = async (user, currentUser = null) => {
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

async function getUserData(stage, currentUser = null) {
  //   console.log("Type of kyc is ", typeof kyc);

  let hasLeads = false;

  let leadCount = await db.LeadModel.count({
    where: {
      stage: stage.id,
    },
  });
  if (leadCount > 0) {
    hasLeads = true;
  }

  const PipelineResource = {
    ...stage.get(),
    hasLeads: hasLeads,
  };

  return PipelineResource;
}

export default StageResource;

import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import LeadCadenceResource from "./LeadCadenceResource.js";
import PipelineCadenceResource from "./PipelineCadenceResource.js";
import PipelineStageLiteResource from "./PipelineStageLiteResource.js";
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

const PipelineLiteResource = async (user, currentUser = null) => {
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

async function getUserData(pipeline, currentUser = null) {
  //   console.log("Type of kyc is ", typeof kyc);

  let stages = await db.PipelineStages.findAll({
    where: {
      pipelineId: pipeline.id,
    },
    order: [["order", "ASC"]],
  });
  let stageLeads = {};

  const PipelineResource = {
    ...pipeline.get(),
    stages: await PipelineStageLiteResource(stages),
  };

  return PipelineResource;
}

export default PipelineLiteResource;

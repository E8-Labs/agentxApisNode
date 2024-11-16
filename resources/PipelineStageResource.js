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

const PipelineStageResource = async (user, currentUser = null) => {
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

async function getUserData(pipelineStage, currentUser = null) {
  //   console.log("Type of kyc is ", typeof kyc);

  //   let cadence = await db.PipelineCadence

  //   let calls = await db.CadenceCalls.findAll({
  //     where: {
  //       pipelineCadenceId: cadence.id,
  //     },
  //   });

  //   let stage = await db.Stages.findOne({
  //     where: {
  //       id: pipelineStage.stageId,
  //     },
  //   });

  const PipelineStageResource = {
    ...pipelineStage.get(),
    // stage: stage,
  };

  return PipelineStageResource;
}

export default PipelineStageResource;

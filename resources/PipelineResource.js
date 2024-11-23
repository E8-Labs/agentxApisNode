import db from "../models/index.js";
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

const PipelineResource = async (user, currentUser = null) => {
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

  let cadences = await db.PipelineCadence.findAll({
    where: {
      pipelineId: pipeline.id,
    },
  });

  //   let calls = await db.CadenceCalls.findAll({
  //     where: {
  //       pipelineCadenceId: cadence.id,
  //     },
  //   });

  //Find Leads assigned to this pipeline
  let leadCadences = await db.LeadCadence.findAll({
    where: {
      pipelineId: pipeline.id,
    },
  });

  let leads = [];
  for (let i = 0; i < leadCadences.length; i++) {
    let lc = leadCadences[i];
    // let leadId = lc.leadId;
    // let lead = await db.LeadModel.findByPk(leadId);
    // if (lead) {
    let leadRes = await LeadCadenceResource(lc);
    leads.push(leadRes);
    // }
  }

  let stages = await db.PipelineStages.findAll({
    where: {
      pipelineId: pipeline.id,
    },
  });
  let stageLeads = {};
  for (let i = 0; i < stages.length; i++) {
    let st = stages[i];
    //count total leads in this stage
    let count = 0;
    leads.map((item) => {
      if (item.stage == st.id) {
        count += 1;
      }
    });
    stageLeads[st.id] = count;
  }

  const PipelineResource = {
    ...pipeline.get(),
    stages: await PipelineStageResource(stages),
    cadences: await PipelineCadenceResource(cadences),
    leads: leads,
    leadsCountInStage: stageLeads,
  };

  return PipelineResource;
}

export default PipelineResource;

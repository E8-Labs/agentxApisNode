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

// async function getUserData(pipeline, currentUser = null) {
//   //   console.log("Type of kyc is ", typeof kyc);

//   let stages = await db.PipelineStages.findAll({
//     where: {
//       pipelineId: pipeline.id,
//     },
//     order: [["order", "ASC"]],
//   });
//   let stageLeads = {};

//   const PipelineResource = {
//     ...pipeline.get(),
//     stages: await PipelineStageLiteResource(stages),
//   };

//   return PipelineResource;
// }

async function getUserData(pipeline, currentUser = null) {
  //   console.log("Type of kyc is ", typeof kyc);

  // let cadences = await db.PipelineCadence.findAll({
  //   where: {
  //     pipelineId: pipeline.id,
  //   },
  // });

  //   let calls = await db.CadenceCalls.findAll({
  //     where: {
  //       pipelineCadenceId: cadence.id,
  //     },
  //   });

  //Find Leads assigned to this pipeline
  // let leadCadences = await db.LeadCadence.findAll({
  //   where: {
  //     pipelineId: pipeline.id,
  //     status: {
  //       [db.Sequelize.Op.in]: [CadenceStatus.Started, CadenceStatus.TestLead],
  //     },
  //   },
  //   // group: ["leadId"], // Group by leadId to ensure uniqueness
  // });

  // let leads = [];
  // let leadIds = [];
  // for (let i = 0; i < leadCadences.length; i++) {
  //   let lc = leadCadences[i];
  //   let mainAgentId = lc.mainAgentId;
  //   let lead = await db.LeadModel.findByPk(lc.leadId);
  //   let pipelineCadence = await db.PipelineCadence.findOne({
  //     where: {
  //       pipelineId: pipeline.id,
  //       mainAgentId: mainAgentId,
  //       stage: lead.stage,
  //     },
  //   });

  //   if (!leadIds.includes(lc.leadId) && pipelineCadence) {
  //     leadIds.push(lc.leadId);
  //     let leadRes = await LeadCadenceResource(lc);
  //     leads.push(leadRes);
  //   }
  //   // let leadId = lc.leadId;
  //   // let lead = await db.LeadModel.findByPk(leadId);
  //   // if (lead) {

  //   // }
  // }
  // //if a lead is in a stage which is not assigned to any agent
  // for (const lc of leadCadences) {
  //   if (!leadIds.includes(lc.leadId)) {
  //     leadIds.push(lc.leadId);
  //     let leadRes = await LeadCadenceResource(lc);
  //     leads.push(leadRes);
  //   }
  // }

  let stages = await db.PipelineStages.findAll({
    where: {
      pipelineId: pipeline.id,
    },
    order: [["order", "ASC"]],
  });
  // let stageLeads = {};
  // for (let i = 0; i < stages.length; i++) {
  //   let st = stages[i];
  //   //count total leads in this stage
  //   let count = 0;
  //   leads.map((item) => {
  //     if (item.stage == st.id) {
  //       count += 1;
  //     }
  //   });
  //   stageLeads[st.id] = count;
  // }

  const PipelineResource = {
    ...pipeline.get(),
    stages: await PipelineStageLiteResource(stages),
    // cadences: await PipelineCadenceResource(cadences),
    // leads: leads,
    // leadsCountInStage: stageLeads,
  };

  return PipelineResource;
}

export default PipelineLiteResource;

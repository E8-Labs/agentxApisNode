import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import KycResource from "./kycResource.js";
import PipelineStages from "../models/pipeline/pipelineStages.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const AgentResource = async (user, currentUser = null) => {
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

async function getUserData(mainAgent, currentUser = null) {
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let agents = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  let pipelineCadences = await db.PipelineCadence.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });
  let pipeline = null;
  if (pipelineCadences && pipelineCadences.length > 0) {
    let pc = pipelineCadences[0];
    pipeline = await db.Pipeline.findOne({
      where: {
        id: pc.pipelineId,
      },
    });
  }

  let stages = [];
  if (pipelineCadences && pipelineCadences.length > 0) {
    for (let i = 0; i < pipelineCadences.length; i++) {
      let pc = pipelineCadences[i];
      let st = await db.PipelineStages.findOne({
        where: {
          id: pc.stage,
        },
      });
      if (st) {
        stages.push(st);
      }
    }
  }

  let prompt = await db.AgentPromptModel.findOne({
    where: {
      mainAgentId: mainAgent.id,
      type: "outbound",
    },
  });
  let promptInbound = await db.AgentPromptModel.findOne({
    where: {
      mainAgentId: mainAgent.id,
      type: "inbound",
    },
  });

  let leadsAssigned = await db.LeadCadence.findAll({
    where: {
      mainAgentId: mainAgent.id,
      status: {
        [db.Sequelize.Op.in]: [CadenceStatus.Pending, CadenceStatus.Started],
      },
    },
  });

  let guardrails = await db.ObjectionAndGuradrails.findAll({
    where: {
      mainAgentId: mainAgent.id,
      type: "guardrail",
    },
  });
  let objections = await db.ObjectionAndGuradrails.findAll({
    where: {
      mainAgentId: mainAgent.id,
      type: "objection",
    },
  });

  let alreadyUsedGlobalNumber = await db.AgentModel.findAll({
    where: {
      phoneNumber: process.env.GlobalPhoneNumber,
      userId: mainAgent.userId,
    },
  });

  let agentRes = [];
  for (const ag of agents) {
    let agent = { ...ag.get() };
    let totalDuration = await db.LeadCallsSent.sum("duration", {
      where: {
        agentId: ag.id,
      },
    });
    agent.totalDuration = totalDuration;

    let calls = await db.LeadCallsSent.count({
      where: {
        agentId: ag.id,
      },
    });
    let CallStatusFailedCall = ["Voicemail", "Busy", "Failed", "No answer"];
    agent.calls = calls;
    let callsGt10 = await db.LeadCallsSent.count({
      where: {
        agentId: ag.id,
        conversation_detected: true,
        callOutcome: {
          [db.Sequelize.Op.notIn]: CallStatusFailedCall,
        },
      },
    });
    agent.callsGt10 = callsGt10;

    let hotleads = await db.LeadCallsSent.count({
      where: {
        agentId: ag.id,
        hotlead: true,
      },
    });
    agent.hotleads = hotleads;

    let booked = await db.LeadCallsSent.count({
      where: {
        agentId: ag.id,
        meetingscheduled: true,
      },
    });
    agent.booked = booked;

    let durationText = "";
    if (totalDuration < 60) {
      durationText = `${totalDuration} seconds`;
    } else {
      let min = parseInt(totalDuration / 60);
      let sec = totalDuration % 60;
      durationText = `${min}`;
    }
    agent.durationText = durationText;
    agent.voiceId = agent.voiceId ? agent.voiceId : "";
    if (agent.agentType == "outbound") {
      if (prompt) {
        agent.prompt = {
          id: prompt.id,
          callScript: prompt.callScript,
          greeting: prompt.greeting,
          objective: prompt.objective,
          type: prompt.type,
        };
      }
    } else {
      if (promptInbound) {
        agent.prompt = {
          id: promptInbound?.id,
          callScript: promptInbound?.callScript,
          greeting: promptInbound?.greeting,
          objective: promptInbound?.objective,
          type: promptInbound?.type,
        };
      }
    }

    let calendar = await db.CalendarIntegration.findOne({
      where: {
        mainAgentId: mainAgent.id,
        agentId: agent.id,
      },
      order: [["id", "DESC"]],
    });
    agent.calendar = calendar;

    let voicemail = await db.AgentVoicemailModel.findOne({
      where: {
        agentId: agent.id,
      },
      order: [["createdAt", "DESC"]],
    });
    agent.voicemail = voicemail;

    agentRes.push(agent);
  }

  let kycs = await db.KycModel.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  let qs = await KycResource(kycs);

  let currentOngoingCadence = 0;

  currentOngoingCadence = await db.LeadCadence.count({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  const AgentResource = {
    ...mainAgent.get(),
    agents: agentRes,
    stages: stages,
    pipeline: pipeline,
    greeting: prompt?.greeting || "",
    callScript: prompt?.callScript || "",
    leadsAssigned: leadsAssigned?.length || 0,
    inboundScript: promptInbound?.callScript || "",
    inboundGreeting: promptInbound?.greeting || "",
    guardrails,
    objections,
    kyc: qs,
    currentOngoingCadence: currentOngoingCadence,
    // calendar: calendar,
    alreadyAssignedGlobal:
      alreadyUsedGlobalNumber && alreadyUsedGlobalNumber.length > 0,

    // calls: calls,
    // callsGreaterThan10Sec: callsGt10,
    // durationInMin: durationText,
  };

  return AgentResource;
}

export default AgentResource;

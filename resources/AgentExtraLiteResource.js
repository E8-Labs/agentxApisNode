import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import KycResource from "./kycResource.js";
import PipelineStages from "../models/pipeline/pipelineStages.js";
import SubAgentLiteResource from "./SubAgentLiteResource.js";

const Op = db.Sequelize.Op;

const AgentExtraLiteResource = async (user, currentUser = null) => {
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
  let agents = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });

  let agentRes = [];
  for (const ag of agents) {
    let { id, name, agentRole, phoneNumber } = ag.get();
    let agent = await SubAgentLiteResource(ag);
    agentRes.push(agent);
  }

  const AgentLiteResource = {
    ...mainAgent.get(),
    agents: agentRes,
  };

  return AgentLiteResource;
}

export default AgentExtraLiteResource;

import db from "../models/index.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";

const Op = db.Sequelize.Op;

const NotificationResource = async (user, currentUser = null) => {
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

async function getUserData(not, currentUser = null) {
  let leadId = not.leadId;
  let agentId = not.agentId;
  let fromUserId = not.fromUserId;

  let lead = null,
    pipelineId = null,
    agent = null,
    fromUser = null;
  if (leadId) {
    lead = await db.LeadModel.findByPk(leadId);

    let cad = await db.LeadCadence.findOne({
      where: {
        leadId: leadId,
        status: CadenceStatus.Started,
      },
    });
    if (cad) {
      pipelineId = cad.pipelineId;
      // pipeline = await db.Pipeline.findOne()
    }
  }
  if (agentId) {
    agent = await db.AgentModel.findByPk(agentId);
  }
  if (fromUserId) {
    fromUser = await db.User.findByPk(fromUserId);
  }

  //Customized title
  let title = null;
  if (lead && not.type == NotificationTypes.LeadCalledBack) {
    title = `${lead.firstName} called`;
  } else {
    title = not.title;
  }
  const NotificationResource = {
    ...not.get(),
    title: title,
    lead,
    agent,
    fromUser,
    pipelineId: pipelineId,
  };

  return NotificationResource;
}

export default NotificationResource;

import db from "../models/index.js";

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
    agent = null,
    fromUser = null;
  if (leadId) {
    lead = await db.LeadModel.findByPk(leadId);
  }
  if (agentId) {
    agent = await db.AgentModel.findByPk(agentId);
  }
  if (fromUserId) {
    fromUser = await db.User.findByPk(fromUserId);
  }
  const NotificationResource = {
    ...not.get(),
    lead,
    agent,
    fromUser,
  };

  return NotificationResource;
}

export default NotificationResource;

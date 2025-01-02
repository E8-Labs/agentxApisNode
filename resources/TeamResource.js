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

export const TeamResource = async (user, currentUser = null) => {
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

async function getUserData(team, currentUser = null) {
  let invitingUser = await db.User.findByPk(team.invitingUserId);
  let invitedUser = await db.User.findByPk(team.invitedUserId);

  const TeamResource = {
    ...team.get(),
    invitingUser: invitingUser,
    invitedUser: invitedUser,

    // sheetTagsArray,
  };

  return TeamResource;
}

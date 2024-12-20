import db from "../models/index.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const UserProfileFullResource = async (user, currentUser = null) => {
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

async function getUserData(user, currentUser = null) {
  console.log("Type of user is ", typeof user);
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let alreadyUsedGlobalNumber = await db.AgentModel.findAll({
    where: {
      phoneNumber: process.env.GlobalPhoneNumber,
      userId: user.id,
    },
  });

  let planHistory = await db.PlanHistory.findAll({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
    limit: 1,
  });
  const UserFullResource = {
    ...user.get(),
    plan: planHistory && planHistory.length > 0 ? planHistory[0] : null,
    alreadyAssignedGlobal:
      alreadyUsedGlobalNumber && alreadyUsedGlobalNumber.length > 0,
    availableMinutes: user.totalSecondsAvailable / 60,
  };

  return UserFullResource;
}

export default UserProfileFullResource;

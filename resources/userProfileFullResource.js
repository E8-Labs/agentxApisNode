import db from "../models/index.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
import { getPaymentMethods } from "../utils/stripe.js";

const Op = db.Sequelize.Op;

const UserProfileFullResource = async (user, currentUser = null) => {
  if (!Array.isArray(user)) {
    return await getUserData(user, currentUser);
  } else {
    const data = [];
    for (let i = 0; i < user.length; i++) {
      const p = await getUserData(user[i], currentUser);

      data.push(p);
    }

    return data;
  }
};

async function getUserData(user, currentUser = null) {
  console.log("Type of user is ", typeof user);

  let alreadyUsedGlobalNumber = await db.AgentModel.findAll({
    where: {
      phoneNumber: process.env.GlobalPhoneNumber,
      userId: user.id,
    },
  });

  let planHistory = await db.PlanHistory.findAll({
    where: {
      userId: user.id,
      environment: process.env.Environment,
    },
    order: [["createdAt", "DESC"]],
    limit: 1,
  });

  let services = await db.UserServicesModel.findAll({
    where: {
      userId: user.id,
    },
  });

  let focusAreas = await db.UserFocusModel.findAll({
    where: {
      userId: user.id,
    },
  });

  let unread = await db.NotificationModel.count({
    where: {
      userId: user.id,
      isSeen: false,
    },
  });

  let cardsData = await getPaymentMethods(user.id);
  let cards = [];
  if (cardsData && cardsData.status) {
    cards = cardsData.data;
  }

  const UserFullResource = {
    ...user.get(),
    plan: planHistory && planHistory.length > 0 ? planHistory[0] : null,
    alreadyAssignedGlobal:
      alreadyUsedGlobalNumber && alreadyUsedGlobalNumber.length > 0,
    availableMinutes: user.totalSecondsAvailable / 60,
    totalSecondsAvailable: user.totalSecondsAvailable,
    unread: unread,
    focusAreas,
    services,
    cards: cards,
  };

  return UserFullResource;
}

export default UserProfileFullResource;

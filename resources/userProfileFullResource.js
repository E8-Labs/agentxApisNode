import { generateAlphaNumericInviteCode } from "../controllers/userController.js";
import db from "../models/index.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
import { UserTypes } from "../models/user/userModel.js";
import { GetTeamAdminFor } from "../utils/auth.js";
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
  let admin = null;
  if (user.userRole == "Invitee") {
    let invite = await db.TeamModel.findOne({
      where: { invitedUserId: user.id },
    });
    if (invite) {
      admin = await db.User.findByPk(invite.invitingUserId);
    }
  }
  if (user.myInviteCode == null || user.myInviteCode == "") {
    user.myInviteCode = generateAlphaNumericInviteCode(6);
    await user.save();
  }
  //If this is not admin user then find the admin as done above and fetch his plans
  let alreadyUsedGlobalNumber = await db.AgentModel.findAll({
    where: {
      phoneNumber: process.env.GlobalPhoneNumber,
      userId: admin ? admin.id : user.id,
    },
  });

  console.log("Fetching plan history for admin ", admin?.id);
  let planHistory = await db.PlanHistory.findAll({
    where: {
      userId: admin ? admin.id : user.id,
      // environment: process.env.Environment,
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
  //If this is not admin user then find the admin as done above and fetch his plans
  let cardsData = await getPaymentMethods(admin ? admin.id : user.id);
  let cards = [];
  if (cardsData && cardsData.status) {
    cards = cardsData.data;
  }

  let campaignee = await db.CampaigneeModel.findOne({
    where: { id: user.campaigneeId || 1 },
  });

  let waitlist = false;
  if (user.userType == UserTypes.WebsiteAgent) {
    waitlist = true;
  } else {
    if (user.userRole == "Invitee") {
      let admin = await GetTeamAdminFor(user);
      if (admin.userType == UserTypes.WebsiteAgent) {
        waitlist = true;
      }
    }
  }

  const UserFullResource = {
    ...user.get(),
    plan: planHistory && planHistory.length > 0 ? planHistory[0] : null,
    alreadyAssignedGlobal:
      alreadyUsedGlobalNumber && alreadyUsedGlobalNumber.length > 0,
    availableMinutes: user.totalSecondsAvailable / 60,
    totalSecondsAvailable: admin
      ? admin.totalSecondsAvailable
      : user.totalSecondsAvailable,
    isTrial: admin ? admin.isTrial : user.isTrial,
    unread: unread,
    focusAreas,
    services,
    cards: cards,
    campaignee: campaignee,
    waitlist: waitlist,
    // admin: admin,
  };

  return UserFullResource;
}

export default UserProfileFullResource;

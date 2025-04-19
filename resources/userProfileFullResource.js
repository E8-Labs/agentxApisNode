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
  // console.log("Type of user is ", typeof user);
  let admin = null;
  let supportPlan = null;
  if (user.userRole == "Invitee") {
    let invite = await db.TeamModel.findOne({
      where: { invitedUserId: user.id },
    });
    if (invite) {
      admin = await db.User.findByPk(invite.invitingUserId);
      supportPlan = admin?.supportPlan;
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

  let userIndustry = await db.UserIndustry.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: db.Sequelize.literal(
          `(SELECT industry FROM UserSelectedIndustryModels WHERE userId = ${user.id})`
        ),
      },
    },
  });

  let services = await db.AgentService.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: db.Sequelize.literal(
          `(SELECT agentService FROM UserServicesModels WHERE userId = ${user.id})`
        ),
      },
    },
  });

  let focusAreas = await db.AreaOfFocus.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: db.Sequelize.literal(
          `(SELECT areaOfFocus FROM UserFocusModels WHERE userId = ${user.id})`
        ),
      },
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
      if (admin?.userType == UserTypes.WebsiteAgent) {
        waitlist = true;
      }
    }
  }

  let totalAmountSpent = await db.PaymentHistory.sum("price", {
    where: {
      userId: user.id,
    },
  });

  let totalLeads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });

  let teamMembers = await db.TeamModel.count({
    where: {
      invitingUserId: user.id,
    },
  });

  let lastRequest = await db.UserActivityModel.findOne({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
  });
  let lastActive = null;
  if (lastRequest) {
    lastActive = lastRequest.createdAt;
  }

  const UserFullResource = {
    ...user.get(),
    userType: admin ? admin.userType : user.userType,
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
    userIndustry,
    cards: cards,
    campaignee: campaignee,
    waitlist: waitlist,
    supportPlan: supportPlan,
    enrichCredits: admin?.enrichCredits || 0,
    amountSpent: totalAmountSpent,
    totalLeads: totalLeads,
    teamMembers: teamMembers,
    lastActive: lastActive,
    // admin: admin,
  };

  return UserFullResource;
}

export default UserProfileFullResource;

import { generateAlphaNumericInviteCode } from "../controllers/userController.js";
import db from "../models/index.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
import { UserTypes } from "../models/user/userModel.js";
import { GetTeamAdminFor } from "../utils/auth.js";
import { getPaymentMethods } from "../utils/stripe.js";

const Op = db.Sequelize.Op;

const UserProfileAdminResource = async (user, currentUser = null) => {
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

  //If this is not admin user then find the admin as done above and fetch his plans
  let alreadyUsedGlobalNumber = await db.AgentModel.findAll({
    where: {
      phoneNumber: process.env.GlobalPhoneNumber,
      userId: user.id,
    },
  });

  //   console.log("Fetching plan history for admin ", admin?.id);
  let planHistory = await db.PlanHistory.findAll({
    where: {
      userId: user.id,
      // environment: process.env.Environment,
    },
    order: [["createdAt", "DESC"]],
    limit: 1,
  });

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

  let totalSpent = await db.PaymentHistory.sum("price", {
    where: {
      userId: user.id,
    },
  });
  let minUsed = 0;
  let leads = await db.LeadModel.findAll({
    where: {
      userId: user.id,
    },
  });
  let leadIds = [];
  let totalLeads = 0;
  if (leads && leads.length > 0) {
    totalLeads = leads.length;
    leadIds = leads.map((lead) => lead.id);
  }
  console.log("Lead Ids ");
  if (leadIds && leadIds.length > 0) {
    minUsed = await db.LeadCallsSent.sum("duration", {
      where: {
        leadId: {
          [db.Sequelize.Op.in]: leadIds,
        },
      },
    });
  }

  let agents = await db.AgentModel.count({
    where: {
      userId: user.id,
    },
  });

  let teams = await db.TeamModel.count({
    where: {
      invitingUserId: user.id,
    },
  });

  const UserFullResource = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    leads: totalLeads,
    agents: agents,
    totalSpent: totalSpent,
    nextChargeDate: user.nextChargeDate,
    createdAt: user.createdAt,
    thumb_profile_image: user.thumb_profile_image,
    minutesUsed: minUsed,
    plan: user.isTrial
      ? "Trial"
      : planHistory && planHistory.length > 0
      ? planHistory[0].type
      : "-",

    availableMinutes: user.totalSecondsAvailable / 60,
    totalSecondsAvailable: user.totalSecondsAvailable,
    isTrial: user.isTrial,
    teams: teams,
    // campaignee: campaignee,
    closerName: campaignee?.name || "-",
    closerUrl: campaignee?.uniqueUrl || "-",
    // admin: admin,
  };

  return UserFullResource;
}

export default UserProfileAdminResource;

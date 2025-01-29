import db from "../models/index.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
import { UserRole } from "../models/user/userModel.js";

export async function GetTeamIds(user) {
  let teams = await db.TeamModel.findAll({
    where: {
      [db.Sequelize.Op.or]: {
        invitingUserid: user.id,
        invitedUserid: user.id,
      },
    },
  });
  let teamIds = [];
  if (teams && teams.length > 0) {
    teams.map((team) => {
      if (!teamIds.includes(team.invitedUserId)) {
        teamIds.push(team.invitedUserId);
      }
      if (!teamIds.includes(team.invitingUserId)) {
        teamIds.push(team.invitingUserId);
      }
    });
  } else {
    teamIds.push(user.id);
  }

  return teamIds;
}

export async function GetTeamAdminFor(user) {
  let admin = user;
  if (user.userRole == UserRole.Invitee) {
    let invite = await db.TeamModel.findOne({
      where: { invitedUserId: user.id },
    });
    admin = await db.User.findByPk(invite.invitingUserId);
  }
  return admin;
}

export async function GetTrialStartDate(user) {
  let startDate = user.createdAt;
  let firstPlan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
      type: PayAsYouGoPlanTypes.Plan30Min,
    },
    order: [["createdAt", "ASC"]],
  });
  if (firstPlan) {
    //if first plan then this is the trial start date.
    startDate = firstPlan.createdAt;
  }
  return startDate;
}

export async function IsTrialActive(user) {
  let startDate = user.createdAt;
  let firstPlan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
      type: PayAsYouGoPlanTypes.Plan30Min,
    },
    order: [["createdAt", "ASC"]],
  });
  if (firstPlan) {
    //if first plan then this is the trial start date.
    startDate = firstPlan.createdAt;
  }
  let trialStartDate = new Date(startDate);
  let now = new Date();
  let timeDifference = now - trialStartDate;
  let isTrial = user.isTrial && timeDifference < 7 * 24 * 60 * 60 * 1000;
  console.log("Is user on trial", isTrial);
  return isTrial;
}
export const detectDevice = (req) => {
  const userAgent = req.headers["user-agent"];
  console.log("User agent ", userAgent);
  const isMobile = /Mobile|Android|iP(hone|od|ad)|Windows Phone/i.test(
    userAgent
  );
  console.log("Is Mobile ", isMobile);
  // req.isMobile = isMobile;

  // next();
  return isMobile;
};
// User agent  Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1

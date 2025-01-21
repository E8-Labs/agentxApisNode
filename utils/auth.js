import db from "../models/index.js";
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

export const detectDevice = (req) => {
  const userAgent = req.headers["user-agent"];
  console.log("User agent ", userAgent);
  const isMobile = /Mobile|Android|iP(hone|od|ad)|Windows Phone/i.test(
    userAgent
  );
  // req.isMobile = isMobile;

  // next();
  return isMobile;
};

import db from "../models/index.js";

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
  }

  return teamIds;
}

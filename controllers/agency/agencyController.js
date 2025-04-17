import axios from "axios";
import db from "../../models/index.js";
import JWT from "jsonwebtoken";
import { UserRole } from "../../models/user/userModel.js";
import { createAccountLink } from "../../utils/stripeconnect.js";
import { generateTeamMemberInviteEmail } from "../../emails/InviteSendEmail.js";
import UserProfileFullResource from "../../resources/userProfileFullResource.js";

export async function CreateAgencyAccountOnboardingLink(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      console.log("Update User ", userId);
      // console.log("Update data ", req);
      let user = await db.User.findByPk(userId);
      console.log("Connected Account ", user.connectedAccountId);

      if (user.userRole == UserRole.Agency) {
        let link = await createAccountLink(user);

        return res.send({
          status: true,
          data: link,
          message: "Onboarding link",
        });
      } else {
        return res.send({
          status: false,
          data: null,
          message: "Only available for agency accounts",
        });
      }
    } else {
    }
  });
}

export async function CreateSubaccount(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      let name = req.body.name;
      let phone = req.body.phone;
      let email = req.body.email;

      let teamMembers = req.body.teams;

      console.log("Update User ", user.userRole);
      // console.log("Update data ", req);

      console.log("Connected Account ", user.connectedAccountId);

      if (user.userRole == UserRole.Agency) {
        let subAccountUser = await db.User.create({
          name: name,
          phone: phone,
          email: email,
          userRole: UserRole.AgencySubAccount,
          agencyId: user.id,
        });
        if (teamMembers && teamMembers.length > 0) {
          for (const team of teamMembers) {
            //Create an invite and send to user
            let invite = await db.TeamModel.create({
              name: team.name,
              phone: team.phone,
              email: team.email,
              invitingUserId: subAccountUser.id,
              status: "Pending",
            });

            try {
              let emailObj = generateTeamMemberInviteEmail(
                team.name,
                subAccountUser.name
              );
              let sent = await SendEmail(
                team.email,
                emailObj.subject,
                emailObj.html
              );
              console.log("Email sent");
            } catch (error) {}
            //Create a corresponding user in the db with role invitee
            let userCreated = await db.User.create({
              email: team.email,
              userType: null,
              name: team.name,
              phone: team.phone,
              userRole: UserRole.Invitee,
            });
          }
        }

        return res.send({
          status: true,
          data: null,
          message: "Subaccount created",
        });
      } else {
        return res.send({
          status: false,
          data: null,
          message: "Only available for agency accounts",
        });
      }
    } else {
    }
  });
}

export async function GetAgencySubAccounts(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findByPk(userId);

      if (user.userRole == UserRole.Agency) {
        let accounts = await db.User.findAll({
          where: {
            agencyId: user.id,
          },
        });

        return res.send({
          status: true,
          data: await UserProfileFullResource(accounts),
          message: "Sub accounts obtained",
        });
      } else {
        return res.send({
          status: false,
          data: null,
          message: "Only available for agency accounts",
        });
      }
    } else {
      return res.send({
        status: false,
        data: null,
        message: "Unauthenticated user",
      });
    }
  });
}

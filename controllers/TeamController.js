import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import { UserRole } from "../models/user/userModel.js";
import { TeamResource } from "../resources/TeamResource.js";

export function InviteTeamMember(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let user = await db.User.findByPk(authData.user.id);
      if (!user) {
        return res.send({
          status: false,
          message: "No such user",
        });
      }
      let { name, email, phone } = req.body;
      if (!name || !phone) {
        return res.send({
          status: false,
          message: "Provide required params: Name & Phone",
        });
      }

      //Check if invited already exists
      let invite = await db.TeamModel.findOne({
        where: {
          phone: phone,
          invitingUserId: user.id,
        },
      });
      //If invite already exists
      if (invite) {
        if (invite.status == "Pending") {
          // if status is pending then resend the ivnite as reminder
          //resend email
          return res.send({
            status: true,
            message: "Invite resent",
            data: invite,
          });
        } else {
          //If the status is accpeted or declined then send a proper message to the user
          return res.send({
            status: false,
            message: `${name} has already ${invite.status.toLowerCase()} your invite`,
          });
        }
      } else {
        //Create an invite and send to user
        invite = await db.TeamModel.create({
          name: name,
          phone: phone,
          email: email,
          invitingUserId: user.id,
          status: "Pending",
        });

        //Create a corresponding user in the db with role invitee
        let userCreated = await db.User.create({
          email: email,
          userType: null,
          name: name,
          phone: phone,
          userRole: UserRole.Invitee,
        });
        return res.send({
          status: true,
          message: "Invite sent",
          data: await TeamResource(invite),
        });
      }
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
}

export function GetTeamMembers(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let user = await db.User.findByPk(authData.user.id);
      if (!user) {
        return res.send({
          status: false,
          message: "No such user",
        });
      }

      let invites = await db.TeamModel.findAll({
        where: {
          invitingUserId: user.id,
        },
      });

      //Make a resource of the Teammodel
      let teamRes = await TeamResource(invites);
      return res.send({
        status: true,
        message: "Team list obtained",
        data: teamRes,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
}

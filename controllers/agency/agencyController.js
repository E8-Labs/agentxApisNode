import axios from "axios";
import db from "../../models/index.js";
import JWT from "jsonwebtoken";
import { UserRole } from "../../models/user/userModel.js";
import { createAccountLink } from "../../utils/stripeconnect.js";

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

      console.log("Update User ", userId);
      // console.log("Update data ", req);
      let user = await db.User.findByPk(userId);
      console.log("Connected Account ", user.connectedAccountId);

      if (user.userRole == UserRole.Agency) {
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

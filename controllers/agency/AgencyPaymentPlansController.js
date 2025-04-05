import axios from "axios";
import db from "../../models/index.js";
import JWT from "jsonwebtoken";
import { UserRole } from "../../models/user/userModel.js";
import { createAccountLink } from "../../utils/stripeconnect.js";

export async function LoadPlansForAgencies(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findByPk(userId);

      if (user.userRole == UserRole.Agency) {
        let plans = await db.PlanForAgency.findAll();

        return res.send({
          status: true,
          data: plans,
          message: "Plan obtained",
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

export async function CreateAgencyHostedPlan(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let {
        originalPrice,
        discountedPrice = null,
        percentageDiscount = null,
        minutes,
        title,
        planDescription,
        tag = null,
        hasTrial = false,
        trialMinutes = null,
        trialValidForDays = null,
      } = req.body;

      console.log("Update User ", userId);
      // console.log("Update data ", req);
      let user = await db.User.findByPk(userId);
      console.log("Connected Account ", user.connectedAccountId);

      if (user.userRole == UserRole.Agency) {
        let plan = await db.AgencyHostedPlans.create({
          type: `Plan${minutes}`,
          title: title,
          planDescription: planDescription,
          hasTrial: hasTrial,
          trialMinutes: trialMinutes,
          trialValidForDays: trialValidForDays,
          originalPrice: originalPrice,
          discountedPrice: discountedPrice,
          percentageDiscount: percentageDiscount,
          tag: tag,
          userId: user.id,
        });

        return res.send({
          status: true,
          data: plan,
          message: "Plan created",
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

export async function GetAgencyHostedPlans(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findByPk(userId);

      if (user.userRole == UserRole.Agency) {
        let plans = await db.AgencyHostedPlans.findAll({
          where: {
            userId: user.id,
          },
        });

        return res.send({
          status: true,
          data: plans,
          message: "Plan obtained",
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

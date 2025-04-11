import axios from "axios";
import db from "../../models/index.js";
import JWT from "jsonwebtoken";
import { UserRole } from "../../models/user/userModel.js";
import { createAccountLink } from "../../utils/stripeconnect.js";
import { chargeUser } from "../../utils/stripe.js";
import { ChargeTypes } from "../../models/user/payment/paymentPlans.js";
import { GetTitleForPlan } from "../PaymentController.js";

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

export async function SubscribePlan(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let planId = req.body.planId;
      console.log("Plan Id is ", planId);
      // return;
      let user = await db.User.findByPk(userId);
      if (user.userRole == UserRole.Agency) {
        let res = await SubscribeAgencyPlan(user, planId);
        if (res.status) {
          return res.send({
            status: true,
            message: "Plan subscribed",
            data: null,
          });
        } else {
          return res.send({
            status: false,
            message: res.message,
            data: null,
          });
        }
      } else if (user.userRole == UserRole.AgencySubAccount) {
        let res = await SubscribeAgencySubAccountPlan(user, plan);
      }
    }
  });
}

export async function SubscribeAgencyPlan(user, planId) {
  let plan = await db.PlanForAgency.findOne({
    where: {
      id: planId,
    },
  });
  if (!plan) {
    return {
      status: false,
      message: "No such plan",
      plan: planId,
    };
  }
  let price = plan.originalPrice * 100; //cents

  let charge = await chargeUser(
    user.id,
    price,
    "Agency Subscription",
    ChargeTypes.Subscription,
    true,
    null
  );

  if (charge && charge.status) {
    let historyCreated = await db.PaymentHistory.create({
      title: GetTitleForPlan(plan),
      description: `Payment for ${plan.title}`,
      type: ChargeTypes.AgencySubscription,
      price: plan.originalPrice,
      userId: user.id,
      environment: process.env.Environment,
      transactionId: charge.paymentIntent.id,
      planId: plan.id,
    });

    let planCreated = await db.PlanHistory.create({
      userId: user.id,
      type: ChargeTypes.AgencySubscription,
      price: plan.originalPrice,
      status: "active",
      environment: process.env.Environment,
      transactionId: charge.paymentIntent.id,
      planId: plan.id,
    });

    console.log(
      "SubscribeFunc: Receiving user seconds Before ",
      user.totalSecondsAvailable
    );

    let monthsToAdd = 1;
    if (plan.duration == "quarterly") {
      monthsToAdd = 4;
    } else if (plan.duration == "yearly") {
      monthsToAdd = 12;
    }

    let dateAfter30Days = new Date();
    dateAfter30Days.setMonth(dateAfter30Days.getMonth() + monthsToAdd);
    user.nextChargeDate = dateAfter30Days;
    await user.save();
    return {
      status: true,
      message: "Plan subscribed",
      plan: plan,
    };
  } else {
    return {
      status: false,
      message: charge.message,
      data: null,
    };
  }
}
export async function SubscribeAgencySubAccountPlan(user, planId) {
  let plan = await db.AgencyHostedPlans.findByPk(planId);
  if (!plan) {
    return {
      status: false,
      message: "No such plan",
      plan: planId,
    };
  }
  let price = plan.originalPrice * 100; //cents

  let charge = await chargeUser(
    user.id,
    price,
    "Agency Subscription",
    ChargeTypes.Subscription,
    true,
    null
  );

  if (charge && charge.status) {
    let historyCreated = await db.PaymentHistory.create({
      title: GetTitleForPlan(plan),
      description: `Payment for ${plan.title}`,
      type: ChargeTypes.AgencySubscription,
      price: plan.originalPrice,
      userId: user.id,
      environment: process.env.Environment,
      transactionId: charge.paymentIntent.id,
      planId: plan.id,
    });

    let planCreated = await db.PlanHistory.create({
      userId: user.id,
      type: ChargeTypes.AgencySubscription,
      price: plan.originalPrice,
      status: "active",
      environment: process.env.Environment,
      transactionId: charge.paymentIntent.id,
      planId: plan.id,
    });

    console.log(
      "SubscribeFunc: Receiving user seconds Before ",
      user.totalSecondsAvailable
    );
    return {
      status: true,
      message: "Plan subscribed",
      plan: plan,
    };
  }
}

import axios from "axios";
import db from "../../models/index.js";
import JWT from "jsonwebtoken";
import { UserRole } from "../../models/user/userModel.js";
import { createAccountLink } from "../../utils/stripeconnect.js";
import { chargeUser } from "../../utils/stripe.js";
import { ChargeTypes } from "../../models/user/payment/paymentPlans.js";
import { GetTitleForPlan } from "../PaymentController.js";
import { constants } from "../../constants/constants.js";

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

export async function GetAgencyHostedPlansForSubaccount(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findByPk(userId);

      let monthlyPlansForSubaccount = await db.AgencyPlanForSubaccount.findAll({
        where: {
          userId: user.id,
          xbar: false,
        },
      });

      let monthlyPlanIds = [];
      if (monthlyPlansForSubaccount && monthlyPlansForSubaccount.length > 0) {
        monthlyPlansForSubaccount.map((item) => {
          monthlyPlanIds.push(item.planId);
        });
      }

      let xbarPlansForSubaccount = await db.AgencyPlanForSubaccount.findAll({
        where: {
          userId: user.id,
          xbar: true,
        },
      });

      let xbarPlanIds = [];
      if (xbarPlansForSubaccount && xbarPlansForSubaccount.length > 0) {
        xbarPlansForSubaccount.map((item) => {
          xbarPlanIds.push(item.planId);
        });
      }

      let monthlyPlans = await db.AgencyHostedPlans.findAll({
        where: {
          id: {
            [db.Sequelize.Op.in]: monthlyPlanIds,
          },
        },
      });

      let xbarPlans = await db.AgencyHostedXbarPlans.findAll({
        where: {
          id: {
            [db.Sequelize.Op.in]: xbarPlanIds,
          },
        },
      });

      let plans = await db.AgencyHostedPlans.findAll({
        where: {
          userId: user.id,
        },
      });

      return res.send({
        status: true,
        data: { monthlyPlans: monthlyPlans, xbarPlans: xbarPlans },
        message: "Plan obtained",
      });
    } else {
      return res.send({
        status: false,
        data: null,
        message: "Unauthenticated user",
      });
    }
  });
}

export async function CreateAgencyHostedXbarPlan(req, res) {
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
      } = req.body;

      console.log("Update User ", userId);
      // console.log("Update data ", req);
      let user = await db.User.findByPk(userId);
      console.log("Connected Account ", user.connectedAccountId);

      if (user.userRole == UserRole.Agency) {
        let plan = await db.AgencyHostedXbarPlans.create({
          type: `Plan${minutes}`,
          title: title,
          planDescription: planDescription,

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

export async function GetAgencyHostedXbarPlans(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findByPk(userId);

      if (user.userRole == UserRole.Agency) {
        let plans = await db.AgencyHostedXbarPlans.findAll({
          where: {
            userId: user.id,
          },
        });

        return res.send({
          status: true,
          data: plans,
          message: "Xbar Plans obtained",
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
        let response = await SubscribeAgencyPlan(user, planId);
        if (response.status) {
          return res.send({
            status: true,
            message: "Plan subscribed",
            data: null,
          });
        } else {
          return res.send({
            status: false,
            message: response?.message || "Error subscribing plan",
            data: null,
          });
        }
      } else if (user.userRole == UserRole.AgencySubAccount) {
        let response = await SubscribeAgencySubAccountPlan(user, planId);
        if (response.status) {
          return res.send({
            status: true,
            message: "Plan subscribed",
            data: null,
          });
        } else {
          return res.send({
            status: false,
            message: response?.message || "Error subscribing plan",
            data: null,
          });
        }
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

  let OneTimeCharge = constants.AgencyOneTimeFee * 100; //$2000

  let olderPlan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
    },
  });
  const firstTime = !olderPlan;
  let oneTimeChargeId = null;
  if (firstTime) {
    //charge the one time fee $2000 as of now
    let chargeOneTimeFee = await chargeUser(
      user.id,
      OneTimeCharge,
      "Agency Subscription",
      ChargeTypes.AgencySubscriptionOneTimeFee,
      true,
      null
    );
    if (chargeOneTimeFee && chargeOneTimeFee.status) {
      oneTimeChargeId = chargeOneTimeFee.paymentIntent.id;
    } else {
      return {
        status: false,
        message: chargeOneTimeFee?.message || "Error charging payment method",
        data: null,
      };
    }
  }
  let charge = await chargeUser(
    user.id,
    price,
    "Agency Subscription",
    ChargeTypes.AgencySubscription,
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
    if (firstTime) {
      let historyCreated = await db.PaymentHistory.create({
        title: "Agency one time activation payment",
        description: `One time Payment for Agency`,
        type: ChargeTypes.AgencySubscriptionOneTimeFee,
        price: constants.AgencyOneTimeFee,
        userId: user.id,
        environment: process.env.Environment,
        transactionId: oneTimeChargeId,
        planId: plan.id,
      });
    }

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
      monthsToAdd = 3;
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

  let isFirstTime = true;
  let alreadyHadPlans = await db.PlanHistory.findAll({
    where: {
      userId: user.id,
    },
  });
  if (alreadyHadPlans) {
    isFirstTime = false;
  }

  let hasTrial = plan.trial || false;
  let planPrice = plan.discountedPrice
    ? plan.discountedPrice
    : plan.originalPrice;
  let price = planPrice * 100; //cents

  //if this plan doesn't have trial or the user have already subscribed to other plans and now subscribing or updating to this one
  //Then charge him and don't give away trial.
  if (!hasTrial || alreadyHadPlans) {
    let charge = await chargeUser(
      user.id,
      price,
      "Agency Subscription",
      ChargeTypes.SubaccountSubscription,
      true,
      null
    );

    if (charge && charge.status) {
      let historyCreated = await db.PaymentHistory.create({
        title: plan.title,
        description: `Payment for ${plan.title}`,
        type: ChargeTypes.SubaccountSubscription,
        price: planPrice,
        userId: user.id,
        environment: process.env.Environment,
        transactionId: charge.paymentIntent.id,
        planId: plan.id,
      });

      let planCreated = await db.PlanHistory.create({
        userId: user.id,
        type: ChargeTypes.SubaccountSubscription,
        price: planPrice,
        status: "active",
        environment: process.env.Environment,
        transactionId: charge.paymentIntent.id,
        planId: plan.id,
      });

      let monthsToAdd = 1;
      // if (plan.duration == "quarterly") {
      //   monthsToAdd = 3;
      // } else if (plan.duration == "yearly") {
      //   monthsToAdd = 12;
      // }

      user.totalSecondsAvailable += plan.minutes * 60;

      let dateAfter30Days = new Date();
      dateAfter30Days.setMonth(dateAfter30Days.getMonth() + monthsToAdd);
      user.nextChargeDate = dateAfter30Days;
      await user.save();

      console.log(
        "SubscribeFunc: Receiving user seconds Before ",
        user.totalSecondsAvailable
      );
      return {
        status: true,
        message: "Plan subscribed",
        plan: plan,
      };
    } else {
      return res.send({
        status: false,
        message: charge?.message || "Error charging user",
      });
    }
  } else {
    if (hasTrial) {
      //has trial
      let trialMin = plan.trialMinutes;
      let planCreated = await db.PlanHistory.create({
        userId: user.id,
        type: ChargeTypes.SubaccountSubscription,
        price: planPrice,
        status: "active",
        environment: process.env.Environment,
        transactionId: charge.paymentIntent.id,
        planId: plan.id,
      });
      let daysToAdd = plan.trialValidForDays;

      let dateAfter30Days = new Date();
      dateAfter30Days.setMonth(dateAfter30Days.getDay() + daysToAdd);
      user.nextChargeDate = dateAfter30Days;
      user.isTrial = true;
      user.totalSecondsAvailable = totalSecondsAvailable + trialMin * 60;
      await user.save();

      return res.send({
        status: true,
        message: "Plan subscribed",
        data: planCreated,
      });
    }
  }
}

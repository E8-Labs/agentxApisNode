import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
// import twilio from 'twilio';
import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
console.log(import.meta.url);

import UserProfileFullResource from "../resources/userProfileFullResource.js";
import { create } from "domain";
import PipelineCadenceResource from "../resources/PipelineCadenceResource.js";
import PipelineResource from "../resources/PipelineResource.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import AgentResource from "../resources/AgentResource.js";
import {
  AttachInfoExtractor,
  CreateAndAttachInfoExtractor,
  CreateInfoExtractor,
} from "./actionController.js";
import PipelineCadence from "../models/pipeline/pipelineCadence.js";
import { DeleteActionSynthflow } from "./synthflowController.js";
import BatchResource from "../resources/BatchResource.js";
import { BatchStatus } from "../models/pipeline/CadenceBatchModel.js";
import { pipeline } from "stream";
import PipelineStages from "../models/pipeline/pipelineStages.js";

import {
  addPaymentMethod,
  chargeUser,
  getPaymentMethods,
  RedeemGiftOnAbortPlanCancellation,
  SetDefaultCard,
} from "../utils/stripe.js";
import {
  PayAsYouGoPlans,
  PayAsYouGoPlanTypes,
} from "../models/user/payment/paymentPlans.js";
import { constants } from "../constants/constants.js";
import { generateFeedbackWithSenderDetails } from "../emails/FeedbackEmail.js";
import { SendEmail } from "../services/MailService.js";
// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const GetTitleForPlan = (plan) => {
  return plan.duration / 60 + " Mins Purchased";
};

export const AddPaymentMethod = async (req, res) => {
  let { source, inviteCode } = req.body; // mainAgentId is the mainAgent id
  console.log("Source is ", source);
  if (!source) {
    return res.send({
      status: false,
      message: "Missing required parameter: source",
      data: null,
    });
  }
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      try {
        let added = await addPaymentMethod(user, source);

        if (inviteCode && user.inviteCodeUsed == null) {
          user.inviteCodeUsed = inviteCode;
          await user.save();
        }
        return res.send({
          status: added.status,
          message: added.status ? "Payment method added" : added.error,
          data: added.data,
        });
      } catch (error) {
        console.log("Error ", error);
        return res.send({
          status: false,
          message: error.message,
          data: null,
        });
      }
    } else {
      return res.send({
        status: false,
        message: "Error adding card",
        data: null,
      });
    }
  });
};
export const GetPaymentmethods = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let added = await getPaymentMethods(user.id);
      return res.send({
        status: true,
        message: "Payment methods",
        data: added.data,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
        data: null,
      });
    }
  });
};

export const SetDefaultPaymentmethod = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let paymentMethodId = req.body.paymentMethodId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let added = await SetDefaultCard(paymentMethodId, user.id);
      return res.send({
        status: added.status,
        message: added.status
          ? "Payment method set as default"
          : "Payment method could not be set as default",
        data: added,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
        data: null,
      });
    }
  });
};

export const SubscribePayasyougoPlan = async (req, res) => {
  let { plan } = req.body; // mainAgentId is the mainAgent id
  let payNow = req.body.payNow || false; //if true, user pays regardless he has minutes or trial
  console.log("Plan is ", plan);
  if (!plan) {
    return res.send({
      status: false,
      message: "Missing required parameter: plan",
      data: null,
    });
  }
  let foundPlan = null;
  console.log(PayAsYouGoPlans);
  PayAsYouGoPlans.map((p) => {
    if (p.type == plan) {
      foundPlan = p;
    }
  });
  if (!foundPlan) {
    return res.status(404).send({
      status: false,
      message: "No such plan " + plan,
      data: null,
    });
  }
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let history = await db.PlanHistory.findAll({
        where: {
          userId: user.id,
          environment: process.env.Environment,
        },
        order: [["createdAt", "DESC"]],
      });
      let firstTime = true;
      if (history && history.length > 0) {
        firstTime = false;
      }

      try {
        if (
          firstTime &&
          foundPlan.type == PayAsYouGoPlanTypes.Plan30Min &&
          !payNow
        ) {
          // give 30 min free
          let TotalSeconds = foundPlan.duration;
          user.totalSecondsAvailable += TotalSeconds;
          let saved = await user.save();

          let planHistory = await db.PlanHistory.create({
            userId: user.id,
            type: foundPlan.type,
            price: foundPlan.price,
            status: "active",
            environment: process.env.Environment,
          });

          //set user trial mode
          user.isTrial = true;
          await user.save();

          return res.send({
            status: true,
            message: "Successfully subscribed to plan",
            data: null,
          });
        } else {
          let lastPlan = null;
          if (history && history.length > 0) {
            lastPlan = history[0];
          }
          if (lastPlan) {
            // console.log("Found plan 229");
            // if (
            //   lastPlan.type == foundPlan.type &&
            //   lastPlan.status == "active" && !payNow
            // ) {
            //   console.log("Same plan");
            //   return res.send({
            //     status: false,
            //     message: "Already subscribed to to this plan",
            //     data: null,
            //   });
            // }
            console.log("Update Plan");
            await db.PlanHistory.update(
              { status: "cancelled" },
              { where: { userId: user.id } }
            ); //set all previous plans as cancelled
            let planHistory = await db.PlanHistory.create({
              userId: user.id,
              type: foundPlan.type,
              price: foundPlan.price,
              status: "active",
              environment: process.env.Environment,
            });
            console.log(
              `User ${user.name} has ${user.totalSecondsAvailable} seconds`
            );
            //if either the minutes are low or the user selects to pay now
            if (
              user.totalSecondsAvailable < constants.MinThresholdSeconds ||
              payNow
            ) {
              //charge user
              console.log(
                "Charging user as the minutes available is less than min threshold"
              );
              let price = foundPlan.price * 100; //cents
              let charge = await chargeUser(
                user.id,
                price,
                "Charging for plan " + foundPlan.type,
                foundPlan.type
              );
              user = await db.User.findByPk(user.id);
              if (charge && charge.status) {
                let historyCreated = await db.PaymentHistory.create({
                  title: GetTitleForPlan(foundPlan),
                  description: `Payment for ${foundPlan.type}`,
                  type: foundPlan.type,
                  price: foundPlan.price,
                  userId: user.id,
                  environment: process.env.Environment,
                  transactionId: charge.paymentIntent.id,
                });

                console.log(
                  "SubscribeFunc: Receiving user seconds Before ",
                  user.totalSecondsAvailable
                );
                user.totalSecondsAvailable += foundPlan.duration;
                await user.save();
                console.log(
                  "Plan subscribed and aadded 297",
                  foundPlan.duration
                );
                console.log(
                  "SubscribeFunc: Receiving user seconds After ",
                  user.totalSecondsAvailable
                );
                return res.send({
                  status: true,
                  message: "Plan Upgraded",
                  data: historyCreated,
                });
              } else {
                console.log("Charge is ", charge);
                return res.send({
                  status: false,
                  message: "Error upgrading ",
                  data: null,
                });
              }
            } else {
              console.log("Not charging users");
              return res.send({
                status: true,
                message: "Plan Upgraded",
                data: null,
              });
            }
          }

          let price = foundPlan.price * 100; //cents
          let charge = await chargeUser(
            user.id,
            price,
            "Charging for plan " + foundPlan.type,
            foundPlan.type
          );
          user = await db.User.findByPk(user.id);
          if (charge && charge.status) {
            if (history.length > 0) {
              if (lastPlan.type != foundPlan.type) {
                //user updated his plan
                await db.PlanHistory.update(
                  {
                    status: "cancelled",
                  },
                  {
                    where: {
                      userId: user.id,
                    },
                  }
                );
                let planHistory = await db.PlanHistory.create({
                  userId: user.id,
                  type: foundPlan.type,
                  price: foundPlan.price,
                  status: "active",
                  environment: process.env.Environment,
                  transactionId: charge.paymentIntent.id,
                });
              }
            } else {
              let planHistory = await db.PlanHistory.create({
                userId: user.id,
                type: foundPlan.type,
                price: foundPlan.price,
                status: "active",
                environment: process.env.Environment,
              });
            }
            let TotalSeconds = foundPlan.duration;
            user.totalSecondsAvailable += TotalSeconds;
            console.log("Plan subscribed and aadded 362 ", TotalSeconds);
            let saved = await user.save();
            let historyCreated = await db.PaymentHistory.create({
              title: GetTitleForPlan(foundPlan),
              description: `Payment for ${foundPlan.type}`,
              type: foundPlan.type,
              price: foundPlan.price,
              userId: user.id,
              environment: process.env.Environment,
            });

            return res.send({
              status: true,
              message: "Plan subscribed " + foundPlan.type,
              data: historyCreated,
            });
          }
          return res.send({
            status: false,
            message: "Some error occurred ",
            data: null,
          });
        }
      } catch (error) {
        console.log(error);
        return res.send({
          status: false,
          message: "Plan creation failed",
          data: null,
          error: error,
        });
      }
    } else {
      return res.send({
        status: false,
        message: "Plan creation failed",
        data: null,
        // error: error,
      });
    }
  });
};

export const CancelPlan = async (req, res) => {
  // console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  // const { phone } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        let userId = authData.user.id;
        let user = await db.User.findByPk(userId);
        let plan = await db.PlanHistory.findOne({
          where: {
            userId: user.id,
            status: "active",
          },
        });

        plan.status = "cancelled";
        await plan.save();

        //If On Trial, Cancel Deduct The Trial Minutes
        if (user.isTrial) {
          user.isTrial = false;
          user.totalSecondsAvailable -= user.totalSecondsAvailable;
          await user.save();
        }

        //delete the numbe form our database

        // Format the response
        let useRes = await UserProfileFullResource(user);
        res.send({
          status: true,
          message: "Plan cancelled",
          data: useRes,
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: "Error cancelling plan",
          error: error.message,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated User",
        data: null,
      });
    }
  });
};

export const AddCancelPlanReason = async (req, res) => {
  // console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  const { reason } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        let userId = authData.user.id;
        let user = await db.User.findByPk(userId);
        let plan = await db.PlanHistory.findOne({
          where: {
            userId: user.id,
          },
          order: [["createdAt", "DESC"]],
        });

        plan.cancelReason = reason;
        await plan.save();

        let emailNot = generateFeedbackWithSenderDetails(
          "Cancelled Feedback",
          reason,
          user.name,
          user.email,
          user.phone,
          user.thumb_profile_image
        );
        let sent = await SendEmail(
          process.env.FeedbackEmail,
          emailNot.subject,
          emailNot.html
        );

        let useRes = await UserProfileFullResource(user);
        res.send({
          status: true,
          message: "Plan cancelled",
          data: useRes,
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: "Error adding reason",
          error: error.message,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated User",
        data: null,
      });
    }
  });
};

export const RedeemAbortCancellationReward = async (req, res) => {
  // console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  // const { phone } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        let userId = authData.user.id;
        let user = await db.User.findByPk(userId);
        let plan = await db.PlanHistory.findOne({
          where: {
            userId: user.id,
            status: "active",
          },
        });

        await RedeemGiftOnAbortPlanCancellation(user);

        // Format the response
        let useRes = await UserProfileFullResource(user);
        res.send({
          status: true,
          message: "Reward on plan abort cancellation redeemed",
          data: useRes,
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: "Error redeeming reward",
          error: error.message,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated User",
        data: null,
      });
    }
  });
};

export async function ReChargeUserAccount(user) {
  console.log("Charge user here ", user.id);
  console.log("Total Seconds less than ", 120);

  let lastPlan = await db.PlanHistory.findOne({
    where: { userId: user.id, status: "active" },
    ordre: [["createdAt", "DESC"]],
  });

  if (lastPlan) {
    console.log("There is a last plan");
    let foundPlan = null;
    console.log(PayAsYouGoPlans);
    PayAsYouGoPlans.map((p) => {
      if (p.type == lastPlan.type) {
        foundPlan = p;
      }
    });

    let price = foundPlan.price * 100; //cents
    let charge = await chargeUser(
      user.id,
      price,
      "Charging for plan " + foundPlan.type,
      foundPlan.type
    );
    user = await db.User.findByPk(user.id);
    console.log("Charge ", charge);
    if (charge && charge.status) {
      console.log("Charged for plan ", foundPlan);
      let historyCreated = await db.PaymentHistory.create({
        title: GetTitleForPlan(foundPlan), //`Payment for ${foundPlan.type}`,
        description: `Payment for ${foundPlan.type}`,
        type: foundPlan.type,
        price: foundPlan.price,
        userId: user.id,
        environment: process.env.Environment,
        transactionId: charge.paymentIntent.id,
      });
      user.totalSecondsAvailable += foundPlan.duration;
      await user.save();
      return charge;
    }
    return null;
  } else {
    RemoveTrialMinutesIf7DaysPassedAndNotCharged(user);
    console.log("There is no plan");
    return null;
  }
}

export async function RemoveTrialMinutesIf7DaysPassedAndNotCharged(user) {
  let u = user;

  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }

  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.LastChanceToAct;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  //If 7 days have passed
  console.log("Checking If Trial have passed", user.id);
  if (timeDifference > 7 * 24 * 60 * 60 * 1000) {
    console.log("Yes  Trial have passed", u.id);
    console.log("More than 7 days have passed and still on trial");
    user.isTrial = false;
    let seconds = user.totalAvailableSeconds;
    user.totalAvailableSeconds -= seconds;
    await user.save();

    return;
  } else {
    console.log("No  Trial have not passed", u.id);
  }
}

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
  CreateSetupIntent,
  getPaymentMethods,
  getStripeClient,
  getStripeCustomerId,
  RedeemGiftOnAbortPlanCancellation,
  SetDefaultCard,
} from "../utils/stripe.js";
import {
  ChargeTypes,
  FindPlanWithMinutes,
  FindPlanWithPrice,
  FindPlanWithtype,
  findSupportPlan,
  PayAsYouGoPlans,
  PayAsYouGoPlanTypes,
} from "../models/user/payment/paymentPlans.js";
import { constants } from "../constants/constants.js";
import { generateFeedbackWithSenderDetails } from "../emails/FeedbackEmail.js";
import { SendEmail } from "../services/MailService.js";
import { UpdateOrCreateUserInGhl } from "./GHLController.js";
import {
  detectDevice,
  GetTeamAdminFor,
  GetTrialStartDate,
  IsTrialActive,
} from "../utils/auth.js";
import { generateDesktopEmail } from "../emails/general/DesktopEmail.js";
import { UserRole, UserTypes } from "../models/user/userModel.js";
import {
  trackAddPaymentInfo,
  trackStartTrialEvent,
} from "../services/facebookConversionsApi.js";
import {
  DeleteAllNumbersForUser,
  MarkAllNumbersToDeleteAtPeriodEndForUser,
} from "./twilioController.js";
// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const GetTitleForPlan = (plan) => {
  return plan.duration / 60 + " Mins Purchased";
};

export const SetupPaymentIntent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      if (req.query.userId) {
        userId = req.query.userId;
      }
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);
      user = admin;

      let paymentIntent = await CreateSetupIntent(user);
      if (paymentIntent.status) {
        return res.send({
          status: true,
          data: paymentIntent.data,
          message: "Intent created",
        });
      } else {
        return res.send({
          status: false,
          data: null,
          message: "Intent not created",
        });
      }
    }
  });
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
      let admin = await GetTeamAdminFor(user);
      user = admin;

      try {
        // let added = await addPaymentMethod(user, source);
        // console.log("Added", added);
        try {
          const stripe = getStripeClient();
          let customerId = await getStripeCustomerId(user.id);
          let attached = await stripe.paymentMethods.attach(source, {
            customer: customerId,
          });
          if (inviteCode && user.inviteCodeUsed == null) {
            user.inviteCodeUsed = inviteCode;
            await user.save();
          }
          await trackAddPaymentInfo(
            { status: true, data: source },
            user.get(),
            req,
            "ai.myagentx.com",
            "website"
          );
          await db.User.update(
            { lastPaymentMethodAddedAt: new Date() },
            { where: { id: user.id } }
          );

          // Set as default if needed
          // await stripe.customers.update(customerId, {
          //   invoice_settings: {
          //     default_payment_method: source,
          //   },
          // });
          await db.PaymentMethod.create({
            paymentMethodId: source,
            userId: user.id,
            status: "Active",
            environment: process.env.Environment,
          });

          // const paymentIntent = await stripe.paymentIntents.create({
          //   amount: 100, // $1
          //   currency: "usd",
          //   customer: customerId,
          //   payment_method: source,
          //   confirm: true,
          //   setup_future_usage: "off_session",
          //   automatic_payment_methods: {
          //     enabled: true,
          //     allow_redirects: "never",
          //   },
          // });
          // await stripe.paymentIntents.cancel(paymentIntent.id);

          return res.json({
            status: true,
            message: "Card saved successfully.",
          });
        } catch (error) {
          console.error("Saving card failed:", error.message);
          return res
            .status(400)
            .json({ status: false, message: error.message });
        }
        // if (added.status) {
        //   await db.PaymentMethod.create({
        //     paymentMethodId: added.data.id,
        //     userId: user.id,
        //     status: "Active",
        //     environment: process.env.Environment,
        //   });
        // }

        if (inviteCode && user.inviteCodeUsed == null) {
          user.inviteCodeUsed = inviteCode;
          await user.save();
        }
        // await trackAddPaymentInfo(
        //   added.data,
        //   user.get(),
        //   req,
        //   "ai.myagentx.com",
        //   "website"
        // );
        await db.User.update(
          { lastPaymentMethodAddedAt: new Date() },
          { where: { id: user.id } }
        );
        return res.send({
          status: true,
          message: "Payment method added",
          data: source,
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
export const AddPaymentMethodOld = async (req, res) => {
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
      let admin = await GetTeamAdminFor(user);
      user = admin;

      try {
        let added = await addPaymentMethod(user, source);
        console.log("Added", added);
        if (added.status) {
          await db.PaymentMethod.create({
            paymentMethodId: added.data.id,
            userId: user.id,
            status: "Active",
            environment: process.env.Environment,
          });
        }

        if (inviteCode && user.inviteCodeUsed == null) {
          user.inviteCodeUsed = inviteCode;
          await user.save();
        }
        await trackAddPaymentInfo(
          added.data,
          user.get(),
          req,
          "ai.myagentx.com",
          "website"
        );
        await db.User.update(
          { lastPaymentMethodAddedAt: new Date() },
          { where: { id: user.id } }
        );
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
      if (req.query.userId) {
        userId = req.query.userId;
      }
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);
      user = admin;

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
export const GetPaymentmethodsAllUsers = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);
      user = admin;

      let users = await db.User.findAll({
        where: {
          userRole: UserRole.AgentX,
        },
      });
      let paymentMethods = {};
      for (let i = 0; i < users.length; i++) {
        let added = await getPaymentMethods(users[i].id);
        paymentMethods[i] = added;
      }

      return res.send({
        status: true,
        message: "Payment methods",
        data: paymentMethods,
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
      console.log("Payment method to set default ", req.body);
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let admin = await GetTeamAdminFor(user);
      user = admin;
      let added = await SetDefaultCard(paymentMethodId, admin.id);
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

export async function PurchaseSupportPlan(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let admin = await GetTeamAdminFor(user);
      user = admin;

      let supportPlanType = req.body.supportPlan;
      let foundSupportPlan = findSupportPlan(supportPlanType);
      if (!foundSupportPlan) {
        return res.send({
          status: false,
          message: "Support plan not found",

          data: null,
        });
      }
      // chargeUser();
      let charge = await chargeUser(
        user.id,
        foundSupportPlan.price * 100,
        `Purchase of support plan ${foundSupportPlan.type}`,
        ChargeTypes.SupportPlan,
        false,
        req
      );
      if (charge && charge.status) {
        user.totalSecondsAvailable += foundSupportPlan.minutes * 60;
        let historyCreated = await db.PaymentHistory.create({
          title: `Support plan ${foundSupportPlan.type}`,
          description: `Payment for ${foundSupportPlan.type} Support Plan`,
          type: ChargeTypes.SupportPlan,
          price: foundSupportPlan.price,
          userId: user.id,
          environment: process.env.Environment,
          transactionId: charge.paymentIntent.id,
        });

        console.log("Purchase of support plan ", foundSupportPlan.type);
        user.supportPlan = foundSupportPlan.type;
        await user.save();
        return res.send({
          status: true,
          message: "Support plan purchased",
          data: await UserProfileFullResource(user),
        });
      } else {
        return res.send({
          status: false,
          message: "Support plan not purchase ",
          charge: charge,
          error: charge.message,
          data: await UserProfileFullResource(user),
        });
      }
    }
  });
}

export const SubscribePayasyougoPlan = async (req, res) => {
  const isMobile = detectDevice(req);
  let { plan } = req.body; // mainAgentId is the mainAgent id
  let payNow = req.body.payNow || false; //if true, user pays regardless he has minutes or trial
  let updateFuturePlan = req.body.updateFuturePlan || false; // If true then only set the plan and do nothing
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
  console.log("Found plan", foundPlan);
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      console.log("User role ", user.userRole);
      if (user.userType) {
        if (user.userType.toLowerCase() == UserTypes.Admin.toLowerCase()) {
          userId = req.body.userId;
          console.log("This is admin Subscribing for user", userId);
          user = await db.User.findOne({
            where: {
              id: userId,
            },
          });
        }
      }

      let admin = await GetTeamAdminFor(user);
      user = admin;

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
      let dateAfter30Days = new Date();
      dateAfter30Days.setMonth(dateAfter30Days.getMonth() + 1);

      if (firstTime) {
        //send the email
        if (isMobile) {
          //Generate Desktop Email
          console.log("User id ", user.id);
          console.log("Checking user type for email", user.userType);
          // if (user.userType != UserTypes.RealEstateAgent) {
          let emailTemp = generateDesktopEmail();
          let sent = await SendEmail(
            user.email,
            emailTemp.subject,
            emailTemp.html
          );
          // }
        }
        await trackStartTrialEvent(
          {
            plan: foundPlan.type,
            price: foundPlan.price,
            duration: foundPlan.duration / 60,
          },
          user.get(),
          req,
          "ai.myagentx.com",
          "website"
        );
      }
      try {
        if (updateFuturePlan) {
          console.log("Updating future plan");
          await db.PlanHistory.update(
            { status: "upgraded" },
            {
              where: {
                userId: user.id,
                status: "active",
              },
            }
          );
          let historyCreated = await db.PlanHistory.create({
            userId: user.id,
            type: foundPlan.type,
            environment: process.env.Environment,
            price: foundPlan.price,
          });
          console.log("Sending back response");

          return res.send({
            status: true,
            message: "Plan has changed successfully",
            data: historyCreated,
          });
        } else if (
          firstTime &&
          foundPlan.type == PayAsYouGoPlanTypes.Plan30Min
        ) {
          // give 30 min free for 7 days and set the subscription date to

          let dateAfter7Days = new Date();
          dateAfter7Days.setDate(dateAfter7Days.getDate() + 7);
          await UpdateUserSubscriptionStartDate(
            user,
            dateAfter7Days,
            dateAfter7Days
          );
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
          UpdateOrCreateUserInGhl(user);
          // if (isMobile) {
          //   //Generate Desktop Email
          //   if (user.userType != UserTypes.RealEstateAgent) {
          //     let emailTemp = generateDesktopEmail();
          //     let sent = await SendEmail(
          //       user.email,
          //       emailTemp.subject,
          //       emailTemp.html
          //     );
          //   }
          // }
          return res.send({
            status: true,
            message: "Successfully subscribed to plan",
            data: null,
          });
        } else {
          console.log("Not first time || First time but not plan 30");

          let lastPlan = null;
          if (history && history.length > 0) {
            lastPlan = history[0];
          }
          if (lastPlan) {
            let lastPlanFound = FindPlanWithtype(lastPlan.type);
            console.log("There is a last plan");
            //if the duration of the new plan is greater then it is upgrade
            let upgrade = foundPlan.duration > lastPlanFound.duration;
            console.log("Is user upgrading ", upgrade);
            if (user.isTrial) {
              //If user upgrades or downgrades while on trial then charge immediately and set the sub date to current date
              user.subscriptionStartDate = new Date();
              user.nextChargeDate = dateAfter30Days; // set the next charge date to be 30 days later
              await user.save();
              payNow = true;
              //let the flow run and the user be charged for this plan below
            } else {
              //If user is not on trial
              if (upgrade && lastPlan.status == "active") {
                console.log("Upgrade and active");
                //If user upgrades while on an active plan
                //Charge immediately so let the flow run below
                //Don't change the subscription date if not null
                payNow = true;
                user.nextChargeDate = dateAfter30Days;
                if (user.subscriptionStartDate == null) {
                  user.subscriptionStartDate = new Date();

                  await user.save();
                }
              } else if (!upgrade && lastPlan.status == "active") {
                console.log("Downgrade and active");
                //Subscription price don't change. It is same as the old
                if (user.subscriptionStartDate == null) {
                  user.subscriptionStartDate = new Date();
                  user.nextChargeDate = new Date();
                  await user.save();
                }

                //if downgrade and user have minutes available
                if (
                  user.totalSecondsAvailable > constants.MinThresholdSeconds
                ) {
                  //Dont charge user immediately
                  await db.PlanHistory.update(
                    { status: "upgraded" },
                    { where: { userId: user.id, status: "active" } }
                  ); //set all previous planas cancelled
                  let planHistory = await db.PlanHistory.create({
                    userId: user.id,
                    type: foundPlan.type,
                    price: foundPlan.price,
                    status: "active",
                    environment: process.env.Environment,
                  });
                  return res.send({
                    status: true,
                    message: "Plan updated",
                    planHistory,
                  });
                } else {
                  payNow = true;
                }
              }
              //If user comes back from cancelled subscription
              else if (lastPlan.status == "cancelled") {
                console.log("cancelled");
                //If last plan is cancelled.
                payNow = true; //payNow should be true
                user.subscriptionStartDate = new Date();
                user.nextChargeDate = dateAfter30Days;
                await user.save();
                //let the user be charged and continue the flow
              }
            }

            console.log("Update Plan", payNow);
            await db.PlanHistory.update(
              { status: "upgraded" },
              { where: { userId: user.id, status: "active" } }
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
                "Subscription renewed for " + foundPlan.type,
                foundPlan.type,
                false,
                req
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
                UpdateOrCreateUserInGhl(user);
                return res.send({
                  status: true,
                  message: "Plan Upgraded",
                  data: historyCreated,
                });
              } else {
                console.log("Charge failed ", charge);
                return res.send({
                  status: false,
                  message: charge?.message || "Error upgrading ",
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
          } else {
            // No last plan so first time user and it is selecting a plan other than 30 min
            payNow = true;
            user.subscriptionStartDate = new Date();
            user.nextChargeDate = dateAfter30Days;
            await user.save();
          }

          //User directly purchased a plan that is not 30 minutes
          let price = foundPlan.price * 100; //cents
          let charge = await chargeUser(
            user.id,
            price,
            "Subscription activated for " + foundPlan.type,
            foundPlan.type,
            false,
            req
          );
          let dateNow = new Date();
          // dateAfter7Days.setDate(date7DaysAgo.getDate() + 7);
          // await UpdateUserSubscriptionStartDate(user, dateNow);
          user = await db.User.findByPk(user.id);
          if (charge && charge.status) {
            if (history.length > 0) {
              // This  will never be true. Will remove in future
              if (lastPlan.type != foundPlan.type) {
                //user updated his plan
                await db.PlanHistory.update(
                  {
                    status: "upgraded",
                  },
                  {
                    where: {
                      userId: user.id,
                      status: "active",
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
            UpdateOrCreateUserInGhl(user);
            //set the user phone numbers to not cancel at period end
            await db.UserPhoneNumbers.update(
              { cancelAtPeriodEnd: false },
              {
                where: {
                  userId: user.id, // replace this with actual userId
                  nextBillingDate: {
                    [Op.gt]: new Date(), // only future billing dates
                  },
                },
              }
            );
            return res.send({
              status: true,
              message: "Plan subscribed " + foundPlan.type,
              data: historyCreated,
            });
          }

          return res.send({
            status: false,
            message: charge?.message || "Some error occurred ",
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

export async function UpdateUserSubscriptionStartDate(
  user,
  date,
  nextChargeDate
) {
  user.subscriptionStartDate = date;
  user.nextChargeDate = nextChargeDate;
  await user.save();
}

export const CancelPlan = async (req, res) => {
  // console.log("ACCOUNT SSID ", process.env.TWILIO_ACCOUNT_SID);
  // const { phone } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        let userId = authData.user.id;
        let user = await db.User.findByPk(userId);
        let admin = await GetTeamAdminFor(user);
        user = admin;
        let plan = await db.PlanHistory.findOne({
          where: {
            userId: user.id,
            status: "active",
          },
        });
        if (plan) {
        } else {
          return res.send({
            status: true,
            message: "Subscription already cancelled",
            data: null,
          });
        }

        plan.status = "cancelled";
        await plan.save();
        await MarkAllNumbersToDeleteAtPeriodEndForUser(user);
        // await DeleteAllNumbersForUser(user);

        //If On Trial, Cancel Deduct The Trial Minutes
        if (user.isTrial) {
          user.isTrial = false;
          user.totalSecondsAvailable -= user.totalSecondsAvailable;
          await user.save();
        }

        //delete the numbe form our database

        // Format the response
        UpdateOrCreateUserInGhl(user);
        user.nextChargeDate = null;
        await user.save();
        // await UpdateUserSubscriptionStartDate(user, null, null);
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

        if (plan) {
          plan.cancelReason = reason;
          await plan.save();
        }

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
  // console.log("Charge user here ", user.id);
  // console.log("Total Seconds less than ", user.totalSecondsAvailable);

  let lastPlan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
      status: "active",
      environment: process.env.Environment,
    },
    ordre: [["createdAt", "DESC"]],
  });
  // console.log("Plan ", lastPlan);
  let now = new Date(); // Current time
  let trialStartDate = await GetTrialStartDate(user);
  let createdAt = new Date(trialStartDate);
  let timeDifference = now - createdAt;

  //Check the plan reach date
  let nextChargeDate = new Date(user.nextChargeDate);
  // console.log("Next charge date", user.nextChargeDate);
  // console.log("Current date", now);

  let isTrialActive = await IsTrialActive(user);
  let lastFailedPayment = await db.PaymentMethodFails.findOne({
    where: {
      userId: user.id,
      data: {
        [db.Sequelize.Op.like]: `%"status":false%`,
      },
    },
    order: [["createdAt", "DESC"]],
  });

  let lastPaymentMethodAdded = await db.PaymentMethod.findOne({
    where: {
      userId: user.id,
    },
    order: [["createdAt", "DESC"]],
  });

  let paymentAddedAfterFailure = false;

  if (!lastFailedPayment) {
    //there is no last failed payment
    console.log("No last failed payment", user.id);
    paymentAddedAfterFailure = true;
  } else if (lastFailedPayment && lastPaymentMethodAdded) {
    console.log("User has payment methods", user.id);
    if (
      new Date(lastFailedPayment.createdAt) <
      new Date(lastPaymentMethodAdded.createdAt)
    ) {
      // User has added a new payment method after failure, retry immediately.
      console.log("New pm added after failure so retry", user.id);
      paymentAddedAfterFailure = true;
    } else {
      //Now we will first check how many failed attempts have been made after the last payment method added.
      //If more than 1 attempts are made then we will not make any further attempt for this user
      let failedAttemptsAfterLastPaymentAdded =
        await db.PaymentMethodFails.findAll({
          where: {
            userId: user.id,
            createdAt: {
              [db.Sequelize.Op.gt]: new Date(lastPaymentMethodAdded.createdAt),
            },
            data: {
              [db.Sequelize.Op.like]: `%"status":false%`,
            },
          },
        });
      if (
        failedAttemptsAfterLastPaymentAdded &&
        failedAttemptsAfterLastPaymentAdded.length >= 2
      ) {
        console.log("User have made more than 2 failed attempts", user.id);
        paymentAddedAfterFailure = false;
      } else if (lastFailedPayment) {
        // Check if 24 hours have passed since the last failed payment
        console.log("check 24 hours passed after failure", user.id);
        const failedTime = new Date(lastFailedPayment.createdAt);
        const currentTime = new Date();
        const hoursPassed = (currentTime - failedTime) / (1000 * 60 * 60); // Convert ms to hours
        console.log("Hours passed ", hoursPassed);
        console.log(
          `${lastFailedPayment.userId} Failed Date ${lastFailedPayment.createdAt} ${lastFailedPayment.id}`
        );
        if (hoursPassed >= 24) {
          console.log("Yes passed");
          // 24 hours have passed, so mark as true to retry charge
          paymentAddedAfterFailure = true;
        }
      }
    }
  }

  if (!paymentAddedAfterFailure) {
    console.log("No chargeable payment method found", user.id);
    return;
  }

  if (nextChargeDate < now) {
    console.log("User ", user.id);
    console.log("Next Charged is less", user.nextChargeDate);
    //charge date has reached
    // console.log("Subscription charge date has reached");
    if (lastPlan && lastPlan.status == "active") {
      console.log("Charging user next chargedate < now and lastplan active");
      let foundPlan = FindPlanWithtype(lastPlan.type);
      // return;
      let charge = await chargeUser(
        user.id,
        foundPlan.price * 100,
        `Subscription renewed for ${foundPlan.type}`,
        foundPlan.type,
        true
      );
      // console.log("Charge ", charge);
      if (charge.status) {
        let historyCreated = await db.PaymentHistory.create({
          title: `${foundPlan.duration / 60} Min subscription renewed`,
          description: `${foundPlan.duration / 60} Min subscription renewed`,
          type: foundPlan.type,
          price: foundPlan.price,
          userId: user.id,
          environment: process.env.Environment,
          transactionId: charge.paymentIntent.id,
        });
        let dateAfter30Days = new Date();
        dateAfter30Days.setMonth(dateAfter30Days.getMonth() + 1);
        user.nextChargeDate = dateAfter30Days;
        // console.log(
        //   "SubscribeFunc: Receiving user seconds Before ",
        //   user.totalSecondsAvailable
        // );
        user.totalSecondsAvailable += foundPlan.duration;
        await user.save();
        UpdateOrCreateUserInGhl(user);
      }
    } else {
      // console.log("Last plan", lastPlan);
      console.log("User's plan is not active", user.id);
    }
  } else if (
    lastPlan &&
    (user.totalSecondsAvailable <= constants.MinThresholdSeconds ||
      (user.isTrial && timeDifference > 7 * 24 * 60 * 60 * 1000))
  ) {
    console.log(
      "user have an active plan and has less than 120 sec: So charge him",
      user.isTrial
    );
    // return;
    // console.log("There is a last plan", user.id);
    let foundPlan = null;
    // console.log(PayAsYouGoPlans);
    PayAsYouGoPlans.map((p) => {
      if (p.type == lastPlan.type) {
        foundPlan = p;
      }
    });
    // console.log("Found plan for ", user.id);
    // console.log(foundPlan);

    let price = foundPlan.price * 100; //cents
    let charge = await chargeUser(
      user.id,
      price,
      foundPlan.duration / 60 + " minutes renewed",
      foundPlan.type
    );
    // user = await db.User.findByPk(user.id);
    // console.log("Charge ", charge);
    if (charge && charge.status) {
      // console.log("Charged for plan ", foundPlan);
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
      console.log("User ", user.id);
      console.log("Charged for trial over", user.isTrial);
      if (user.isTrial) {
        let dateAfter30Days = new Date();
        dateAfter30Days.setMonth(dateAfter30Days.getMonth() + 1);
        user.nextChargeDate = dateAfter30Days;
        user.isTrial = false;
      }

      await user.save();
      UpdateOrCreateUserInGhl(user);
      return charge;
    } else {
      //Failed payment method
      console.log("User ", user.id);
      console.log("Charged for trial over failed", user.isTrial);
      if (user.isTrial) {
        let dateAfter30Days = new Date();
        dateAfter30Days.setMonth(dateAfter30Days.getMonth() + 1);
        user.nextChargeDate = dateAfter30Days;
        user.isTrial = false;
        // user.totalSecondsAvailable = 0;
      }
      await user.save();
      UpdateOrCreateUserInGhl(user);
    }
    return null;
  } else {
    console.log("Nothing to charge", user.id);
    console.log(
      "So Check try to remove his free minutes from trial if 7 days have passed"
    );
    // return;
    await RemoveTrialMinutesIf7DaysPassedAndNotCharged(user);

    return null;
  }
}

export async function RemoveTrialMinutesIf7DaysPassedAndNotCharged(user) {
  let u = user;

  if (!user.isTrial) {
    // console.log("User is not on trial ", user.id);
    return;
  }

  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let trialStartDate = await GetTrialStartDate(user);
  let createdAt = new Date(trialStartDate);
  let timeDifference = now - createdAt;

  //If 7 days have passed
  // console.log("Checking If Trial have passed", user.id);
  if (timeDifference > 7 * 24 * 60 * 60 * 1000) {
    console.log("Yes  Trial have passed", u.id);
    console.log("More than 7 days have passed and still on trial");
    user.isTrial = false;
    let seconds = user.totalSecondsAvailable;
    // let secondsToRe
    user.totalSecondsAvailable -= seconds;
    await user.save();

    return;
  } else {
    // console.log("No  Trial have not passed", u.id);
  }
}
//Cron
export async function RechargeFunction() {
  console.log("Cron Cancel plan or rechrage");
  // Correctly subtract 7 days from the current date
  let users = await db.User.findAll({
    where: {
      userRole: "AgentX",
      // id: 171,
    },
  });
  // console.log("Total users ", users.length);
  // return;
  if (users && users.length > 0) {
    for (const u of users) {
      try {
        // console.log("------------------------------------------\n\n");
        await ReChargeUserAccount(u);
        // console.log("\n\n------------------------------------------\n");
      } catch (error) {
        console.log(error);
        console.log("error rechargign or cancelling trial");
      }
    }
  }

  // ReChargeUserAccount
}

// RechargeFunction();

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
} from "../utils/stripe.js";
import {
  PayAsYouGoPlans,
  PayAsYouGoPlanTypes,
} from "../models/user/payment/paymentPlans.js";
// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const AddPaymentMethod = async (req, res) => {
  let { source } = req.body; // mainAgentId is the mainAgent id
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

      let added = await addPaymentMethod(user, source);
      return res.send({
        status: true,
        message: "Payment method added",
        data: added,
      });
    } else {
      return res.send({
        status: false,
        message: "Pipeline creation failed",
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
        message: "Pipeline creation failed",
        data: null,
      });
    }
  });
};

export const SubscribePayasyougoPlan = async (req, res) => {
  let { plan } = req.body; // mainAgentId is the mainAgent id
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
        },
        order: [["createdAt", "DESC"]],
      });
      let firstTime = false;
      if (history && history.length > 0) {
        firstTime = true;
      }

      try {
        if (firstTime && foundPlan.type == PayAsYouGoPlanTypes.Plan30Min) {
          // give 30 min free
          let TotalSeconds = foundPlan.duration;
          user.totalSecondsAvailable += TotalSeconds;
          let saved = await user.save();

          let planHistory = await db.PlanHistory.create({
            userId: user.id,
            type: foundPlan.type,
            price: foundPlan.price,
            status: "active",
          });

          return res.send({
            status: true,
            message: "Successfully subscribed to plan",
            data: null,
          });
        } else {
          let price = foundPlan.price * 100; //cents
          let charge = await chargeUser(
            user.id,
            price,
            "Charging for plan " + foundPlan.type
          );
          if (charge && charge.status) {
            if (history.length > 0) {
              let lastPlan = history[0];
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
                });
              }
            } else {
              let planHistory = await db.PlanHistory.create({
                userId: user.id,
                type: foundPlan.type,
                price: foundPlan.price,
                status: "active",
              });
            }
            let TotalSeconds = foundPlan.duration;
            user.totalSecondsAvailable += TotalSeconds;
            let saved = await user.save();
            let historyCreated = await db.PaymentHistory.create({
              title: `Payment for ${foundPlan.type}`,
              description: `Payment for ${foundPlan.type}`,
              type: foundPlan.type,
              price: foundPlan.price,
              userId: user.id,
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

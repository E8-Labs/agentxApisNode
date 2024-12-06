//Default data, settings, etc
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
import UserProfileFullResource from "../resources/userProfileFullResource.js";

import { OpenQuestionInfoExtractors } from "../config/defaultInfoExtractors.js";
import {
  CreateAndAttachInfoExtractor,
  CreateInfoExtractor,
} from "./actionController.js";

// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const LoadRegistrationData = async (req, res) => {
  let agentServices = await db.AgentService.findAll();
  let areaOfFocus = await db.AreaOfFocus.findAll();
  let defaultRoles = await db.AgentRole.findAll({
    where: {
      type: "system",
    },
  });
  return res.send({
    status: true,
    message: "List",
    data: { agentServices, areaOfFocus, defaultRoles },
  });
};

export const GenerateDefaultSellerBuyerKycIE = async (req, res) => {
  for (const kyc of OpenQuestionInfoExtractors) {
    let question = kyc.question;
    let identifier = kyc.identifier;
    let k = kyc;
    k.question = k.identifier;
    let action = await CreateInfoExtractor(kyc);
    if (action && action.status == "success") {
      let actionId = action.response.action_id;
      let createdDb = await db.InfoExtractorModel.create({
        data: JSON.stringify(kyc),
        actionId: actionId,
        actionType: "defaultIE",
        question: question,
        identifier: identifier,
        mainAgentId: null,
      });
    }
    console.log("Created ", action);
  }
  return res.send({
    status: true,
    message: "List",
    data: null,
  });
};

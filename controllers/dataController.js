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
import { AreaCodes } from "../utils/USAreaCodes.js";
import UserProfileFullResource from "../resources/userProfileFullResource.js";

import { OpenQuestionInfoExtractors } from "../config/defaultInfoExtractors.js";
import {
  CreateAndAttachInfoExtractor,
  CreateInfoExtractor,
} from "./actionController.js";
import { UserTypes } from "../models/user/userModel.js";

// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const LoadRegistrationData = async (req, res) => {
  let type = req.query.type || UserTypes.RealEstateAgent;
  let agentServices = await db.AgentService.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.is]: null,
      },
      agentType: type,
    },
  });
  let areaOfFocus = await db.AreaOfFocus.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.is]: null,
      },
      agentType: type,
    },
  });

  let userIndustry = await db.UserIndustry.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.is]: null,
      },
      agentType: type,
    },
  });
  let defaultRoles = await db.AgentRole.findAll({
    // where: {
    //   type: "system",
    // },
  });
  return res.send({
    status: true,
    message: "List",
    data: {
      agentServices,
      areaOfFocus,
      defaultRoles,
      userIndustry: userIndustry,
    },
  });
};

export const GenerateDefaultSellerBuyerKycIE = async (req, res) => {
  for (const kyc of OpenQuestionInfoExtractors) {
    let question = kyc.question;
    let identifier = kyc.identifier;
    let kycExists = await db.InfoExtractorModel.findOne({
      where: {
        identifier: identifier,
      },
    });
    if (kycExists) {
      continue;
    } else {
      console.log("IE has to be created", kyc.identifier);
      // continue;
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
  }
  return res.send({
    status: true,
    message: "List",
    data: null,
  });
};

const getAreaCode = (phoneNumber) => {
  const digits = phoneNumber.replace(/\D/g, ""); // Remove non-numeric chars
  const cleanNumber = digits.startsWith("1") ? digits.substring(1) : digits; // Remove leading "1"
  return cleanNumber.substring(0, 3); // Get first 3 digits as area code
};
export async function GetRandomAgents(req, res) {
  try {
    // Fetch latest 30 agents with a phone number
    const agents = await db.AgentModel.findAll({
      where: {
        phoneNumber: { [db.Sequelize.Op.ne]: "" }, // Exclude empty phone numbers
      },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["name"], // Get user's full name
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 150,
    });
    console.log("Agents ", agents.length);

    // Process data
    let formattedAgents = [];

    for (const agent of agents) {
      const agentName = agent.user?.name || "Unknown Agent";

      // Extract area code (first 3 digits of phone number)
      const phoneNumber = agent.phoneNumber.replace(/\D/g, ""); // Remove non-numeric chars
      const areaCode = getAreaCode(phoneNumber); //phoneNumber.substring(0, 3);

      // Match area code with AreaCodes list
      if (AreaCodes[areaCode]) {
        formattedAgents.push({
          Agent_Full_Name: agentName,
          City: AreaCodes[areaCode].city,
          State: AreaCodes[areaCode].state,
        });
      }
    }

    res.json({ status: true, data: formattedAgents, message: "Agents" });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ message: "Server error" });
  }
}

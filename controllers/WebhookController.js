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
// console.log(import.meta.url);

import UserProfileFullResource from "../resources/userProfileFullResource.js";

export const CreateWebhook = async (req, res) => {
  let url = req.body.url;
  let action = req.body.action;
  if (!url || !action) {
    return res.send({
      status: false,
      message: "Missing required parameters",
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
      console.log("User", user);

      let created = await db.WebhookModel.create({
        url: url,
        action: action,
        userId: user.id,
      });
      return res.send({
        status: true,
        message: "Webhook created",
        data: created,
      });
    } else {
      return res(401).send({
        status: false,
        message: "Unauthorized access",
      });
    }
  });
};

export const GetAllWebhooks = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      console.log("User", user);

      let hooks = await db.WebhookModel.findAll({
        where: {
          userId: user.id,
        },
      });
      return res.send({
        status: true,
        message: "Webhook list",
        data: hooks,
      });
    } else {
      return res(401).send({
        status: false,
        message: "Unauthorized access",
      });
    }
  });
};

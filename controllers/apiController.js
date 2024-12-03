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
import crypto from "crypto";

export const GenerateApiKey = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (!user) {
        res.send({
          status: false,
          message: "No such user",
        });
      }
      let key = generateApiKey();

      let saved = await db.ApiKeysModel.create({
        key: key,
        userId: user.id,
      });
      res.send({
        status: true,
        message: "Key generated",
        data: saved,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const GetMyApiKeys = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (!user) {
        res.send({
          status: false,
          message: "No such user",
        });
      }

      let keys = await db.ApiKeysModel.findAll({
        where: {
          userId: user.id,
        },
      });
      res.send({
        status: true,
        message: "Api Keys",
        data: keys,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex"); // Generates a 64-character hexadecimal string
}

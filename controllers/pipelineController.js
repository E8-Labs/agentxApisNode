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

// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const CreatePipeline = async (req, res) => {
  let { title } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let created = await db.Pipeline.create({
        title: title,
        userId: userId,
      });

      let stages = await db.Stages.findAll();
      for (let i = 0; i < stages.length; i++) {
        let st = stages[i];
        let createdStage = await db.PipelineStages.create({
          stageTitle: st.title,
          order: i + 1,
          defaultColor: st.defaultColor,
          stageId: st.id,
          pipelineId: created.id,
        });
      }

      return res.send({
        status: true,
        message: "Pipeline created",
        data: created,
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

export const CreatePipelineCadence = async (req, res) => {
  let { pipelineId, cadence, mainAgentId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      if (!pipelineId) {
        // //check If default pipeline
        // let pipeline = await db.Pipeline.findOne({
        //   where: {}
        // })

        let pipeline = await db.Pipeline.create({
          title: "Default Pipeline",
          userId: userId,
        });
        pipelineId = pipeline.id;
      }

      //   let assignedAgent = await db.PipelineAssignedAgent.create({
      //     mainAgentId: mainAgentId,
      //     pipelineId: pipelineId,
      //   });

      for (let i = 0; i < cadence.length; i++) {
        let cad = cadence[i];
        let calls = cad.calls;
        let cadStage = cad.stage; // for which stage do we apply this
        let moveToStage = cad.moveToStage;

        // let agentStageCreated = await db.AgentStages.create({
        //   stageId: cadStage,
        //   agentId: mainAgentId,
        //   pipelineId: pipelineId,
        // });

        let pipelineCadence = await db.PipelineCadence.create({
          stage: cadStage,
          pipelineId: pipelineId,
          moveToStage: moveToStage,
          mainAgentId: mainAgentId,
        });

        for (let j = 0; j < calls.length; j++) {
          let call = calls[j];
          let createdCall = await db.CadenceCalls.create({
            pipelineCadenceId: pipelineCadence.id,
            waitTimeMinutes: call.waitTimeMinutes,
            waitTimeHours: call.waitTimeHours,
            waitTimeDays: call.waitTimeDays,
          });
        }
      }

      return res.send({
        status: true,
        message: "Pipeline cadence created",
        data: null,
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

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
          identifier: st.identifier,
        });
      }

      return res.send({
        status: true,
        message: "Pipeline created",
        data: await PipelineResource(created),
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
export const UpdatePipeline = async (req, res) => {
  let { title } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let pipelineId = req.body.pipelineId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let pipeline = await db.Pipeline.findByPk(pipelineId);

      if (pipeline) {
        if (req.body.title) {
          pipeline.title = req.body.title;
        }
      }

      let saved = await pipeline.save();

      return res.send({
        status: true,
        message: "Pipeline saved",
        data: await PipelineResource(pipeline),
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

export const GetPipelines = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let pipelines = await db.Pipeline.findAll({
        where: {
          userId: user.id,
        },
      });

      return res.send({
        status: true,
        data: await PipelineResource(pipelines),
        message: "Pipeline obtained",
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

      let pipeline = null;
      if (!pipelineId) {
        // //check If default pipeline
        // let pipeline = await db.Pipeline.findOne({
        //   where: {}
        // })

        pipeline = await db.Pipeline.create({
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
        data: pipeline ? await PipelineResource(pipeline) : null,
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

//Start Calling
export const AssignLeadsToPipelineAndAgents = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    let { pipelineId, mainAgentIds, leadIds } = req.body;
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      //Get New Lead Stage of the Pipeline
      let stage = await db.PipelineStages.findOne({
        where: {
          stageTitle: "New Lead",
        },
        order: [["createdAt", "ASC"]],
      });

      let pipeline = await db.Pipeline.findByPk(pipelineId);
      for (let i = 0; i < leadIds.length; i++) {
        let leadId = leadIds[i];
        for (let j = 0; j < mainAgentIds.length; j++) {
          let agentId = mainAgentIds[j];

          let leadCadence = await db.LeadCadence.create({
            leadId: leadId,
            mainAgentId: agentId,
            pipelineId: pipelineId,
            stage: stage.id, //New Lead stage
          });

          //Update the status of the Lead to New Lead
          // await db.LeadModel.update({
          //   stage:
          // })
        }
      }

      return res.send({
        status: true,
        data: await PipelineResource(pipeline),
        message: "New Leads Assigned to pipeline",
      });
    }
  });
};

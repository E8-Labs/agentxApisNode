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
export const CreatePipelineStage = async (req, res) => {
  let { pipelineId, stageTitle, color } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      if (!color) {
        color = process.env.DefaultPipelineColor;
      }
      let pipeline = await db.Pipeline.findByPk(pipelineId);

      let stage = await db.PipelineStages.create({
        pipelineId: pipelineId,
        stageTitle: stageTitle,
        defaultColor: color,
        stageId: null,
        identifier: stageTitle.toLowerCase(),
      });

      return res.send({
        status: true,
        message: "Stage created",
        data: await PipelineResource(pipeline),
      });
    } else {
      return res.send({
        status: false,
        message: "Stage creation failed",
        data: null,
      });
    }
  });
};
export const DeletePipelineStage = async (req, res) => {
  let { pipelineId, stageId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let pipeline = await db.Pipeline.findByPk(pipelineId);

      let deleted = await db.PipelineStages.destroy({
        where: {
          id: stageId,
        },
      });

      return res.send({
        status: true,
        message: "Stage deleted",
        data: await PipelineResource(pipeline),
      });
    } else {
      return res.send({
        status: false,
        message: "Stage deletion failed",
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
    console.log("DataCreatePipelineCadence", {
      pipelineId,
      cadence,
      mainAgentId,
    });
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
        let moveToStage = cad.moveToStage || null;

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
    console.log("Data in assign leads", { pipelineId, mainAgentIds, leadIds });
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
          identifier: "new_lead",
          pipelineId: pipelineId,
        },
        order: [["createdAt", "ASC"]],
      });

      let pipeline = await db.Pipeline.findByPk(pipelineId);
      await db.LeadCadence.update(
        { status: CadenceStatus.Paused }, // Set status to 'Paused'
        {
          where: {
            status: {
              [db.Sequelize.Op.ne]: CadenceStatus.Paused, // Status not equal to 'Paused'
            },
            leadId: { [db.Sequelize.Op.in]: leadIds },
            pipelineId: pipelineId,
          },
        }
      );
      for (let i = 0; i < leadIds.length; i++) {
        let leadId = leadIds[i];

        //Update all others to paused

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

export const PausePipelineCadenceForAnAgent = async (req, res) => {
  let { mainAgentId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      //   let assignedAgent = await db.PipelineAssignedAgent.create({
      //     mainAgentId: mainAgentId,
      //     pipelineId: pipelineId,
      //   });

      let updated = await db.LeadCadence.update(
        {
          status: CadenceStatus.Paused,
        },
        {
          where: {
            status: {
              [db.Sequelize.Op.in]: [
                CadenceStatus.Pending,
                CadenceStatus.Started,
              ],
            },
            mainAgentId: mainAgentId,
          },
        }
      );

      return res.send({
        status: true,
        message: "Pipeline cadence paused",
        // data: pipeline ? await PipelineResource(pipeline) : null,
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

//Scheduled calls
export const GetScheduledCalls = async (req, res) => {
  const { mainAgentId } = req.query;

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let agentIds = [];
      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: user.id,
        },
      });
      if (mainAgentId) {
        agents = await db.MainAgentModel.findAll({
          where: {
            id: mainAgentId,
          },
        });
      }

      agents.map((item) => {
        agentIds.push(item.id);
      });

      console.log("AgentIds", agentIds);

      try {
        // Fetch all relevant leads and their last call details

        // Fetch all leads for the authenticated agents
        // Fetch all relevant leads through LeadCadence
        const leadsWithCadence = await db.LeadCadence.findAll({
          where: {
            mainAgentId: { [db.Sequelize.Op.in]: agentIds },
          },
          include: [
            {
              model: db.LeadModel,
              as: "Lead",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "email",
                "phone",
                "createdAt",
              ],
              // where: {
              //   ...(name && {
              //     [db.Sequelize.Op.or]: [
              //       { firstName: { [db.Sequelize.Op.like]: `%${name}%` } },
              //       { lastName: { [db.Sequelize.Op.like]: `%${name}%` } },
              //     ],
              //   }),
              // },
            },
          ],
        });

        // console.log(
        //   "---------------------------------------------------------------------------"
        // );
        // console.log("Lead with cadence", leadsWithCadence);
        // console.log(
        //   "---------------------------------------------------------------------------\n\n\n\n"
        // );

        // Fetch all relevant last calls
        const lastCalls = await db.LeadCallsSent.findAll({
          attributes: ["leadId", "callTriggerTime", "leadCadenceId"],
          where: {
            leadCadenceId: {
              [db.Sequelize.Op.in]: leadsWithCadence.map(
                (cadence) => cadence.id
              ),
            },
          },
        });
        // console.log(
        //   "---------------------------------------------------------------------------"
        // );

        // console.log("Last calls ", lastCalls);
        // console.log(
        //   "---------------------------------------------------------------------------\n\n\n\n"
        // );
        const futureCalls = [];
        let uniqueAgentIds = [];
        let AgentsWithActiveCadence = [];

        // Process leads with previous calls
        for (const lastCall of lastCalls) {
          const cadenceCalls = await db.CadenceCalls.findAll({
            where: { pipelineCadenceId: lastCall.leadCadenceId },
          });

          console.log("cadenceCall last calls", cadenceCalls);
          const leadData = leadsWithCadence.find(
            (cadence) => cadence.id === lastCall.leadCadenceId
          );
          if (leadData) {
            for (const cadenceCall of cadenceCalls) {
              const delayInMilliseconds =
                cadenceCall.waitTimeDays * 24 * 60 * 60 * 1000 +
                cadenceCall.waitTimeHours * 60 * 60 * 1000 +
                cadenceCall.waitTimeMinutes * 60 * 1000;

              const nextCallTime = new Date(
                new Date(lastCall.callTriggerTime).getTime() +
                  delayInMilliseconds
              );

              if (nextCallTime > new Date()) {
                let mainAgent = await db.MainAgentModel.findByPk(
                  leadData?.mainAgentId
                );

                if (!uniqueAgentIds.includes(leadData.mainAgentId)) {
                  uniqueAgentIds.push(leadData?.mainAgentId);
                  AgentsWithActiveCadence.push(mainAgent);
                }
                futureCalls.push({
                  leadId: leadData.LeadModel.id,
                  stage: cadenceCall.pipelineCadenceId, // The stage from CadenceCalls
                  leadDetails: leadData.LeadModel,
                  scheduledAt: nextCallTime,
                  agent: await AgentResource(mainAgent),
                });
              }
            }
          }
        }

        // Process leads with no previous calls

        const leadsWithoutCalls = leadsWithCadence.filter((cadence) => {
          // console.log("Cadence ", cadence);
          return !lastCalls.some((call) => call.leadId === cadence.Lead.id);
        });
        console.log("Lead without calls", leadsWithoutCalls);

        for (const lead of leadsWithoutCalls) {
          let pipelineCadence = await db.PipelineCadence.findOne({
            where: {
              mainAgentId: lead.mainAgentId,
              pipelineId: lead.pipelineId,
              stage: lead.stage,
            },
          });
          console.log(
            `Pipeline cadence agent= ${lead.mainAgentId} | pipeline= ${lead.pipelineId} | stage= ${lead.stage}`,
            pipelineCadence
          );
          if (!pipelineCadence) {
          } else {
            const cadenceCalls = await db.CadenceCalls.findAll({
              where: { pipelineCadenceId: pipelineCadence.id }, // Use stage from LeadCadence
            });
            console.log(`CadenceCalls for ${pipelineCadence.id}`);
            console.log("Total ", cadenceCalls.length);
            if (cadenceCalls && cadenceCalls.length > 0) {
              for (const cadenceCall of cadenceCalls) {
                // if (cadenceCall) {
                console.log("There is cadence call");
                const delayInMilliseconds =
                  cadenceCall.waitTimeDays * 24 * 60 * 60 * 1000 +
                  cadenceCall.waitTimeHours * 60 * 60 * 1000 +
                  cadenceCall.waitTimeMinutes * 60 * 1000;

                const nextCallTime = new Date(
                  new Date(lead.createdAt).getTime() + delayInMilliseconds
                );

                let mainAgent = await db.MainAgentModel.findByPk(
                  lead.mainAgentId
                );
                if (nextCallTime > new Date()) {
                  if (!uniqueAgentIds.includes(lead.mainAgentId)) {
                    uniqueAgentIds.push(lead?.mainAgentId);
                    AgentsWithActiveCadence.push(mainAgent);
                  }
                  futureCalls.push({
                    leadId: lead.Lead.id,
                    stage: lead.stage, // The stage from LeadCadence
                    leadDetails: lead.Lead,
                    createdAt: lead.createdAt,
                    agent: await AgentResource(mainAgent),
                    scheduledAt: nextCallTime,
                  });
                }
                // }
              }
            }
          }
        }

        // Map and format the data

        return res.status(200).json({
          success: true,
          data: futureCalls,
          agents: await AgentResource(AgentsWithActiveCadence),
        });
      } catch (error) {
        console.error("Error fetching call logs:", error);
        return res.status(500).json({ success: false, error: "Server error" });
      }

      return res.send({
        status: true,
        data: leadSheets,
        message: "Lead Sheets List",
      });
    } else {
    }
  });
};

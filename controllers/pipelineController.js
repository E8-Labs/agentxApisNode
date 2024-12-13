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

// lib/firebase-admin.js
// const admin = require('firebase-admin');
// import { admin } from "../services/firebase-admin.js";
// import ClickSend from 'clicksend';

const User = db.User;
const Op = db.Sequelize.Op;

export const CreatePipeline = async (req, res) => {
  let { title } = req.body; // mainAgentId is the mainAgent id
  console.log("Title is ", title);
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
          description: st.description,
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

export const DeletePipeline = async (req, res) => {
  let { pipelineId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let pipeline = await db.Pipeline.findByPk(pipelineId);

      //Check whether this stage have active cadence or assigned agents.
      //Then use the logics accordingly.
      try {
        let deleted = await db.Pipeline.destroy({
          where: {
            id: pipelineId,
          },
        });

        return res.send({
          status: true,
          message: "Pipeline deleted",
          data: null,
        });
      } catch (error) {
        return res.send({
          status: false,
          message: "Faield to delete pipeline",
          data: null,
          error: error,
        });
      }
    } else {
      return res.send({
        status: false,
        message: "Faield to delete pipeline",
        data: null,
      });
    }
  });
};

export const CreatePipelineStage = async (req, res) => {
  let { pipelineId, stageTitle, color, mainAgentId, tags } = req.body; // mainAgentId is the mainAgent id
  console.log("Data in request");
  console.log({ pipelineId, stageTitle, color, mainAgentId });
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
      let lastStageByOrder = await db.PipelineStages.findOne({
        where: {
          pipelineId: pipeline.id,
        },
        order: [["order", "DESC"]],
        limit: 1,
      });
      let order = 10;
      if (lastStageByOrder) {
        order = lastStageByOrder.order + 1;
      }

      let advanced = null;
      let actionId = null;
      if (req.body.action) {
        advanced = { action: req.body.action };
        // advanced.action = action;
        if (req.body.examples && advanced) {
          advanced.examples = req.body.examples;
        }
        //createInfoExtractor yes no
        let ieData = {
          actiontype: "yes_no",
          question: `${process.env.StagePrefix}_stage_${stageTitle}`,
          description: req.body.action,
          examples: req.body.examples || [],
        };
        let actionCreated = await CreateInfoExtractor(ieData);
        // let actionCreated = await CreateAndAttachInfoExtractor(
        //   mainAgentId,
        //   ieData
        // );
        actionId = actionCreated.response.action_id; //actionCreated.action_id;
        if (actionId) {
          let agentIds = [];
          if (mainAgentId) {
            agentIds = [mainAgentId];
          } else {
            //findAll Agents who are in this pipeline
            let cadenceAgents = await db.PipelineCadence.findAll({
              where: {
                pipelineId: pipelineId,
              },
            });
            let cadenceAgentIds = cadenceAgents.map((item) => item.mainAgentId);
            let agents = await db.MainAgentModel.findAll({
              where: {
                id: {
                  [db.Sequelize.Op.in]: cadenceAgentIds,
                },
              },
            });
            agentIds = agents.map((item) => item.id);
            console.log("The ie should be attached to these agents", agentIds);
          }

          for (const id of agentIds) {
            console.log(`Attaching action ${actionId} to ${id}`);
            let attached = await AttachInfoExtractor(id, actionId);
            console.log("Action attached ", attached);
          }
        }
      }

      let stage = await db.PipelineStages.create({
        pipelineId: pipelineId,
        stageTitle: stageTitle,
        defaultColor: color,
        stageId: null,
        order: order,
        advancedConfig: advanced ? JSON.stringify(advanced) : null,
        actionId: actionId,
        identifier: stageTitle.toLowerCase(),
      });

      if (tags) {
        for (const tag of tags) {
          let created = await db.StageTagModel.create({
            tag: tag,
            pipelineStageId: stage.id,
          });
        }
      }

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

export const UpdatePipelineStage = async (req, res) => {
  let { stageId } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let pipelineId = req.body.pipelineId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let pipelineStage = await db.PipelineStages.findByPk(stageId);

      if (pipelineStage) {
        if (req.body.stageTitle) {
          pipelineStage.stageTitle = req.body.stageTitle;
        }
        if (req.body.color) {
          pipelineStage.defaultColor = req.body.color;
        }
      }

      let saved = await pipelineStage.save();

      let pipeline = await db.Pipeline.findByPk(pipelineStage.pipelineId);
      return res.send({
        status: true,
        message: "Pipeline Stage updated",
        data: await PipelineResource(pipeline),
      });
    } else {
      return res.send({
        status: false,
        message: "PipelineStage update failed",
        data: null,
      });
    }
  });
};

export const ReorderPipelineStages = async (req, res) => {
  const { pipelineId, reorderedStages } = req.body;
  // `reorderedStages` should be an array of stage objects with `id` and new `order` values

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        // Validate pipeline existence
        const pipeline = await db.Pipeline.findByPk(pipelineId);
        if (!pipeline) {
          return res.status(404).send({
            status: false,
            message: "Pipeline not found",
          });
        }

        // Update order of each stage
        for (const stage of reorderedStages) {
          await db.PipelineStages.update(
            { order: stage.order },
            { where: { id: stage.id, pipelineId: pipelineId } }
          );
        }

        // Fetch updated pipeline data (optional)
        const updatedPipeline = await PipelineResource(pipeline);

        return res.send({
          status: true,
          message: "Stages reordered successfully",
          data: updatedPipeline,
        });
      } catch (err) {
        console.error(err);
        return res.status(500).send({
          status: false,
          message: "An error occurred while reordering stages",
        });
      }
    } else {
      return res.status(401).send({
        status: false,
        message: "Unauthorized",
      });
    }
  });
};

export const DeletePipelineStage = async (req, res) => {
  let { pipelineId, stageId, moveToStage } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let pipeline = await db.Pipeline.findByPk(pipelineId);
      let stage = await db.PipelineStages.findByPk(stageId);

      //Check whether this stage have active cadence or assigned agents.
      //Then use the logics accordingly.

      //update all cadence that move to the stage which is deleted stage
      let cadUpdate = await db.PipelineCadence.update(
        {
          moveToStage: moveToStage,
        },
        {
          where: {
            pipelineId: pipelineId,
            moveToStage: stageId,
          },
        }
      );

      let cadUpdatedStageId = await db.PipelineCadence.update(
        {
          stage: moveToStage,
        },
        {
          where: {
            pipelineId: pipelineId,
            stage: stageId,
          },
        }
      );

      //Update Lead Cadence to moveToStage if they are on the deleted stage
      let leadCadUpdate = await db.LeadCadence.update(
        {
          stage: moveToStage,
        },
        {
          where: {
            stage: stageId,
          },
        }
      );

      //Delete Action created
      if (stage.actionId != null) {
        //delete the IE
        let del = await DeleteActionSynthflow(stage.actionId);
        if (del) {
          console.log("Action deleted for stage as well");
        }
      }

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
      } else {
        pipeline = await db.Pipeline.findByPk(pipelineId);
      }

      //Check if the pipeline has custom stages with action added and assign them to these agents
      let stages = await db.PipelineStages.findAll({
        where: {
          pipelineId: pipelineId,
          actionId: {
            [db.Sequelize.Op.ne]: null,
          },
        },
      });

      if (stages) {
        console.log("Found stages custom that can be assigned ", stages);
        let actions = stages.map((item) => item.actionId);
        console.log(`Attaching actions ${actions} to ${mainAgentId}`);
        let attached = await AttachInfoExtractor(mainAgentId, actions);
        console.log("Action attached ", attached);
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

export const GetAgentCadence = async (req, res) => {
  let { mainAgentId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    console.log("GetAgentCadence", {
      mainAgentId,
    });
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let pipelineCadence = await db.PipelineCadence.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });
      console.log("Found pc ", JSON.stringify(pipelineCadence));
      let cadences = [];
      if (pipelineCadence && pipelineCadence.length > 0) {
        for (let pc of pipelineCadence) {
          let pcStage = await db.PipelineStages.findByPk(pc.stage);
          let moveToStage = await db.PipelineStages.findByPk(pc.moveToStage);
          pc.stage = pcStage;
          pc.moveToStage = moveToStage;

          let cadenceCalls = await db.CadenceCalls.findAll({
            where: {
              pipelineCadenceId: pc.id,
            },
          });
          cadences.push({ cadence: pc, calls: cadenceCalls });
        }
      }

      return res.send({
        status: true,
        message: "Agent Cadence",
        data: cadences,
      });
    } else {
      return res.send({
        status: false,
        message: "No cadence",
        data: null,
      });
    }
  });
};

//Start Calling
export const AssignLeadsToPipelineAndAgents = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    let { pipelineId, mainAgentIds, leadIds, batchSize, startTimeDifFromNow } =
      req.body;
    console.log("Data in assign leads", {
      pipelineId,
      mainAgentIds,
      leadIds,
      batchSize,
      startTimeDifFromNow,
    });
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

      let leadUpdated = await db.LeadModel.update(
        {
          stage: stage.id,
        },
        {
          where: {
            id: {
              [db.Sequelize.Op.in]: leadIds,
            },
          },
        }
      );

      let pipeline = await db.Pipeline.findByPk(pipelineId);
      //Pause Older Batches. This code will be changed based on the new Batch Model
      //Ideally user will not assign same leads to another batch.
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
      const now = new Date();
      const minutesToAdd = 30; // Replace with your desired number of minutes
      let startTime = new Date(
        now.getTime() + startTimeDifFromNow * 60000
      ).toISOString();

      // let startTime = startTimeDifFromNow;
      let batch = await db.CadenceBatchModel.create({
        pipelineId: pipelineId,
        userId: userId,
        totalLeads: leadIds.length,
        batchSize: batchSize,
        startTime: startTime,
      });
      for (let i = 0; i < leadIds.length; i++) {
        let leadId = leadIds[i];

        //Update all others to paused

        for (let j = 0; j < mainAgentIds.length; j++) {
          let agentId = mainAgentIds[j];
          // let batch = batches[agentId];
          // if (!batch) {
          //   batch = await db.CadenceBatchModel.create({
          //     pipelineId: pipelineId,
          //     mainAgentId: agentId,
          //     totalLeads: leadIds.length,
          //     batchSize: batchSize,
          //     startTime: startTime,
          //   });
          //   batches[agentId] = batch;
          // }
          let leadCadence = await db.LeadCadence.create({
            leadId: leadId,
            mainAgentId: agentId,
            pipelineId: pipelineId,
            // stage: stage.id, //New Lead stage
            batchId: batch.id,
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
  let { mainAgentId, batchId } = req.body; // mainAgentId is the mainAgent id
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

      // if (mainAgentId) {
      //   //only pause for that agent
      //   let updated = await db.LeadCadence.update(
      //     {
      //       status: CadenceStatus.Paused,
      //     },
      //     {
      //       where: {
      //         status: {
      //           [db.Sequelize.Op.in]: [
      //             CadenceStatus.Pending,
      //             CadenceStatus.Started,
      //           ],
      //         },
      //         mainAgentId: mainAgentId,
      //       },
      //     }
      //   );
      // }

      let batchPaused = await db.CadenceBatchModel.update(
        {
          status: BatchStatus.Paused,
        },
        {
          id: batchId,
        }
      );

      return res.send({
        status: true,
        message: "Pipeline cadence paused for batch",
        // data: pipeline ? await PipelineResource(pipeline) : null,
      });
    } else {
      return res.send({
        status: false,
        message: "Pipeline pausing failed",
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

      let batches = await db.CadenceBatchModel.findAll({
        where: {
          userId: user.id,
        },
      });
      let batchIds = batches.map((batch) => batch.id);

      let resource = await BatchResource(batches);
      if (batches) {
        return res.send({
          status: true,
          message: "Batched Calls found",
          data: resource,
        });
      } else {
        return res.send({
          status: false,
          message: "No Scheduled calls",
        });
      }
    }
  });
};

export const GetScheduledCallsForAgent = async (mainAgentId) => {
  // const { mainAgentId } = req.query;

  let agentIds = [];
  let agents = null;
  //await db.MainAgentModel.findAll({
  //   where: {
  //     userId: user.id,
  //   },
  // });
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
            "address",
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

    console.log(
      "---------------------------------------------------------------------------"
    );
    console.log("Lead with cadence", leadsWithCadence.length);
    console.log(
      "---------------------------------------------------------------------------\n\n\n\n"
    );

    // return;
    // Fetch all relevant last calls
    const lastCalls = await db.LeadCallsSent.findAll({
      attributes: ["leadId", "callTriggerTime", "leadCadenceId"],
      where: {
        leadCadenceId: {
          [db.Sequelize.Op.in]: leadsWithCadence.map((cadence) => cadence.id),
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
    // return;
    const futureCalls = [];
    let uniqueAgentIds = [];
    let AgentsWithActiveCadence = [];

    // Process leads with previous calls
    for (const lastCall of lastCalls) {
      const cadenceCalls = await db.CadenceCalls.findAll({
        where: { pipelineCadenceId: lastCall.leadCadenceId },
      });

      // console.log("cadenceCall last calls", cadenceCalls);
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
            new Date(lastCall.callTriggerTime).getTime() + delayInMilliseconds
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
              leadId: leadData?.Lead?.id,
              stage: cadenceCall.pipelineCadenceId, // The stage from CadenceCalls
              leadDetails: leadData?.Lead,
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
    // console.log("Lead without calls", leadsWithoutCalls);

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

            let mainAgent = await db.MainAgentModel.findByPk(lead.mainAgentId);
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

    return {
      status: true,
      data: futureCalls,
      // agents: await AgentResource(AgentsWithActiveCadence),
    };
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return { status: false, error: "Server error" };
  }
};

export const GetScheduledFutureCalls = async (agentId, batchId) => {
  let PipelineCadence = db.PipelineCadence;
  let CadenceCalls = db.CadenceCalls;
  let LeadCadence = db.LeadCadence;
  let LeadCallsSent = db.LeadCallsSent;
  let Op = db.Sequelize.Op;

  try {
    // Fetch the relevant LeadCadences for the agent and batch
    const leadCadences = await LeadCadence.findAll({
      where: {
        mainAgentId: agentId,
        batchId: batchId,
        status: { [Op.ne]: "Paused" }, // Exclude paused cadences
      },
    });

    const futureCalls = [];

    for (const leadCadence of leadCadences) {
      let currentStage = leadCadence.stage || 288; // Default to the starting stage if stage is null
      let lastCallTime = moment(leadCadence.callTriggerTime || new Date());

      while (currentStage) {
        // Fetch the PipelineCadence for the current stage
        const pipelineCadence = await PipelineCadence.findOne({
          where: { stage: currentStage, pipelineId: leadCadence.pipelineId },
        });

        if (!pipelineCadence) {
          console.warn(
            `No PipelineCadence found for stage ${currentStage} and pipeline ${leadCadence.pipelineId}`
          );
          break;
        }

        // Fetch the CadenceCalls for the current PipelineCadence
        const cadenceCalls = await CadenceCalls.findAll({
          where: { pipelineCadenceId: pipelineCadence.id },
          order: [["id", "ASC"]],
        });

        // Get the calls already sent for this stage
        const callsSent = await LeadCallsSent.findAll({
          where: {
            leadCadenceId: leadCadence.id,
            stage: currentStage,
          },
          order: [["callTriggerTime", "ASC"]],
        });

        let totalCallsSent = callsSent.length;

        // Calculate future calls for the current stage
        for (const [index, cadenceCall] of cadenceCalls.entries()) {
          if (totalCallsSent > index) continue; // Skip already sent calls

          const waitTimeMinutes = cadenceCall.waitTimeMinutes || 0;
          const waitTimeHours = cadenceCall.waitTimeHours || 0;
          const waitTimeDays = cadenceCall.waitTimeDays || 0;

          const nextCallTime = lastCallTime
            .clone()
            .add(waitTimeMinutes, "minutes")
            .add(waitTimeHours, "hours")
            .add(waitTimeDays, "days");

          futureCalls.push({
            leadId: leadCadence.leadId,
            agentId: agentId,
            batchId: batchId,
            pipelineCadenceId: pipelineCadence.id,
            stage: currentStage,
            callTriggerTime: nextCallTime.toISOString(),
          });

          lastCallTime = nextCallTime;
        }

        // Move to the next stage
        currentStage = pipelineCadence.moveToStage;
      }
    }

    return futureCalls;
  } catch (error) {
    console.error("Error fetching future calls:", error);
    throw new Error("Failed to calculate future calls.");
  }
};

// export default GetScheduledFutureCalls;

export const GetScheduledCallsOld = async (req, res) => {
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
                "address",
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

        console.log(
          "---------------------------------------------------------------------------"
        );
        console.log("Lead with cadence", leadsWithCadence.length);
        console.log(
          "---------------------------------------------------------------------------\n\n\n\n"
        );

        // return;
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

        console.log("Last calls ", lastCalls);
        // console.log(
        //   "---------------------------------------------------------------------------\n\n\n\n"
        // );
        // return;
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
                  leadId: leadData?.Lead?.id,
                  stage: cadenceCall.pipelineCadenceId, // The stage from CadenceCalls
                  leadDetails: leadData?.Lead,
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

//
export const GetCallActivities = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: userId,
        },
      });
      let agentIds = [];
      if (agents && agents.length > 0) {
        agentIds = agents.map((item) => item.id);
      }
      let pipelineCad = await db.PipelineCadence.findAll({
        where: {
          mainAgentId: {
            [db.Sequelize.Op.in]: agentIds,
          },
        },
      });
    } else {
    }
  });
};

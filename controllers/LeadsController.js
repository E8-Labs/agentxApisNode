import db from "../models/index.js";
import { Op } from "sequelize";
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
import LeadResource from "../resources/LeadResource.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import LeadModel from "../models/lead/lead.js";
import { AssignLeads } from "./pipelineController.js";
import LeadCallResource from "../resources/LeadCallResource.js";
import { WebhookTypes } from "../models/webhooks/WebhookModel.js";

const limit = 500;
/**
 * Check for stage conflicts among agents.
 * @param {Array<number>} mainAgentIds - Array of agent IDs to check.
 * @returns {Object} - Object containing conflicts or a success message.
 */
export const checkStageConflicts = async (mainAgentIds) => {
  try {
    // Fetch conflicting stages for the given mainAgentIds
    const conflicts = await db.PipelineCadence.findAll({
      attributes: ["stage", [db.Sequelize.fn("COUNT", "stage"), "agentCount"]],
      where: {
        mainAgentId: {
          [db.Sequelize.Op.in]: mainAgentIds, // Filter by given mainAgentIds
        },
      },
      group: ["stage"],
      having: db.Sequelize.literal("COUNT(stage) > 1"), // Only stages assigned to multiple agents
    });

    if (conflicts.length > 0) {
      // Format the response with conflict details
      return {
        status: false,
        message: "Conflicts detected in stages for the provided agents.",
        conflicts: conflicts.map((conflict) => ({
          stage: conflict.stage,
          agentCount: parseInt(conflict.dataValues.agentCount, 10),
        })),
      };
    }

    // No conflicts found
    return {
      status: true,
      message: "No conflicts found in stages for the provided agents.",
    };
  } catch (error) {
    console.error("Error checking stage conflicts:", error.message);
    return {
      status: false,
      message: "Error checking stage conflicts.",
      error: error.message,
    };
  }
};

export const AddLeads = async (req, res) => {
  let { sheetName, columnMappings, leads, tags } = req.body; // mainAgentId is the mainAgent id
  if (req.body.mainAgentIds) {
    console.log("Main agent ids", req.body.mainAgentIds);
    let checkData = await checkStageConflicts(req.body.mainAgentIds);
    console.log("Check data");
    console.log(checkData);
    if (checkData.status == false) {
      return res.status(403).send(checkData);
    }
  }
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let sheet = await db.LeadSheetModel.findOne({
        where: {
          sheetName: sheetName,
          userId: user.id,
        },
      });
      if (!sheet) {
        sheet = await db.LeadSheetModel.create({
          sheetName: sheetName,
          userId: userId,
        });
        if (tags) {
          for (const tag of tags) {
            let tagCreated = await db.LeadSheetTagModel.create({
              tag: tag,
              sheetId: sheet.id,
            });
          }
        }
      }

      let dbLeads = [];
      for (let i = 0; i < leads.length; i++) {
        let lead = leads[i];
        let extraColumns = lead.extraColumns;
        lead.extraColumns = null;
        if (typeof lead.fullName !== "undefined" && lead.fullName !== null) {
          if (!lead.firstName && !lead.lastName) {
            let nameParts = lead.fullName.trim().split(" ");
            lead.firstName = nameParts[0];
            lead.lastName =
              nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          }
        } else {
          console.log("No full name");
        }
        if (
          typeof lead.firstName == "undefined" ||
          lead.firstName == null ||
          typeof lead.phone == "undefined" ||
          lead.phone == null
        ) {
          console.log("Lead not created ", lead);
        } else {
          console.log("LeadPhone", lead.phone);
          if (
            typeof lead.lastName == "undefined" ||
            lead.lastName == null ||
            lead.lastName == ""
          ) {
            //try to parse from first name
            console.log(
              "No last name. Checking if first name has the last name"
            );
            let parts = lead.firstName.trim().split(" ");
            if (parts.length > 1) {
              lead.firstName = parts[0];
              lead.lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
            }
          }
          // lead.phone = lead.phone.replace(" ", "");
          // lead.phone = lead.phone.replace("-", "");
          // lead.phone = lead.phone.replace("(", "");
          // lead.phone = lead.phone.replace(")", "");
          lead.phone = String(lead.phone).replace(/[ \-\(\)]/g, "");
          if (!lead.phone.startsWith("1") && !lead.phone.startsWith("+")) {
            console.log("Phone doesn't start with 1");
            lead.phone = "+1" + lead.phone;
          }
          if (!lead.phone.startsWith("+") && lead.phone.startsWith("1")) {
            console.log("Phone Not starts with +1");
            lead.phone = "+" + lead.phone;
          }
          console.log(lead);

          if (
            lead.phone.length == 11 ||
            (lead.phone.length == 12 && lead.phone.startsWith("+"))
          ) {
            // only push the lead if the number is valid
            try {
              let createdLead = await db.LeadModel.create({
                ...lead,
                extraColumns: JSON.stringify(extraColumns),
                userId: userId,
                sheetId: sheet.id,
              });
              dbLeads.push(createdLead);
            } catch (error) {
              console.log("Error adding one lead", error);
            }
          }
          // if (!lead.phone.startsWith("+") && lead.phone.startsWith("1")) {
          // }
        }
      }

      //Hi {First Name}. This is this Dec 15 Default Pipeline Noah Realty! How’s it going?

      let sheetWithTags = await db.LeadSheetModel.findOne({
        where: {
          id: sheet.id,
        },
        include: [
          {
            model: db.LeadSheetTagModel, // Reference to the tag model
            as: "tags", // Alias for the association (optional but recommended)
            attributes: ["tag"], // Specify the fields you want from the tag model
          },
          {
            model: db.LeadSheetColumnModel, // Reference to the tag model
            as: "columns", // Alias for the association (optional but recommended)
            attributes: ["columnName"], // Specify the fields you want from the tag model
          },
        ],
      });

      if (req.body.mainAgentIds) {
        let leadIds = dbLeads.map((lead) => lead.id);
        let ids = req.body.mainAgentIds || [];
        if (!req.body.pipelineId) {
          //sen response
        }
        if (ids.length > 0) {
          let pipelineId = req.body.pipelineId;
          //assign leads here as well
          console.log("Assigning leads in Add Leads Function");
          let pipeline = await AssignLeads(
            user,
            pipelineId,
            leadIds,
            ids,
            req.body.startTimeDifFromNow || 0,
            req.body.batchSize || 50
          );
        }
      }

      let leadsRes = await LeadResource(dbLeads);

      //call the api for webhook of this user
      if (dbLeads.length > 0) {
        await postDataToWebhook(user, leadsRes, WebhookTypes.TypeNewLeadAdded);
        // let webhooks = await db.WebhookModel.findAll({
        //   where: {
        //     userId: user.id,
        //     action: WebhookTypes.TypeNewLeadAdded,
        //   },
        // });
        // console.log("Found webhooks ", webhooks.length);
        // if (webhooks && webhooks.length > 0) {
        //   for (const webhook of webhooks) {
        //     postDataToWebhook(webhook.url, leadsRes);
        //   }
        // }
      }
      res.send({
        status: true,
        message: `${dbLeads.length} new leads added`,
        data: sheetWithTags,
        leads: leadsRes,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const DeleteLead = async (req, res) => {
  let { leadId } = req.body; // mainAgentId is the mainAgent id
  let isPipeline = req.body.isPipeline || false;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let lead = await db.LeadModel.findByPk(leadId);

      if (!lead) {
        return res.send({
          status: false,
          message: "No such lead",
        });
      }

      if (!isPipeline) {
        let leadDel = await db.LeadModel.update(
          { status: "deleted" },
          {
            where: {
              id: leadId,
            },
          }
        );
      }
      // else{
      //Pause cadence for this lead as well.
      await db.LeadCadence.update(
        {
          status: CadenceStatus.Paused,
        },
        {
          where: {
            leadId: leadId,
          },
        }
      );
      // }

      res.send({
        status: true,
        message: `Lead deleted`,
        data: leadDel,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const postDataToWebhook = async (
  user,
  data,
  action = WebhookTypes.TypeNewLeadAdded
) => {
  let webhooks = await db.WebhookModel.findAll({
    where: {
      userId: user.id,
      action: action, //WebhookTypes.TypeNewLeadAdded,
    },
  });
  console.log("Action ", action);
  console.log("Found webhooks ", webhooks.length);
  if (webhooks && webhooks.length > 0) {
    for (const webhook of webhooks) {
      // postDataToWebhook(webhook.url, leadsRes);
      try {
        const response = await axios.post(webhook.url, data, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Response from Zapier:", response.data);
      } catch (error) {
        console.error("Error posting to Zapier:", error.message);
      }
    }
  }
};

//Or sheet
export const AddSmartList = async (req, res) => {
  let { sheetName, columns, tags } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let sheet = await db.LeadSheetModel.create({
        sheetName: sheetName,
        userId: userId,
      });

      if (tags) {
        for (const tag of tags) {
          let tagCreated = await db.LeadSheetTagModel.create({
            tag: tag,
            sheetId: sheet.id,
          });
        }
      }
      console.log("Typeof ", typeof db.LeadSheetColumnModel);
      for (const column of columns) {
        let found = await db.LeadSheetColumnModel.findOne({
          where: {
            columnName: column,
            sheetId: sheet.id,
          },
        });
        if (!found) {
          console.log("column not found create one");
          let created = await db.LeadSheetColumnModel.create({
            columnName: column,
            sheetId: sheet.id,
          });
        } else {
          console.log("column found already");
        }
      }

      let sheetWithTags = await db.LeadSheetModel.findOne({
        where: {
          id: sheet.id,
        },
        include: [
          {
            model: db.LeadSheetTagModel, // Reference to the tag model
            as: "tags", // Alias for the association (optional but recommended)
            attributes: ["tag"], // Specify the fields you want from the tag model
          },
          {
            model: db.LeadSheetColumnModel, // Reference to the tag model
            as: "columns", // Alias for the association (optional but recommended)
            attributes: ["columnName"], // Specify the fields you want from the tag model
          },
        ],
      });
      res.send({
        status: true,
        message: `Sheet added`,
        data: sheetWithTags,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

//Or sheet
export const AddLeadNote = async (req, res) => {
  let { leadId, note } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let createdNote = await db.LeadNotesModel.create({
        note: note,
        userId: user.id,
        leadId: leadId,
      });
      res.send({
        status: true,
        message: `Note added`,
        data: createdNote,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const AddLeadTag = async (req, res) => {
  let { leadId, tags } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      for (t of tags) {
        let createdTag = await db.LeadTagsModel.create({
          tag: t,
          leadId: leadId,
        });
      }
      let lead = await LeadModel.findByPk(leadId);
      let leadRes = await LeadResource(lead);
      res.send({
        status: true,
        message: `Note added`,
        data: leadRes,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};
export const DeleteLeadTag = async (req, res) => {
  let { tagId, tag } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      if (tagId || tag) {
        if (tagId) {
          let deleted = await db.LeadTagsModel.destroy({
            where: {
              id: tagId,
            },
          });
        } else {
          let deleted = await db.LeadTagsModel.destroy({
            where: {
              tag: tag,
            },
          });
        }
        res.send({
          status: true,
          message: `Tag deleted`,
          data: null,
        });
      } else {
        res.send({
          status: false,
          message: `Tag not deleted`,
          data: null,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const DeleteList = async (req, res) => {
  let { sheetId } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let sheet = await db.LeadSheetModel.findByPk(sheetId);

      if (sheet) {
        await db.LeadModel.destroy({
          where: {
            sheetId: sheetId,
          },
        });
        await db.LeadSheetModel.destroy({
          where: {
            id: sheetId,
          },
        });
      }

      let leadDel = await db.LeadModel.destroy({
        where: {
          sheetId: sheet.id,
        },
      });

      res.send({
        status: true,
        message: `Sheet deleted`,
        data: null,
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const GetSheets = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let leadSheets = await db.LeadSheetModel.findAll({
        where: {
          userId: userId,
        },
        include: [
          {
            model: db.LeadSheetTagModel, // Reference to the tag model
            as: "tags", // Alias for the association (optional but recommended)
            attributes: ["tag"], // Specify the fields you want from the tag model
          },
          {
            model: db.LeadSheetColumnModel, // Reference to the tag model
            as: "columns", // Alias for the association (optional but recommended)
            attributes: ["columnName"], // Specify the fields you want from the tag model
          },
        ],
      });

      return res.send({
        status: true,
        data: leadSheets,
        message: "Lead Sheets List",
      });
    } else {
    }
  });
};

export const UpdateLeadStage = async (req, res) => {
  let { leadId, stageId } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      console.log("Lead id ", leadId);
      console.log("Stage id ", stageId);
      let lead = await db.LeadModel.findOne({
        where: {
          id: leadId,
          userId: user.id,
          status: "active",
        },
      });

      if (lead) {
        lead.stage = stageId;
        await lead.save();
        let resource = await LeadResource(lead);

        postDataToWebhook(user, [resource], WebhookTypes.TypeStageChange);
        res.send({
          status: true,
          message: `Lead updated`,
          data: resource,
        });
      } else {
        res.send({
          status: false,
          message: `No such lead`,
          data: null,
          leadId,
        });
      }
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const GetLeads = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized",
      });
    }

    if (authData) {
      try {
        const { sheetId, stageIds, fromDate, toDate, noStage } = req.query; // Fetching query parameters
        const userId = authData.user.id;
        let offset = Number(req.query.offset) || 0;
        // Validate the user
        const user = await db.User.findOne({
          where: { id: userId },
        });
        if (!user) {
          return res.status(404).send({
            status: false,
            message: "User not found",
          });
        }

        console.log("user data ", {
          sheetId,
          stageIds,
          fromDate,
          toDate,
          noStage,
        });

        // Build filters for leads
        const leadFilters = { sheetId, status: "active" };
        if (fromDate && toDate) {
          let dates = [new Date(fromDate), new Date(toDate)];
          console.log("Dates ", dates);
          leadFilters.createdAt = {
            [db.Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
          };
        }
        if (stageIds && stageIds != "") {
          console.log("No stage ", noStage);
          // if (noStage == "true" || noStage == 1 || noStage == true) {
          //   leadFilters.stage = {
          //     [db.Sequelize.Op.or]: [
          //       { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) }, // Matches stage IDs
          //       { [db.Sequelize.Op.is]: null }, // Matches null values
          //     ],
          //   };
          // }
          // else {
          leadFilters.stage = {
            [db.Sequelize.Op.in]: stageIds.split(",").map(Number),
          };
          // }
        }

        // Fetch leads first based on general filters
        const leads = await db.LeadModel.findAll({
          where: leadFilters,
          offset: offset,
          limit: limit,
          // attributes: ["id", "firstName", "lastName", "email", "phone", "stage"], // Adjust attributes as needed
          raw: true, // Return plain objects
        });

        if (!leads.length) {
          return res.send({
            status: true,
            data: [],
            message: "No leads found for the given filters",
          });
        }

        // Extract lead IDs
        const leadIds = leads.map((lead) => lead.id);

        // Fetch cadences if stageIds are provided or not
        let cadences = [];
        if (stageIds) {
          // Filter LeadCadence by stageIds and leadIds
          const cadenceFilters = {
            leadId: { [db.Sequelize.Op.in]: leadIds },
            status: CadenceStatus.Started, // Only active cadences
            // stage: { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) },
          };

          cadences = await db.LeadCadence.findAll({
            where: cadenceFilters,
            attributes: ["leadId", "stage", "status"], // Adjust attributes as needed
            raw: true, // Return plain objects
          });
        } else {
          // Fetch all cadences for the given leads if stageIds are not provided
          const cadenceFilters = {
            leadId: { [db.Sequelize.Op.in]: leadIds },
            status: CadenceStatus.Started, // Only active cadences
          };

          cadences = await db.LeadCadence.findAll({
            where: cadenceFilters,
            attributes: ["leadId", "stage", "status"], // Adjust attributes as needed
            raw: true, // Return plain objects
          });
        }

        // Create a map for cadences keyed by leadId
        const cadenceMap = cadences.reduce((acc, cadence) => {
          acc[cadence.leadId] = cadence;
          return acc;
        }, {});

        // Combine leads with cadences
        let leadsWithCadence = [];
        let keys = [];
        for (let i = 0; i < leads.length; i++) {
          let lead = leads[i];
          const cadence = cadenceMap[lead.id];
          let stage = await db.PipelineStages.findOne({
            where: {
              id: lead.stage,
            },
          });
          let extra = lead.extraColumns;
          if (extra) {
            let js = JSON.parse(extra);
            lead = { ...lead, ...js };
          }
          delete lead.extraColumns;
          leadsWithCadence.push({
            ...lead,
            kycs: await db.LeadKycsExtracted.findAll({
              where: {
                leadId: lead.id,
              },
            }), //[{ question: "Who are you", answer: "I am salman" }],
            stage: stage, // Use LeadCadence stage if available, else LeadModel stage
            cadenceStatus: cadence ? cadence.status : null, // Cadence status or null
          });

          const fixedKeys = [
            "firstName",
            "lastName",
            "email",
            "phone",
            "id",
            "userId",
            "sheetId",
            "extraColumns",
            "columnMappings",
            "updatedAt",
            "createdAt",
            "stage",
          ];
          const dynamicKeysWithNonNullValues = Object.keys(lead).filter(
            (key) => !fixedKeys.includes(key) && lead[key] !== null
          );
          keys = mergeAndRemoveDuplicates(keys, dynamicKeysWithNonNullValues);
        }
        // keys = mergeAndRemoveDuplicates(keys);
        let AllColumns = [
          { title: "Name", isDefault: true },
          { title: "Phone", isDefault: true },
          { title: "Stage", isDefault: true },
          // { title: "Date", isDefault: true },
        ];
        for (const key of keys) {
          AllColumns.push({
            title: key,
            isDefault: false,
          });
        }

        // leadsWithCadence = leads.map(async (lead) => {
        //   const cadence = cadenceMap[lead.id];
        //   let stage = await db.PipelineStages.findOne({
        //     where: {
        //       id: cadence ? cadence.stage : lead.stage,
        //     },
        //   });
        //   return {
        //     ...lead,
        //     stage: stage, // Use LeadCadence stage if available, else LeadModel stage
        //     cadenceStatus: cadence ? cadence.status : null, // Cadence status or null
        //   };
        // });

        let reso = await LeadResource(leadsWithCadence);
        return res.send({
          status: true,
          data: reso, //leadsWithCadence,
          columns: AllColumns,
          keys: keys,
          message: "Leads list with applied filters",
        });
      } catch (err) {
        console.error(err);
        return res.status(500).send({
          status: false,
          message: "Server error",
        });
      }
    }
  });
};

export const GetLeadDetail = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let leadId = req.query.leadId;

      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let lead = await db.LeadModel.findByPk(leadId);
      if (!lead) {
        return res.send({
          data: null,
          message: "No such lead",
          details: { leadId: leadId },
        });
      }
      console.log("Lead ", leadId);
      const cadenceFilters = {
        leadId: { [db.Sequelize.Op.in]: [leadId] },
        status: CadenceStatus.Started, // Only active cadences
        // stage: { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) },
      };
      const cadences = await db.LeadCadence.findAll({
        where: cadenceFilters,
        attributes: ["leadId", "stage", "status"], // Adjust attributes as needed
        raw: true, // Return plain objects
      });
      const cadenceMap = cadences.reduce((acc, cadence) => {
        acc[cadence.leadId] = cadence;
        return acc;
      }, {});
      const cadence = cadenceMap[lead.id];
      let stage = await db.PipelineStages.findOne({
        where: {
          id: lead.stage,
        },
      });
      let extra = lead.extraColumns;
      if (extra) {
        let js = JSON.parse(extra);
        lead = { ...lead.get(), ...js };
      }
      console.log("Lead ", lead);
      delete lead.extraColumns;

      const fixedKeys = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "id",
        "userId",
        "sheetId",
        "extraColumns",
        "columnMappings",
        "updatedAt",
        "createdAt",
        "stage",
      ];
      const dynamicKeysWithNonNullValues = Object.keys(lead).filter(
        (key) => !fixedKeys.includes(key) && lead[key] !== null
      );
      let keys = [];
      keys = mergeAndRemoveDuplicates(keys, dynamicKeysWithNonNullValues);
      console.log(keys);
      let AllColumns = [
        { title: "Name", isDefault: true },
        { title: "Phone", isDefault: true },
        { title: "Stage", isDefault: true },
        // { title: "Date", isDefault: true },
      ];
      for (const key of keys) {
        AllColumns.push({
          title: key,
          isDefault: false,
        });
      }

      lead = {
        ...lead,
        kycs: await db.LeadKycsExtracted.findAll({
          where: {
            leadId: lead.id,
          },
        }), //[{ question: "Who are you", answer: "I am salman" }],
        stage: stage, // Use LeadCadence stage if available, else LeadModel stage
        cadenceStatus: cadence ? cadence.status : null, // Cadence status or null
      };
      let leadRes = await LeadResource(lead);

      return res.send({
        status: true,
        data: leadRes,
        keys: keys,
        columns: AllColumns,
        message: "Lead  detail",
      });
    } else {
    }
  });
};

export async function GetColumnsInSheet(sheetId) {
  let leads = await db.LeadModel.findAll({
    where: {
      sheetId: sheetId,
      status: "active",
    },
  });

  let keys = [];
  leads.map((lead) => {
    let extraColumns = lead.extraColumns;
    let json = JSON.parse(extraColumns);
    const leadKeys = Object.keys(json);

    leadKeys.forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
  });
  let sheetColumns = await db.LeadSheetColumnModel.findAll({
    where: {
      sheetId: sheetId,
    },
  });
  if (sheetColumns) {
    sheetColumns.map((column) => {
      if (!keys.includes(column.columnName)) {
        keys.push(column.columnName);
      }
    });
  }

  return keys;
}
export function mergeAndRemoveDuplicates(array1, array2) {
  // Filter out elements from array2 that already exist in array1
  const uniqueArray2 = array2.filter((item) => !array1.includes(item));

  // Concatenate array1 and unique elements of array2
  return array1.concat(uniqueArray2);
}
export const GetUniqueColumns = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let sheetId = req.body.sheetId || null;
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let keys = [];
      if (sheetId) {
        keys = await GetColumnsInSheet(sheetId);
      } else {
        // let sheetIds = []
        let sheets = await db.LeadSheetModel.findAll({
          where: {
            userId: user.id,
          },
        });
        if (sheets && sheets.length > 0) {
          for (const sheet of sheets) {
            let sheetKeys = await GetColumnsInSheet(sheet.id);
            keys = mergeAndRemoveDuplicates(keys, sheetKeys);
          }
        }
      }

      return res.send({
        status: true,
        data: keys,
        message: "Key columns list",
      });
    } else {
    }
  });
};

export const GetUniqueTags = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      // let l = req.body.sheetId || null;
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let leads = await db.LeadModel.findAll({
        where: {
          userId: user.id,
          status: "active",
        },
      });
      let leadIds = [];
      if (leads && leads.length > 0) leadIds = leads.map((lead) => lead.id);
      let keys = [];
      let leadTags = await db.LeadTagsModel.findAll({
        where: {
          leadId: {
            [db.Sequelize.Op.in]: leadIds,
          },
        },
      });

      keys = [...keys, ...leadTags];

      let pipelineIds = [];
      let pipelines = await db.Pipeline.findAll({
        where: {
          userId: user.id,
        },
      });
      if (pipelines && pipelines.length > 0) {
        pipelineIds = pipelines.map((pipeline) => pipeline.id);
      }
      let stageTags = await db.StageTagModel.findAll({
        where: {
          pipelineStageId: {
            [db.Sequelize.Op.in]: pipelineIds,
          },
        },
      });
      keys = [...keys, ...stageTags];

      let tags = [];
      if (keys && keys.length > 0) {
        keys.map((key) => {
          if (!tags.includes(key.tag)) {
            tags.push(key.tag);
          }
        });
      }

      return res.send({
        status: true,
        data: tags,
        message: "Tags list",
      });
    } else {
    }
  });
};

export const GetCallLogs = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let offset = Number(req.query.offset) || 0;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      try {
        const { name, duration, status, startDate, endDate, stageIds } =
          req.query; // duration in seconds

        // Define filters
        const filters = {};

        if (name) {
          filters[Op.or] = [
            { "$LeadModel.firstName$": { [Op.like]: `%${name}%` } },
            { "$LeadModel.lastName$": { [Op.like]: `%${name}%` } },
          ];
        }

        if (duration) {
          const [minDuration, maxDuration] = duration.split("-");
          filters.duration = {
            [Op.gte]: parseFloat(minDuration) || 0,
            [Op.lte]: parseFloat(maxDuration) || Number.MAX_SAFE_INTEGER,
          };
        }

        if (status) {
          filters.status = { [Op.like]: `%${status}%` };
        }

        if (startDate && endDate) {
          filters.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          };
        }

        if (stageIds) {
          const stagesArray = stageIds
            .split(",")
            .map((id) => parseInt(id.trim(), 10));
          filters.stage = { [Op.in]: stagesArray };
        }

        // Query to fetch call logs
        const callLogs = await db.LeadCallsSent.findAll({
          where: filters,
          order: [["createdAt", "DESC"]],
          offset: offset,
          limit: limit,
          include: [
            {
              model: db.LeadModel,
              as: "LeadModel",
              where: {
                userId,
              },
            },
            {
              model: db.PipelineStages,
              as: "PipelineStages",
            },
          ],
        });

        // Map and format the data
        // const formattedCalls = callLogs.map((call) => {
        //   const minutes = Math.floor(call.duration / 60);
        //   const seconds = call.duration % 60;
        //   const formattedDuration = `${String(minutes).padStart(
        //     2,
        //     "0"
        //   )}:${String(seconds).padStart(2, "0")}`;

        //   return {
        //     ...call.dataValues, // Include existing call data
        //     durationFormatted: formattedDuration,
        //   };
        // });

        let callsWithCompleteData = [];
        callLogs.map((call) => {
          if (call.leadId != null) {
            callsWithCompleteData.push(call);
          }
        });

        let callRes = await LeadCallResource(callsWithCompleteData);
        return res.status(200).json({ success: true, data: callRes });
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
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }
  });
};

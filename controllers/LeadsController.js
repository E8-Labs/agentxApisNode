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
import LeadImportantCallResource from "../resources/LeadImportantCallResource.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { AddNotification } from "./NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import parsePhoneNumberFromString from "libphonenumber-js";
import ZapierLeadResource from "../resources/ZapierLeadResource.js";
import { time } from "console";
import { DateTime } from "luxon";
import { UserRole, UserTypes } from "../models/user/userModel.js";
import { ChargeTypes } from "../models/user/payment/paymentPlans.js";
import { chargeUser } from "../utils/stripe.js";
const limit = 30;
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

function isValidInternationalPhoneNumber(number, countryCode = null) {
  const phoneNumber = parsePhoneNumberFromString(number, countryCode);
  return phoneNumber ? phoneNumber.isValid() : false;
}

export function GetFirstAndLastName(name) {
  if (!name || typeof name !== "string") {
    return { firstName: "", lastName: "" }; // Handle empty or non-string input
  }

  let nameParts = name.trim().split(/\s+/); // Split by spaces (handles multiple spaces)

  return {
    firstName: nameParts[0] || "", // First word is firstName
    lastName: nameParts.slice(1).join(" ") || "", // Rest as lastName
  };
}

//Updated For Team
export const AddLeads = async (req, res) => {
  let { sheetName, columnMappings, leads, tags, enrich = false } = req.body; // mainAgentId is the mainAgent id
  sheetName = sheetName.trim();
  if (req.body.mainAgentIds) {
    console.log("Main agent ids", req.body.mainAgentIds);
    let checkData = await checkStageConflicts(req.body.mainAgentIds);
    console.log("Check data");
    console.log(checkData);
    if (checkData.status == false) {
      return res.status(403).send(checkData);
    }
  }

  let zap = false;
  if (req.headers["user-agent"] == "Zapier") {
    zap = true;
  }
  console.log("Headers are ", req.headers);
  console.log("Zap is true", zap);

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)

      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);
      user = admin;
      let teamIds = await GetTeamIds(user);

      console.log("User role ", user.userRole);
      if (user.userType) {
        if (user.userType.toLowerCase() == UserTypes.Admin.toLowerCase()) {
          userId = req.body.userId;
          console.log("This is admin adding leads for other user", userId);
          user = await db.User.findOne({
            where: {
              id: userId,
            },
          });
        }
      }

      if (enrich) {
        //charge for enrich
        let amount = 100; //cents
        if (leads.length > 10) {
          amount = 10 * leads.length; // 10 cents per lead
        }

        let charge = await chargeUser(
          user.id,
          amount,
          `Lead Enrichment payment`,
          ChargeTypes.LeadEnrichmentBatch,
          false,
          req
        );
        console.log("Charge is ", charge);
        if (charge && charge.status) {
          console.log("Enrichment payment Success: ", amount / 100);
          let historyCreated = await db.PaymentHistory.create({
            title: `Lead Enrichment`,
            description: `Lead Enrichment Payment for ${leads.length} leads`,
            type: ChargeTypes.LeadEnrichmentBatch,
            price: amount / 100,
            userId: user.id,
            environment: process.env.Environment,
            transactionId: charge.paymentIntent.id,
          });
        } else {
          enrich = false;
        }
      }
      let leadsCountBefore = await db.LeadModel.count({
        where: {
          userId: user.id,
        },
      });
      // let admin = await GetTeamAdminFor(user);
      // let teamIds = await GetTeamIds(user);
      user = admin;
      let sheet = await db.LeadSheetModel.findOne({
        where: {
          sheetName: sheetName,
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
          status: "active",
        },
      });
      if (!sheet) {
        sheet = await db.LeadSheetModel.create({
          sheetName: sheetName,
          userId: admin.id,
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
      if (sheet.status == "deleted") {
        //if the sheet is deleted then update the status to active again if the new leads are appended to that sheet
        //
        sheet.status = "active";
        await sheet.save();
      }

      let dbLeads = [];
      for (let i = 0; i < leads.length; i++) {
        let lead = leads[i];
        let extraColumns = lead.extraColumns;
        if (extraColumns == "" || extraColumns == null) {
          extraColumns = {};
        }
        lead.extraColumns = null;
        if (typeof lead.fullName !== "undefined" && lead.fullName !== null) {
          if (!lead.firstName && !lead.lastName) {
            let nameParts = lead.fullName.trim().split(" ");
            lead.firstName = nameParts[0];
            lead.lastName =
              nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          }
        } else {
          // console.log("No full name");
        }
        if (
          typeof lead.firstName == "undefined" ||
          lead.firstName == null ||
          typeof lead.phone == "undefined" ||
          lead.phone == null
        ) {
          // console.log("Lead not created ", lead);
        } else {
          // console.log("LeadPhone", lead.phone);
          if (
            typeof lead.lastName == "undefined" ||
            lead.lastName == null ||
            lead.lastName == ""
          ) {
            //try to parse from first name
            // console.log(
            //   "No last name. Checking if first name has the last name"
            // );
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
            // console.log("Phone doesn't start with 1");
            lead.phone = "+1" + lead.phone;
          }
          if (!lead.phone.startsWith("+")) {
            // console.log("Phone Not starts with +1");
            lead.phone = "+" + lead.phone;
          }
          // console.log(lead);

          if (
            isValidInternationalPhoneNumber(lead.phone)
            // lead.phone.length == 11 ||
            // (lead.phone.length == 12 && lead.phone.startsWith("+"))
          ) {
            // only push the lead if the number is valid

            // console.log("Lead phone is ", lead.phone);
            try {
              if (lead.lastName == null) {
                lead.lastName = "";
              }
              let createdLead = await db.LeadModel.create({
                ...lead,
                extraColumns: JSON.stringify(extraColumns),
                userId: admin.id,
                sheetId: sheet.id,
                enrich: enrich,
              });
              dbLeads.push(createdLead);
              if (tags) {
                for (const tag of tags) {
                  let tagCreated = await db.LeadTagsModel.create({
                    tag: tag,
                    leadId: createdLead.id,
                  });
                }
              }
            } catch (error) {
              console.log("Error adding one lead", error);
            }
          } else {
            console.log("Invalid phone ", lead.firstName);
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
            admin,
            pipelineId,
            leadIds,
            ids,
            req.body.startTimeDifFromNow || 0,
            req.body.batchSize || 50,
            zap
          );
        }
      }

      let leadsRes = await LeadResource(dbLeads);
      let zapLeadRes = await ZapierLeadResource(dbLeads);
      // console.log("Zap ", zapLeadRes);
      //call the api for webhook of this user
      if (dbLeads.length > 0) {
        await postDataToWebhook(
          admin,
          zapLeadRes,
          WebhookTypes.TypeNewLeadAdded
        );
      }
      //Send First Lead Notification
      if (leadsCountBefore == 0) {
        //send now

        await AddNotification(
          admin,
          null,
          NotificationTypes.FirstLeadUpload,
          null,
          null,
          null,
          null,
          0,
          0,
          null,
          null
        );
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
//Updated For Team
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
      let leadUpdated = await db.LeadModel.update(
        { stage: null },
        {
          where: {
            id: leadId,
          },
        }
      );
      // }

      res.send({
        status: true,
        message: `Lead deleted`,
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

export const postDataToWebhook = async (
  user,
  data,
  action = WebhookTypes.TypeNewLeadAdded
) => {
  // console.log("Zap ", data);
  let ids = await GetTeamIds(user);
  let webhooks = await db.WebhookModel.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.in]: ids,
      },
      action: action, //WebhookTypes.TypeNewLeadAdded,
    },
  });
  // console.log("Action ", action);
  // console.log("Found webhooks ", webhooks.length);
  if (webhooks && webhooks.length > 0) {
    for (const webhook of webhooks) {
      if (webhook.type == WebhookTypes.TypeStageChange) {
        if (webhook.stageIds != null) {
          let stageIds = webhook.stageIds;

          const stageIdsArray = stageIds.split(",").map(Number);
          if (webhook.sheetId != null) {
            //check if lead is in the same sheet that webhook udpates the data for
            if (webhook.sheetId != data.sheetId) {
              continue;
            }
          }
          if (!stageIdsArray.includes(data.stage)) {
            //Don't call webhook
            continue;
          }
        }
      }
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

//Or sheet: Updated For Team
export const AddSmartList = async (req, res) => {
  let { sheetName, columns, tags, inbound } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (user.userType) {
        if (user.userType.toLowerCase() == UserTypes.Admin.toLowerCase()) {
          userId = req.body.userId;
          console.log("This is admin adding smartlist for other user", userId);
          user = await db.User.findOne({
            where: {
              id: userId,
            },
          });
        }
      }

      let admin = await GetTeamAdminFor(user);
      user = admin;

      let sheet = await db.LeadSheetModel.create({
        sheetName: sheetName,
        userId: admin.id,
        type: inbound ? "inbound" : "general",
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

//Or sheet: Updated For Team
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
//Updated For Team
export const DeleteLeadTag = async (req, res) => {
  let { tag, leadId } = req.body; // mainAgentId is the mainAgent id

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      if (leadId && tag) {
        // if (tagId) {
        let deleted = await db.LeadTagsModel.destroy({
          where: {
            leadId: leadId,
            tag: tag,
          },
        });
        // } else {
        //   let deleted = await db.LeadTagsModel.destroy({
        //     where: {
        //       tag: tag,
        //     },
        //   });
        // }
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

//Updated For Team
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
        await db.LeadModel.update(
          { status: "deleted", stage: null },
          {
            where: {
              sheetId: sheetId,
            },
          }
        );
        const leads = await db.LeadModel.findAll({
          where: {
            sheetId: sheetId,
          },
        });
        let leadIds = [];
        if (leads.length > 0) {
          leadIds = leads.map((lead) => lead.id);
        }
        await db.LeadCadence.update(
          { status: "Paused" },
          {
            where: {
              leadId: {
                [db.Sequelize.Op.in]: leadIds,
              },
            },
          }
        );
        await db.LeadSheetModel.update(
          { status: "deleted" },
          {
            where: {
              id: sheetId,
            },
          }
        );
        return res.send({
          status: true,
          message: `Sheet deleted`,
          data: null,
        });
      } else {
        return res.send({
          status: false,
          message: `No such sheet`,
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

//Updated For Team
export const GetSheets = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      if (req.query.userId) {
        userId = req.query.userId;
      }
      let admin = req.admin;
      console.log("Admin is ", admin?.id);
      console.log("Current User is ", userId);

      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let teamIds = await GetTeamIds(user);
      console.log("Team ids ", teamIds);
      // teamIds = [...teamIds, ...userIds];
      let leadSheets = await db.LeadSheetModel.findAll({
        where: {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
          status: "active",
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
//Updated For Team

export async function AddOrUpdateTag(tag, lead) {
  console.log("Adding tag to lead", tag);
  let existingTag = await db.LeadTagsModel.findOne({
    where: {
      leadId: lead.id,
      tag: tag,
    },
  });

  if (existingTag) {
    // Update the tag if needed (e.g., add more properties or update fields if applicable)
    await existingTag.update({
      updatedAt: new Date(), // Example of updating a timestamp field
    });
  } else {
    // Add the new tag if it doesn't exist
    await db.LeadTagsModel.create({
      leadId: lead.id,
      tag: tag,
    });
  }
}
export async function AddTagsFromCustoStageToLead(lead, stage) {
  //set stage tags to lead
  let stageTags = await db.StageTagModel.findAll({
    where: {
      pipelineStageId: stage.id,
    },
  });

  let teamsAssigned = await db.TeamStageAssignModel.findAll({
    where: {
      stageId: stage.id,
    },
  });
  // console.log("All Teams ", teamsAssigned);
  if (teamsAssigned && teamsAssigned.length > 0) {
    for (const team of teamsAssigned) {
      // console.log("Assigning ", team.userId);
      // console.log("To lead ", lead.id);
      // console.log("Team is ", team.get().userId);
      let alreadyAssigned = await db.TeamLeadAssignModel.findOne({
        where: {
          userId: team.userId,
          leadId: lead.id,
        },
      });
      if (alreadyAssigned) {
        console.log("Already assigned the team to lead");
      } else {
        await db.TeamLeadAssignModel.create({
          leadId: lead.id,
          userId: team.userId,
          fromStage: false,
        });
      }
    }
  }
  if (stageTags && stageTags.length > 0) {
    for (const t of stageTags) {
      // let exists = await db.LeadTa
      await AddOrUpdateTag(t.tag, lead);
    }
  }
}
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

      let stage = await db.PipelineStages.findByPk(stageId);

      console.log("Lead id ", leadId);
      console.log("Stage id ", stageId);
      let lead = await db.LeadModel.findOne({
        where: {
          id: leadId,
          // userId: user.id,
          status: "active",
        },
      });

      if (lead) {
        lead.stage = stageId;
        if (stage.stageId == null) {
          await AddTagsFromCustoStageToLead(lead, stage);
        }
        await lead.save();
        let resource = await LeadResource(lead);
        let zapLeadRes = await ZapierLeadResource(lead);

        postDataToWebhook(user, [zapLeadRes], WebhookTypes.TypeStageChange);
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

//Updated For Team
export function getFilteredQuery(req, userId, type = "post") {
  let data = req.body;
  if (type == "get") {
    data = req.query;
  }
  let { sheetId, stageIds, fromDate, toDate, noStage, search } = data; // Fetching query parameters

  const leadFilters = { sheetId, status: "active" };
  if (fromDate && toDate) {
    const adjustedFromDate = new Date(fromDate);
    adjustedFromDate.setHours(0, 0, 0, 0);

    // Set endDate to the end of the day (23:59:59.999)
    const adjustedToDate = new Date(toDate);
    adjustedToDate.setHours(23, 59, 59, 999);
    let dates = [adjustedFromDate, adjustedToDate];
    console.log("Dates ", dates);
    leadFilters.createdAt = {
      [db.Sequelize.Op.between]: dates,
    };
  }
  if (stageIds && stageIds != "") {
    console.log("No stage ", noStage);
    if (noStage == "true" || noStage == 1 || noStage == true) {
      leadFilters.stage = {
        [db.Sequelize.Op.or]: [
          { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) }, // Matches stage IDs
          { [db.Sequelize.Op.is]: null }, // Matches null values
        ],
      };
    } else {
      leadFilters.stage = {
        [db.Sequelize.Op.in]: stageIds.split(",").map(Number),
      };
    }
  } else if (noStage == "true" || noStage == 1 || noStage == true) {
    leadFilters.stage = {
      [db.Sequelize.Op.or]: [
        // { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) }, // Matches stage IDs
        { [db.Sequelize.Op.is]: null }, // Matches null values
      ],
    };
  }
  if (search) {
    leadFilters[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  if (sheetId) {
    leadFilters["sheetId"] = sheetId;
  }

  return leadFilters;
}
export const GetLeads = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized",
      });
    }

    let zap = false;
    if (req.headers["user-agent"] == "Zapier") {
      zap = true;
    }
    console.log("Headers are ", req.headers);
    console.log("Zap is true", zap);
    if (authData) {
      try {
        const { sheetId, stageIds, fromDate, toDate, noStage, search } =
          req.query; // Fetching query parameters

        console.log("Sheet id is ", sheetId);
        if (!sheetId || typeof sheetId == "undefined") {
          return res.send({
            status: false,
            data: null,
            message: "Sheet id is required",
          });
        }
        let userId = authData.user.id;
        if (req.query.userId) {
          userId = req.query.userId;
        }
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
          offset,
        });

        // Build filters for leads
        const leadFilters = getFilteredQuery(req, userId, "get"); //{ sheetId, status: "active" };

        // Fetch leads first based on general filters
        const leads = await db.LeadModel.findAll({
          where: leadFilters,
          offset: offset,
          limit: limit,
          order: [["createdAt", "DESC"]],
          // attributes: ["id", "firstName", "lastName", "email", "phone", "stage"], // Adjust attributes as needed
          raw: true, // Return plain objects
        });

        let totalLeadCount = await db.LeadModel.count({
          where: leadFilters,
        });

        if (!leads.length) {
          return res.send({
            status: true,
            data: [],
            message: "No leads found for the given filters",
            leadCount: 0,
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
            "status",
            "enrich",
            "enrichData",
          ];
          // delete lead.status;
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
          // if(key != "status"){
          AllColumns.push({
            title: key,
            isDefault: false,
          });
          // }
        }

        if (zap) {
          let reso = await ZapierLeadResource(leadsWithCadence);
          console.log("Sending zapier resource ", JSON.stringify(reso));
          return res.send({
            status: true,
            data: reso, //leadsWithCadence,
            columns: AllColumns,
            keys: keys,
            message: "Leads list with applied filters",
            leadCount: totalLeadCount,
          });
        } else {
          let reso = await LeadResource(leadsWithCadence);
          return res.send({
            status: true,
            data: reso, //leadsWithCadence,
            columns: AllColumns,
            keys: keys,
            message: "Leads list with applied filters",
            leadCount: totalLeadCount,
          });
        }
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
//Updated For Team
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
        "enrich",
        "enrichData",
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
//Updated For Team
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
      if (!keys.includes(key.trim())) {
        keys.push(key.trim());
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
//Updated For Team
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
      let teamIds = await GetTeamIds(user);
      let keys = [];
      if (sheetId) {
        keys = await GetColumnsInSheet(sheetId);
      } else {
        // let sheetIds = []
        let sheets = await db.LeadSheetModel.findAll({
          where: {
            userId: {
              [db.Sequelize.Op.in]: teamIds,
            },
            status: "active",
          },
        });
        if (sheets && sheets.length > 0) {
          for (const sheet of sheets) {
            let sheetKeys = await GetColumnsInSheet(sheet.id);
            keys = mergeAndRemoveDuplicates(keys, sheetKeys);
          }
        }
      }
      const uniqueArray = [...new Set(keys)];
      console.log("Unique keys ", uniqueArray);
      return res.send({
        status: true,
        data: uniqueArray,
        message: "Key columns list",
      });
    } else {
    }
  });
};
//Updated For Team
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
      let teamIds = await GetTeamIds(user);
      let leads = await db.LeadModel.findAll({
        where: {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
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
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
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
      if (req.query.userId) {
        userId = req.query.userId;
      }
      let user = await db.User.findByPk(userId);
      let offset = Number(req.query.offset) || 0;
      let teamIds = await GetTeamIds(user);
      try {
        const {
          name,
          duration,
          status,
          startDate,
          endDate,
          pipelineId,
          stageIds,
          timezone = "America/Los_Angeles",
        } = req.query; // duration in seconds

        // Define filters for LeadCallsSent
        const callLogFilters = {};

        // Define filters for LeadModel (related model)
        const leadFilters = {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          }, // Ensure the lead belongs to the user
        };

        if (name) {
          leadFilters[Op.or] = [
            { firstName: { [Op.like]: `%${name}%` } },
            { lastName: { [Op.like]: `%${name}%` } },
            { phone: { [Op.like]: `%${name}%` } },
            { email: { [Op.like]: `%${name}%` } },
          ];
        }

        if (stageIds) {
          const stagesArray = stageIds
            .split(",")
            .map((id) => parseInt(id.trim(), 10));
          // leadFilters.stage = { [Op.in]: stagesArray };
          callLogFilters.stage = { [Op.in]: stagesArray };
        }

        if (duration) {
          const [minDuration, maxDuration] = duration.split("-");
          callLogFilters.duration = {
            [Op.gte]: parseFloat(minDuration) || 0,
            [Op.lte]: parseFloat(maxDuration) || Number.MAX_SAFE_INTEGER,
          };
        }

        if (status) {
          const statusArray = status.split(",").map((s) => s.trim()); // Convert to an array
          callLogFilters.callOutcome = { [Op.in]: statusArray }; // Filter for multiple statuses
        }

        const convertToUTC = (dateStr, userTimeZone) => {
          return DateTime.fromFormat(dateStr, "MM-dd-yyyy HH:mm:ss", {
            zone: userTimeZone,
          })
            .toUTC()
            .toJSDate();
        };

        if (startDate && endDate) {
          console.log(`User timezone start date ${timezone}`, startDate);
          const adjustedFromDate = convertToUTC(startDate, timezone);
          // adjustedFromDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
          console.log("Server timezone start date ", adjustedFromDate);

          console.log("User timezone end date ", endDate);
          const adjustedToDate = convertToUTC(endDate, timezone);
          // adjustedToDate.setUTCHours(23, 59, 59, 999); // End of day in UTC
          console.log("Server timezone end date ", adjustedToDate);

          callLogFilters.createdAt = {
            [Op.between]: [adjustedFromDate, adjustedToDate],
          };
        }

        let leadCadIdForPipelines = null;
        if (pipelineId) {
          let leadCad = await db.LeadCadence.findAll({
            where: {
              pipelineId: pipelineId,
            },
          });
          leadCadIdForPipelines = [];
          if (leadCad) {
            leadCadIdForPipelines = leadCad.map((item) => item.id);
          }
          callLogFilters.leadCadenceId = { [Op.in]: leadCadIdForPipelines };
        }

        // Query to fetch call logs
        const callLogs = await db.LeadCallsSent.findAll({
          where: callLogFilters,
          order: [["createdAt", "DESC"]],
          offset: offset,
          limit: limit,
          include: [
            {
              model: db.LeadModel,
              as: "LeadModel",
              where: leadFilters, // Apply the stage filter here
            },
          ],
        });

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
    } else {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }
  });
};

export const GetImportantCalls = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let offset = Number(req.query.offset) || 0;
      let limit = Number(req.query.limit) || 10; // Default limit

      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let teamIds = await GetTeamIds(user);

      try {
        // Query to fetch all agent IDs for the team
        let agentIds = [];
        let agents = await db.AgentModel.findAll({
          where: {
            userId: {
              [db.Sequelize.Op.in]: teamIds,
            },
          },
        });

        if (agents && agents.length > 0) {
          agentIds = agents.map((agent) => agent.id);
        }

        // Fetch call logs, sorted by the latest call timestamp for each lead
        const callLogs = await db.LeadCallsSent.findAll({
          where: {
            agentId: {
              [db.Sequelize.Op.in]: agentIds,
            },
            call_review_worthy: true,
          },
          attributes: [
            "leadId",
            [
              db.Sequelize.fn("MAX", db.Sequelize.col("createdAt")),
              "latestCall",
            ],
          ],
          group: ["leadId"],
          order: [[db.Sequelize.literal("latestCall"), "DESC"]],
          offset: offset,
          limit: limit,
        });

        if (callLogs && callLogs.length > 0) {
          // Extract lead IDs in the sorted order
          let leadIds = callLogs.map((log) => log.leadId);

          // Fetch leads based on the sorted lead IDs
          let leads = await db.LeadModel.findAll({
            where: {
              id: {
                [db.Sequelize.Op.in]: leadIds,
              },
            },
          });

          // Sort leads to match the order of `leadIds` from callLogs
          let sortedLeads = leadIds.map((id) =>
            leads.find((lead) => lead.id === id)
          );

          let leadsRes = await LeadImportantCallResource(sortedLeads);
          return res.send({
            status: true,
            data: leadsRes,
            message: "Lead important calls",
          });
        } else {
          return res.send({
            status: false,
            data: null,
            message: "No important calls found",
          });
        }
      } catch (error) {
        console.error("Error fetching call logs:", error);
        return res.status(500).json({ success: false, error: "Server error" });
      }
    } else {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }
  });
};

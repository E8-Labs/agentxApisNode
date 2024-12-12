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

export const AddLeads = async (req, res) => {
  let { sheetName, columnMappings, leads, tags } = req.body; // mainAgentId is the mainAgent id
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
          let createdLead = await db.LeadModel.create({
            ...lead,
            extraColumns: JSON.stringify(extraColumns),
            userId: userId,
            sheetId: sheet.id,
          });
          dbLeads.push(createdLead);
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
      let leadsRes = await LeadResource(dbLeads);
      res.send({
        status: true,
        message: `${leads.length} new leads added`,
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
        const { sheetId, stageIds, fromDate, toDate } = req.query; // Fetching query parameters
        const userId = authData.user.id;

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

        // Build filters for leads
        const leadFilters = { sheetId };
        if (fromDate && toDate) {
          leadFilters.createdAt = {
            [db.Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
          };
        }
        if (stageIds && stageIds != "") {
          leadFilters.stage = {
            [db.Sequelize.Op.in]: stageIds.split(",").map(Number),
          };
        }

        // Fetch leads first based on general filters
        const leads = await db.LeadModel.findAll({
          where: leadFilters,
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
          { title: "Date", isDefault: true },
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

export async function GetColumnsInSheet(sheetId) {
  let leads = await db.LeadModel.findAll({
    where: {
      sheetId: sheetId,
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

export const GetCallLogs = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      try {
        const { name, duration, status } = req.query; //duration in seconds

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

        // Query to fetch call logs
        const callLogs = await db.LeadCallsSent.findAll({
          where: filters,
          include: [
            {
              model: db.LeadModel,
              as: "LeadModel",
              // attributes: ["firstName", "lastName", "email", "phone"],
            },
            {
              model: db.PipelineStages,
              as: "PipelineStages",
              // attributes: ["stageTitle"],
            },
          ],
          // attributes: [
          //   "duration",
          //   "createdAt",
          //   [db.sequelize.literal("duration / 60"), "callDurationMinutes"],
          // ],
        });

        // Map and format the data
        const formattedCalls = callLogs.map((call) => {
          const minutes = Math.floor(call.duration / 60);
          const seconds = call.duration % 60;
          const formattedDuration = `${String(minutes).padStart(
            2,
            "0"
          )}:${String(seconds).padStart(2, "0")}`;

          return {
            ...call.dataValues, // Include existing call data
            durationFormatted: formattedDuration,
          };
        });

        return res.status(200).json({ success: true, data: formattedCalls });
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

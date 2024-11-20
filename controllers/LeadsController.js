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
import LeadResource from "../resources/LeadResource.js";
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";

export const AddLeads = async (req, res) => {
  let { sheetName, columnMappings, leads } = req.body; // mainAgentId is the mainAgent id

  /* 
  
  lead: {
    extraColumns,
    firstName,
    lastName,
    email,
    phone,
    address,
  }
  */
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
        },
      });
      if (!sheet) {
        sheet = await db.LeadSheetModel.create({
          sheetName: sheetName,
          userId: userId,
        });
      }

      let dbLeads = [];
      for (let i = 0; i < leads.length; i++) {
        let lead = leads[i];
        let extraColumns = lead.extraColumns;
        lead.extraColumns = null;
        let createdLead = await db.LeadModel.create({
          ...lead,
          extraColumns: JSON.stringify(extraColumns),
          userId: userId,
          sheetId: sheet.id,
        });
        dbLeads.push(createdLead);
      }
      let leadsRes = await LeadResource(dbLeads);
      res.send({
        status: true,
        message: `${leads.length} new Leads added`,
        data: leadsRes,
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
            stage: { [db.Sequelize.Op.in]: stageIds.split(",").map(Number) },
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
        for (let i = 0; i < leads.length; i++) {
          let lead = leads[i];
          const cadence = cadenceMap[lead.id];
          let stage = await db.PipelineStages.findOne({
            where: {
              id: cadence ? cadence.stage : lead.stage,
            },
          });
          leadsWithCadence.push({
            ...lead,
            stage: stage, // Use LeadCadence stage if available, else LeadModel stage
            cadenceStatus: cadence ? cadence.status : null, // Cadence status or null
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

        return res.send({
          status: true,
          data: leadsWithCadence,
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

export const GetUniqueColumns = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let sheetId = req.body.sheetId;
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

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

      return res.send({
        status: true,
        data: keys,
        message: "Key columns list",
      });
    } else {
    }
  });
};

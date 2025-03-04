import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { Op, fn, col, literal } from "sequelize";
import axios from "axios";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import UserProfileLiteResource from "../resources/userProfileLiteResource.js";
const limit = 30;
import { UserTypes } from "../models/user/userModel.js";
import AffilitateResource from "../resources/AffiliateResource.js";
import UserProfileAdminResource from "../resources/UserProfileAdminResource.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";
import { getEngagementsData } from "./AdminEngagements.js";
import LeadCallResource from "../resources/LeadCallResource.js";
import LeadCallAdminResource from "../resources/LeadCallAdminResource.js";

export const GetCallLogs = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let offset = Number(req.query.offset) || 0;
      let userId = authData.user.id;
      if (req.query.userId) {
        userId = req.query.userId;
      }
      let user = await db.User.findByPk(userId);
      if (user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access. Only admin can access this",
        });
      }
      try {
        const { name, duration, status, startDate, endDate, stageIds } =
          req.query;

        // Define filters for LeadCallsSent
        const callLogFilters = {};

        // Define filters for AgentModel (related to LeadCallsSent)
        const agentFilters = {};

        // ✅ Debug: Log name filter input
        console.log("🔍 Filtering by Name:", name);

        if (name) {
          callLogFilters.agentId = {
            [db.Sequelize.Op.in]: db.Sequelize.literal(
              `(SELECT id FROM AgentModels WHERE userId IN (SELECT id FROM Users WHERE name LIKE '%${name}%' OR phone LIKE '%${name}%' OR email LIKE '%${name}%'))`
            ),
          };
        }

        if (stageIds) {
          const stagesArray = stageIds
            .split(",")
            .map((id) => parseInt(id.trim(), 10));
          callLogFilters.stage = { [Op.in]: stagesArray };
        }

        if (duration) {
          const [minDuration, maxDuration] = duration.split("-");
          callLogFilters.duration = {
            [Op.gte]: parseFloat(minDuration) || 0,
            [Op.lte]: parseFloat(maxDuration) || Number.MAX_SAFE_INTEGER,
          };
        }

        // if (status) {
        //   callLogFilters.callOutcome = { [Op.like]: `%${status}%` };
        // }
        if (status) {
          const statusArray = status.split(",").map((s) => s.trim()); // Convert to an array
          callLogFilters.callOutcome = { [Op.in]: statusArray }; // Filter for multiple statuses
        }

        if (startDate && endDate) {
          const adjustedFromDate = new Date(startDate);
          adjustedFromDate.setHours(0, 0, 0, 0);

          const adjustedToDate = new Date(endDate);
          adjustedToDate.setHours(23, 59, 59, 999);

          callLogFilters.createdAt = {
            [Op.between]: [adjustedFromDate, adjustedToDate],
          };
        }

        // ✅ Debug: Log Applied Filters
        console.log("🔍 Agent Filters:", agentFilters);
        console.log("🔍 Call Log Filters:", callLogFilters);

        // ✅ Query to fetch call logs
        const callLogs = await db.LeadCallsSent.findAll({
          where: callLogFilters,
          order: [["createdAt", "DESC"]],
          offset: offset,
          limit: limit,
          include: [
            {
              model: db.AgentModel,
              as: "agent", // ✅ Ensure alias is correct
              include: [
                {
                  model: db.User,
                  as: "user", // ✅ Ensure alias is correct for User inside AgentModel
                  where: agentFilters,
                },
              ],
            },
          ],
          logging: console.log, // ✅ Logs final SQL query to debug
        });

        // ✅ Debug: Log Retrieved Data Count
        console.log("✅ Fetched Call Logs Count:", callLogs.length);

        let callRes = await LeadCallAdminResource(callLogs);
        return res.status(200).json({ success: true, data: callRes });
      } catch (error) {
        console.error("❌ Error fetching call logs:", error);
        return res.status(500).json({ success: false, error: "Server error" });
      }
    } else {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }
  });
};

export async function AddMinutesToUser(req, res) {
  // let { name, email, phone, uniqueUrl, officeHoursUrl } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let minutes = Number(req.body.minutes || 0) || 0;
    // let limit = Number(req.query.limit || limit) || limit; // Default limit

    if (authData) {
      let userId = authData.user.id;

      // Fetch user and check role
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (!user) {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access.",
        });
      }
      if (user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access. Only admin can access this",
        });
      }

      let userProfile = await db.User.findByPk(req.body.userId);
      if (userProfile) {
        userProfile.totalSecondsAvailable += minutes * 60;
        await userProfile.save();
      }
      return res.send({
        status: true,
        data: userProfile,
        message: "Minutes added",
      });
    }
  });
}

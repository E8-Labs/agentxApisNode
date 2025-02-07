import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import UserProfileLiteResource from "../resources/userProfileLiteResource.js";
const limit = 50;
import { Op } from "sequelize";
import { UserTypes } from "../models/user/userModel.js";

export async function calculateAvgSessionDuration(db) {
  const sessionTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Fetch all user activity logs sorted by user & time
  const userActivities = await db.UserActivityModel.findAll({
    attributes: ["userId", "createdAt"],
    order: [
      ["userId", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  let totalSessionTime = 0;
  let totalSessions = 0;
  let lastTimestamp = null;
  let sessionStart = null;
  let lastUserId = null;

  userActivities.forEach((activity) => {
    const userId = activity.userId;
    const timestamp = new Date(activity.createdAt).getTime();

    if (userId !== lastUserId) {
      lastUserId = userId;
      lastTimestamp = timestamp;
      sessionStart = timestamp;
      totalSessions++;
    } else {
      const timeDiff = timestamp - lastTimestamp;

      if (timeDiff > sessionTimeout) {
        totalSessionTime += lastTimestamp - sessionStart;
        totalSessions++;
        sessionStart = timestamp;
      }

      lastTimestamp = timestamp;
    }
  });

  if (sessionStart && lastTimestamp) {
    totalSessionTime += lastTimestamp - sessionStart;
  }

  const avgSessionDuration =
    totalSessions > 0
      ? (totalSessionTime / totalSessions / 60000).toFixed(2)
      : "0";

  return { avgSessionDuration: `${avgSessionDuration} min`, totalSessions };
}

export async function calculateAvgDAU(days = 30) {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025); // Start date: Jan 1, 2025

  const dailyUserCounts = await db.UserActivityModel.findAll({
    attributes: [
      [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt")), "date"],
      [
        db.Sequelize.fn(
          "COUNT",
          db.Sequelize.fn("DISTINCT", db.Sequelize.col("userId"))
        ),
        "uniqueUsers",
      ],
    ],
    where: {
      createdAt: { [db.Sequelize.Op.gte]: startDate },
    },
    group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))], // Group by day
  });

  const totalDays = dailyUserCounts.length || days; // Ensure non-zero denominator
  const totalDAU = dailyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.dataValues.uniqueUsers),
    0
  );

  return totalDAU / totalDays; // Average DAU over the period
}

export async function calculateAvgMAU() {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025); // Start date: Jan 1, 2025

  const monthlyUserCounts = await db.UserActivityModel.findAll({
    attributes: [
      [
        db.Sequelize.fn("DATE_FORMAT", db.Sequelize.col("createdAt"), "%Y-%m"),
        "month",
      ],
      [
        db.Sequelize.fn(
          "COUNT",
          db.Sequelize.fn("DISTINCT", db.Sequelize.col("userId"))
        ),
        "uniqueUsers",
      ],
    ],
    where: {
      createdAt: { [db.Sequelize.Op.gte]: startDate },
    },
    group: [
      db.Sequelize.fn("DATE_FORMAT", db.Sequelize.col("createdAt"), "%Y-%m"),
    ], // Group by month
  });

  const totalMonths = monthlyUserCounts.length || 1; // Ensure non-zero denominator
  const totalMAU = monthlyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.dataValues.uniqueUsers),
    0
  );

  return totalMAU / totalMonths; // Average MAU over time
}

export async function fetchUserStats(days = 0, months = 0, years = 0) {
  // Define start date dynamically
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025);

  // Total users (Only "AgentX" role)
  const totalUsers = await db.User.count({
    where: { userRole: "AgentX" },
  });

  // Users on trial & percentage
  const trialUsers = await db.User.count({
    where: {
      isTrial: true,
      createdAt: { [db.Sequelize.Op.gte]: startDate },
      userRole: "AgentX",
    },
  });
  const trialPercentage = (trialUsers / totalUsers) * 100;

  // Active plan users & percentages
  const plans = ["Plan30", "Plan120", "Plan360", "Plan720"];
  const usersOnPlans = {};
  for (const plan of plans) {
    const count = await db.PlanHistory.count({
      where: {
        type: plan,
        status: "active",
        createdAt: { [db.Sequelize.Op.gte]: startDate },
      },
    });
    usersOnPlans[plan] = { count, percentage: (count / totalUsers) * 100 };
  }

  // Unique DAU (Daily Active Users)
  const dailyActiveUsers = await calculateAvgDAU();

  // Unique MAU (Monthly Active Users)
  const monthlyActiveUsers = await calculateAvgMAU();

  const dauPercentage = (dailyActiveUsers / totalUsers) * 100;
  const mauPercentage = (monthlyActiveUsers / totalUsers) * 100;

  // Weekly Signups
  const weeklySignups = await db.User.count({
    where: {
      createdAt: {
        [db.Sequelize.Op.gte]: db.Sequelize.literal(
          "DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
        ),
      },
    },
  });

  // Average Session Duration
  const sessionStats = await calculateAvgSessionDuration(db);
  const avgSessionDuration = sessionStats.avgSessionDuration;

  // Top 3 Most Used Voices (Now with percentage)
  // Fetch top voices while excluding null values
  const voiceCounts = await db.AgentModel.findAll({
    attributes: [
      "voiceId",
      [db.Sequelize.fn("COUNT", db.Sequelize.col("userId")), "count"],
    ],
    where: {
      voiceId: { [db.Sequelize.Op.ne]: null }, // Exclude null voiceId
    },
    group: ["voiceId"],
    order: [[db.Sequelize.literal("count"), "DESC"]],
    limit: 3,
  });

  const totalUsersWithVoice = await db.AgentModel.count({
    where: { voiceId: { [db.Sequelize.Op.ne]: null } }, // Count only users with a voice assigned
  });

  const topVoices = voiceCounts.map((voice) => ({
    voiceId: voice.voiceId,
    count: voice.dataValues.count,
    percentage: ((voice.dataValues.count / totalUsersWithVoice) * 100).toFixed(
      2
    ),
  }));

  // Unique Phone Numbers (Count & Percentage)
  const uniquePhoneUsers = await db.AgentModel.count({
    distinct: true,
    col: "phoneNumber",
  });
  const uniquePhonePercentage = (uniquePhoneUsers / totalUsers) * 100;

  // Users with More than 1 Pipeline
  const usersWithMultiplePipelines = await db.Pipeline.count({
    group: ["userId"],
    having: db.Sequelize.literal("COUNT(userId) > 1"),
  });

  const pipelineUsersPercentage =
    (usersWithMultiplePipelines.length / totalUsers) * 100;

  // Users with More than 2 Agents
  const usersWithMultipleAgents = await db.AgentModel.count({
    group: ["userId"],
    having: db.Sequelize.literal("COUNT(userId) > 2"),
  });

  const agentUsersPercentage =
    (usersWithMultipleAgents.length / totalUsers) * 100;

  // Users Who Have Leads
  const usersWithLeads = await db.LeadModel.count({
    distinct: true,
    col: "userId",
  });

  const leadsUsersPercentage = (usersWithLeads / totalUsers) * 100;

  // Users Who Have Invited Teams
  const usersWithTeams = await db.TeamModel.count({
    distinct: true,
    col: "invitingUserId",
  });

  const teamsUsersPercentage = (usersWithTeams / totalUsers) * 100;

  // Average Calls Per User
  const totalCalls = await db.LeadCallsSent.count();
  const avgCallsPerUser = totalCalls / totalUsers;

  // Users Who Have Added Calendar
  const usersWithCalendars = await db.CalendarIntegration.count({
    distinct: true,
    col: "userId",
  });

  const calendarUsersPercentage = (usersWithCalendars / totalUsers) * 100;

  // Call Success Rate
  const totalCallsMade = await db.LeadCallsSent.count();
  const failedCalls = await db.LeadCallsSent.count({
    where: { status: "failed" },
  });

  const callSuccessRate =
    totalCallsMade > 0
      ? ((totalCallsMade - failedCalls) / totalCallsMade) * 100
      : 0;

  // Return formatted data
  return {
    totalUsers,
    trialUsers: { count: trialUsers, percentage: trialPercentage },
    usersOnPlans,
    activeUsers: {
      DAU: { count: dailyActiveUsers, percentage: dauPercentage },
      MAU: { count: monthlyActiveUsers, percentage: mauPercentage },
    },
    weeklySignups,
    avgSessionDuration: `${avgSessionDuration} min`,
    topVoices,
    uniquePhoneUsers: {
      count: uniquePhoneUsers,
      percentage: uniquePhonePercentage,
    },
    pipelineUsers: {
      count: usersWithMultiplePipelines.length,
      percentage: pipelineUsersPercentage,
    },
    agentUsers: {
      count: usersWithMultipleAgents.length,
      percentage: agentUsersPercentage,
    },
    leadsUsers: { count: usersWithLeads, percentage: leadsUsersPercentage },
    teamsUsers: { count: usersWithTeams, percentage: teamsUsersPercentage },
    avgCallsPerUser,
    calendarUsers: {
      count: usersWithCalendars,
      percentage: calendarUsersPercentage,
    },
    callSuccessRate,
  };
}

export async function GetAdminStats(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
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

      let stats = await fetchUserStats();
      return res.send({ status: true, message: "Admin stats", data: stats });
    }
  });
}
export async function GetUsers(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
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

      // Search parameter
      let searchQuery = req.query.search ? req.query.search.trim() : "";

      let whereCondition = {
        userRole: "AgentX",
        userType: {
          [db.Sequelize.Op.notIn]: [UserTypes.Admin],
        },
      };

      if (searchQuery) {
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${searchQuery}%` } }, // Case-insensitive LIKE
          { phone: { [Op.like]: `%${searchQuery}%` } },
          { name: { [Op.like]: `%${searchQuery}%` } },
        ];
      }

      let users = await db.User.findAll({
        where: whereCondition,
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: offset,
      });

      let resource = await UserProfileLiteResource(users);

      return res.send({
        status: true,
        message: "Users list",
        data: resource,
        offset: offset,
        limit: limit,
      });
    }
  });
}

export async function GetAffiliates(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
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

      let affiliates = await db.CampaigneeModel.findAll();

      return res.send({ status: true, data: affiliates });
    }
  });
}

export async function AddAnAffiliate(req, res) {
  let { name, email, phone, uniqueUrl, officeHoursUrl } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
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

      let affiliate = await db.CampaigneeModel.create({
        name: name,
        email: email,
        phone: phone,
        status: "Active",
        officeHoursUrl: officeHoursUrl,
        uniqueUrl: uniqueUrl,
      });

      return res.send({
        status: true,
        data: affiliate,
        message: "Affiliate created",
      });
    }
  });
}

export async function DeleteAnAffiliate(req, res) {
  let { id } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
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

      let affiliateDel = await db.CampaigneeModel.destroy({
        where: {
          id: id,
        },
      });

      return res.send({
        status: true,
        data: affiliateDel,
        message: "Affiliate deleted",
      });
    }
  });
}

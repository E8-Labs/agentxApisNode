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

const User = db.User;
const PlanHistory = db.PlanHistory;
const AgentModel = db.AgentModel;
const LeadCallsSent = db.LeadCallsSent;
const { Sequelize } = db;

const LeadModel = db.LeadModel;

/**
 * Gets active users (users with an active plan) within a given period.
 * @param {Date} startDate - Start date for filtering.
 * @param {Date} endDate - End date for filtering.
 * @returns {Promise<number[]>} - Array of active user IDs.
 */
async function getActiveUserIds(startDate, endDate) {
  const activeUsers = await PlanHistory.findAll({
    attributes: ["userId"],
    where: {
      status: "active",
      updatedAt: { [Op.between]: [startDate, endDate] }, // Users with an active plan within the period
    },
    group: ["userId"],
    raw: true,
  });

  return activeUsers.map((entry) => entry.userId);
}

/**
 * Calculates the percentage of active users who have added an agent.
 */
export async function calculateUsersWithAgentsPercentage(startDate, endDate) {
  const activeUserIds = await getActiveUserIds(startDate, endDate);
  const activeUsersCount = activeUserIds.length;

  if (activeUsersCount === 0) return 0; // Avoid division by zero

  const usersWithAgentsCount = await AgentModel.count({
    distinct: true,
    col: "userId",
    where: {
      userId: { [Op.in]: activeUserIds },
      createdAt: { [Op.between]: [startDate, endDate] },
    },
  });

  return {
    usersWithAgentsCount: parseFloat(
      ((usersWithAgentsCount / activeUsersCount) * 100).toFixed(2)
    ),
    total: usersWithAgentsCount,
  };
}

/**
 * Calculates the percentage of active users who have made at least one call.
 */
export async function calculateUsersWhoSentCallsPercentage(startDate, endDate) {
  const activeUserIds = await getActiveUserIds(startDate, endDate);
  const activeUsersCount = activeUserIds.length;

  if (activeUsersCount === 0) return 0; // Avoid division by zero

  let agents = await db.AgentModel.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.in]: activeUserIds,
      },
    },
  });
  let agentIds = [];

  if (agents && agents.length > 0) {
    agentIds = agents.map((item) => item.id);
  }
  console.log("Agents of active users", agentIds);
  const usersWhoSentCallsCount = await LeadCallsSent.count({
    distinct: true,
    col: "agentId",
    where: {
      agentId: { [Op.in]: agentIds },
      createdAt: { [Op.between]: [startDate, endDate] },
    },
  });

  return {
    usersWhoSentCallsCount: parseFloat(
      ((usersWhoSentCallsCount / activeUsersCount) * 100).toFixed(2)
    ),
    total: usersWhoSentCallsCount,
  };
}

/**
 * Calculates the percentage of active users who have added at least one lead.
 */
export async function calculateUsersWithLeadsPercentage(startDate, endDate) {
  const activeUserIds = await getActiveUserIds(startDate, endDate);
  const activeUsersCount = activeUserIds.length;

  if (activeUsersCount === 0) return 0; // Avoid division by zero

  const usersWithLeadsCount = await LeadModel.count({
    distinct: true,
    col: "userId",
    where: {
      userId: { [Op.in]: activeUserIds },
      createdAt: { [Op.between]: [startDate, endDate] },
    },
  });

  return {
    usersWithLeadsCount: parseFloat(
      ((usersWithLeadsCount / activeUsersCount) * 100).toFixed(2)
    ),
    total: usersWithLeadsCount,
  };
}

// 1. Calculate Retention Rate
const calculateRetentionRate = async (startDate, endDate) => {
  // Users at the start of the period
  let activeUserIdsAtStart = await getActiveUserIds(
    new Date("2025-01-01"),
    startDate
  );
  const startUsers = await User.count({
    where: {
      id: {
        [db.Sequelize.Op.in]: activeUserIdsAtStart,
      },
    },
  });
  console.log("Users at start ", startUsers);

  let activeUserIdsAtEnd = await getActiveUserIds(
    new Date("2025-01-01"),
    endDate
  );

  // Users at the end of the period
  const endUsers = await User.count({
    where: {
      id: {
        [db.Sequelize.Op.in]: activeUserIdsAtEnd,
      },
    },
  });
  console.log("Users at end ", endUsers);

  // New users with active plans in the period
  const newUsersWithActivePlan = await PlanHistory.count({
    where: {
      createdAt: { [Op.between]: [startDate, endDate] },
      status: "active",
    },
  });
  console.log("New users", newUsersWithActivePlan);

  if (startUsers === 0) return 0; // Avoid division by zero

  const retentionRate =
    (100 * (endUsers - newUsersWithActivePlan)) / startUsers;
  return retentionRate.toFixed(2);
};

// 2. Calculate Total Users with Active Plans
const countActiveUsers = async (startDate, endDate) => {
  const activeUsers = await PlanHistory.findAll({
    attributes: ["userId"],
    where: {
      status: "active",
      updatedAt: { [Op.between]: [startDate, endDate] },
    },
    group: ["userId"], // Ensure we count unique users
  });

  return activeUsers.length;
};

// 3. Calculate Churn Rate
export async function calculateChurnRate(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  // Get total unique active users at the start of the period
  const activeUsersAtStart = await PlanHistory.count({
    distinct: true,
    col: "userId",
    where: {
      status: "active",
      updatedAt: { [Op.lte]: startDate },
    },
  });

  console.log("ChurnRate: Active Users at start: ", activeUsersAtStart);

  if (activeUsersAtStart === 0) return 0; // Avoid division by zero

  // Get unique users who lost their plan (cancelled)
  const usersLost = await PlanHistory.count({
    distinct: true,
    col: "userId",
    where: {
      updatedAt: { [Op.between]: [startDate, endDate] },
      status: "cancelled",
    },
  });
  console.log("ChurnRate: Lost Users : ", usersLost);

  const churnRate = (usersLost / activeUsersAtStart) * 100;
  return parseFloat(churnRate.toFixed(2));
}

// 4. Cohort Retention Rate
const calculateCohortRetention = async (startDate, endDate) => {
  // total users in each month in the given period
  const cohorts = await User.findAll({
    attributes: [
      [
        Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m"),
        "signupMonth",
      ],
      [Sequelize.fn("COUNT", Sequelize.col("id")), "totalUsers"],
    ],
    where: {
      createdAt: { [Op.between]: [startDate, endDate] },
    },
    group: ["signupMonth"],
    raw: true,
  });

  let cohortRetention = [];

  //Get users with active plan in each month and divide by total cohort users * 100 to get perc
  for (const cohort of cohorts) {
    const retainedUsers = await PlanHistory.count({
      where: {
        userId: {
          [Op.in]: Sequelize.literal(
            `(SELECT id FROM Users WHERE DATE_FORMAT(createdAt, '%Y-%m') = '${cohort.signupMonth}')`
          ),
        },
        status: "active",
        updatedAt: { [Op.between]: [startDate, endDate] },
      },
    });

    cohortRetention.push({
      signupMonth: cohort.signupMonth,
      totalUsers: cohort.totalUsers,
      retainedUsers,
      retentionRate: ((retainedUsers / cohort.totalUsers) * 100).toFixed(2),
    });
  }

  return cohortRetention;
};

// 5. Stickiness Ratio (DAU/MAU)
export async function calculateStickinessRatio(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

  // Get Average DAU and MAU
  const avgDAU = await calculateAvgDAU(startDate, endDate);
  const avgMAU = await calculateAvgMAU(startDate, endDate);

  if (avgMAU === 0) return 0; // Prevent division by zero

  const stickinessRatio = (avgDAU / avgMAU) * 100;
  return parseFloat(stickinessRatio.toFixed(2));
}

export async function calculateAvgDAU(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

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
      createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] },
    },
    group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))],
    raw: true,
  });

  const totalDays =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
  const totalDAU = dailyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.uniqueUsers),
    0
  );

  return parseFloat((totalDAU / totalDays).toFixed(2));
}

export async function calculateAvgMAU(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error("Start date and end date are required");
  }

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
      createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] },
    },
    group: [
      db.Sequelize.fn("DATE_FORMAT", db.Sequelize.col("createdAt"), "%Y-%m"),
    ],
    raw: true,
  });

  const totalMonths =
    new Set(monthlyUserCounts.map((entry) => entry.month)).size || 1;
  const totalMAU = monthlyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.uniqueUsers),
    0
  );

  return parseFloat((totalMAU / totalMonths).toFixed(2));
}

// Running all calculations with a given date range
export const getEngagementsData = async (startDate, endDate) => {
  try {
    console.log(`Analytics for period: ${startDate} to ${endDate}`);

    const retentionRate = await calculateRetentionRate(startDate, endDate);
    const activeUsers = await countActiveUsers(startDate, endDate);
    const churnRate = await calculateChurnRate(startDate, endDate);
    const cohortRetention = await calculateCohortRetention(startDate, endDate);
    const stickinessRatio = await calculateStickinessRatio(startDate, endDate);

    const usersWithAgentsPercentage = await calculateUsersWithAgentsPercentage(
      startDate,
      endDate
    );
    const usersWhoSentCallsPercentage =
      await calculateUsersWhoSentCallsPercentage(startDate, endDate);
    const usersWithLeadsPercentage = await calculateUsersWithLeadsPercentage(
      startDate,
      endDate
    );

    console.log(
      `Percentage of Active Users with Agents: ${usersWithAgentsPercentage}%`
    );
    console.log(
      `Percentage of Active Users Who Sent Calls: ${usersWhoSentCallsPercentage}%`
    );
    console.log(
      `Percentage of Active Users with Leads: ${usersWithLeadsPercentage}%`
    );

    console.log("Retention Rate:", retentionRate + "%");
    console.log("Total Active Users:", activeUsers);
    console.log("Churn Rate:", churnRate + "%");
    console.log("Cohort Retention:", cohortRetention);
    console.log("Stickiness Ratio:", stickinessRatio + "%");

    return {
      retentionRate,
      activeUsers,
      churnRate,
      cohortRetention,
      stickinessRatio,
      usersWithAgentsPercentage,
      usersWhoSentCallsPercentage,
      usersWithLeadsPercentage,
    };
  } catch (error) {
    console.error("Error in analytics:", error);
  }
};

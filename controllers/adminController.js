import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { Op } from "sequelize";
import axios from "axios";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import UserProfileLiteResource from "../resources/userProfileLiteResource.js";
const limit = 30;
import { UserTypes } from "../models/user/userModel.js";
import AffilitateResource from "../resources/AffiliateResource.js";
import UserProfileAdminResource from "../resources/UserProfileAdminResource.js";
import { PayAsYouGoPlanTypes } from "../models/user/payment/paymentPlans.js";

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
      : "0.00";

  return { avgSessionDuration: `${avgSessionDuration} min`, totalSessions };
}

export async function calculateAvgDAU(days = 30) {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025);

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
    group: [db.Sequelize.fn("DATE", db.Sequelize.col("createdAt"))],
  });

  const totalDays = dailyUserCounts.length || days;
  const totalDAU = dailyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.dataValues.uniqueUsers),
    0
  );

  return parseFloat((totalDAU / totalDays).toFixed(2));
}

export async function calculateAvgMAU() {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025);

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
    ],
  });

  const totalMonths = monthlyUserCounts.length || 1;
  const totalMAU = monthlyUserCounts.reduce(
    (sum, entry) => sum + parseInt(entry.dataValues.uniqueUsers),
    0
  );

  return parseFloat((totalMAU / totalMonths).toFixed(2));
}

export async function fetchUserStats(days = 0, months = 0, years = 0) {
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(0);
  startDate.setFullYear(2025);

  const totalUsers = await db.User.count({ where: { userRole: "AgentX" } });

  const trialUsers = await db.User.count({
    where: {
      isTrial: true,
      createdAt: { [db.Sequelize.Op.gte]: startDate },
      userRole: "AgentX",
    },
  });

  const trialPercentage = ((trialUsers / totalUsers) * 100).toFixed(2);

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
    usersOnPlans[plan] = {
      count,
      percentage: ((count / totalUsers) * 100).toFixed(2),
    };
  }

  const dailyActiveUsers = await calculateAvgDAU();
  const monthlyActiveUsers = await calculateAvgMAU();

  const dauPercentage = ((dailyActiveUsers / totalUsers) * 100).toFixed(2);
  const mauPercentage = ((monthlyActiveUsers / totalUsers) * 100).toFixed(2);

  const weeklySignups = await db.User.count({
    where: {
      createdAt: {
        [db.Sequelize.Op.gte]: db.Sequelize.literal(
          "DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
        ),
      },
    },
  });

  const sessionStats = await calculateAvgSessionDuration(db);

  // Unique Phone Numbers
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

  return {
    totalUsers,
    trialUsers: {
      count: trialUsers,
      percentage: Number(trialPercentage).toFixed(2),
    },
    usersOnPlans,
    activeUsers: {
      DAU: {
        count: dailyActiveUsers,
        percentage: Number(dauPercentage).toFixed(2),
      },
      MAU: {
        count: monthlyActiveUsers,
        percentage: Number(mauPercentage).toFixed(2),
      },
    },
    weeklySignups,
    avgSessionDuration: `${sessionStats.avgSessionDuration}`,

    weeklySignups,
    topVoices,
    uniquePhoneUsers: {
      count: uniquePhoneUsers,
      percentage: Number(uniquePhonePercentage).toFixed(2),
    },
    pipelineUsers: {
      count: usersWithMultiplePipelines.length,
      percentage: Number(pipelineUsersPercentage).toFixed(2),
    },
    agentUsers: {
      count: usersWithMultipleAgents.length,
      percentage: Number(agentUsersPercentage).toFixed(2),
    },
    leadsUsers: {
      count: usersWithLeads,
      percentage: Number(leadsUsersPercentage).toFixed(2),
    },
    teamsUsers: {
      count: usersWithTeams,
      percentage: Number(teamsUsersPercentage).toFixed(2),
    },
    avgCallsPerUser: Number(avgCallsPerUser).toFixed(2),
    calendarUsers: {
      count: usersWithCalendars,
      percentage: Number(calendarUsersPercentage).toFixed(2),
    },
    callSuccessRate: Number(callSuccessRate).toFixed(2),
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

export async function calculateSubscriptionStats(duration, month) {
  const startDate = new Date("2025-01-01");
  const endDate = new Date();

  console.log("Duration is ", duration);
  let interval;
  switch (duration) {
    case "weekly":
      interval = "weekly";
      break;
    case "monthly":
      interval = "monthly";
      break;
    case "yearly":
      interval = "yearly";
      break;
    default:
      interval = "monthly";
  }
  console.log("Interval is ", interval);

  // New Subscriptions Over Time by Plan Type
  let planSubscriptionStats = {
    // Plan30: {},
    // Plan120: {},
    // Plan360: {},
    // Plan720: {},
  };
  let allPlans = ["Plan30", "Plan120", "Plan360", "Plan720"];
  for (let plan of allPlans) {
    let planStats = {};
    let date = new Date(startDate);
    while (date <= endDate) {
      let nextDate = new Date(date);
      let label;
      if (interval === "monthly") {
        label = date.toLocaleString("en-US", { month: "short" }); // Jan, Feb, Mar...
        nextDate.setMonth(date.getMonth() + 1, 1);
      } else if (interval === "yearly") {
        label = date.getFullYear().toString(); // Year number
        nextDate.setFullYear(date.getFullYear() + 1, 0, 1);
      } else if (interval === "weekly") {
        const weekNumber =
          Math.ceil((date - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
        label = `Week ${weekNumber} ${date.getFullYear()}`;
        nextDate.setDate(date.getDate() + 7);
      }
      console.log("Label is ", label);

      const count = await db.PlanHistory.count({
        where: {
          createdAt: { [Op.gte]: date, [Op.lt]: nextDate },
          type: plan,
        },
      });
      if (planStats[label]) {
        planStats[label] += count;
      } else {
        planStats[label] = count;
      }
      date = new Date(nextDate);
    }
    planSubscriptionStats[plan] = planStats;
  }

  // Subscription Upgrade Rate
  let upgradeBreakdown = await calculateUpgradeBreakdown(startDate);

  // Plan Cancellations
  let planCancellations = {};
  for (let plan of allPlans) {
    let cancelledCount = await db.PlanHistory.count({
      where: {
        type: plan,
        status: "cancelled",
      },
    });
    planCancellations[plan] = cancelledCount;
  }

  // Fetch All Plans & Trials in a Month
  let monthlyPlanCounts = {};
  if (month) {
    const monthMap = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    let monthNumber = monthMap[month.toLowerCase()] || month;
    let monthStart = new Date(`2025-${monthNumber}-01`);
    let monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    for (let plan of allPlans) {
      let count = await db.PlanHistory.count({
        where: {
          createdAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
          type: plan,
        },
      });
      monthlyPlanCounts[plan] = count;
    }
  }

  // Reactivation Rate
  let reactivationRate = {};
  let reactivatedUsers = await db.PlanHistory.findAll({
    attributes: ["userId"],
    where: {
      status: "reactivated",
    },
    raw: true,
  });
  reactivationRate.count = reactivatedUsers.length;

  // Referral Code Rate
  let referralCodeRate = await db.User.count({
    where: {
      inviteCodeUsed: { [Op.ne]: null },
    },
  });

  return {
    planSubscriptionStats,
    subscription: upgradeBreakdown,
    // planCancellations,
    // monthlyPlanCounts,
    reactivationRate,
    referralCodeRate,
  };
}

async function calculateUpgradeBreakdown(startDate) {
  function GetKeyForUpgrade(fromPlan, toPlan, isTrial) {
    let StartPlan = fromPlan.type;
    if (isTrial) {
      StartPlan = "Trial";
    }

    if (toPlan.type == PayAsYouGoPlanTypes.Plan120Min) {
      return StartPlan + " to Plan120";
    }
    if (toPlan.type == PayAsYouGoPlanTypes.Plan30Min) {
      return StartPlan + " to Plan30";
    }
    if (toPlan.type == PayAsYouGoPlanTypes.Plan120Min) {
      return StartPlan + " to Plan360";
    }
    if (toPlan.type == PayAsYouGoPlanTypes.Plan120Min) {
      return StartPlan + " to Plan720";
    }
  }
  let upgradeBreakdown = {
    "Trial to Plan30": 0,
    "Trial to Plan120": 0,
    "Trial to Plan360": 0,
    "Trial to Plan720": 0,
  };
  let Plans = {
    Plan120: 0,
    Plan30: 0,
    Plan360: 0,
    Plan720: 0,
  };
  let cancellations = {
    trial: 0,
    Plan30: 0,
    Plan120: 0,
    Plan360: 0,
    Plan720: 0,
  };

  let userPlansTrials = await db.PlanHistory.findAll({
    attributes: ["id", "userId", "type", "createdAt", "status"],
    include: [{ model: db.User, attributes: ["isTrial"] }],
    where: {
      createdAt: { [Op.gte]: new Date(startDate) },
      // type: PayAsYouGoPlanTypes.Plan30Min,
    },
    order: [["createdAt", "ASC"]], // Order by oldest first
    group: ["userId"], // Fetch only the first entry for each user
    raw: true,
  });

  console.log(userPlansTrials);
  console.log(`${userPlansTrials.length} started `);

  for (const p of userPlansTrials) {
    console.log("\n\n");
    console.log(
      `Checking if user ${p.userId} upgraded from ${p.type} Id = ${p.id} status = ${p.status}`
    );
    let latestPlan = await db.PlanHistory.findOne({
      where: {
        userId: p.userId,
        // status: "active"
        id: {
          [db.Sequelize.Op.gt]: p.id,
        },
      },
      order: [["createdAt", "DESC"]],
    });

    console.log(`Found Latest Plan ${latestPlan?.type} ${latestPlan?.status}`);
    if (latestPlan) {
      if (latestPlan.status == "active") {
        Plans[latestPlan.type] = (Plans[latestPlan.type] || 0) + 1;
      }
      if (latestPlan.status == "cancelled") {
        cancellations[p.type] = (cancellations[p.type] || 0) + 1;
        console.log("It's a cancelled plan", latestPlan.userId);
      } else {
        //user probably upgraded
        let startDate = new Date(p.createdAt);
        let secondPlanDate = new Date(latestPlan.createdAt);
        let timeDifference = secondPlanDate - startDate;
        let differenceInDays = timeDifference / (1000 * 60 * 60 * 24);
        console.log(`Difference in days: ${differenceInDays}`);
        if (differenceInDays > 7) {
          //Then it will not be upgrade from Trial. It will be upgrade from Plan30
          let key = GetKeyForUpgrade(p, latestPlan, false);
          upgradeBreakdown[key] = (upgradeBreakdown[key] || 0) + 1;
        } else {
          let key = GetKeyForUpgrade(p, latestPlan, true);
          upgradeBreakdown[key] = (upgradeBreakdown[key] || 0) + 1;
        }
      }
    } else {
      //user doesn't have any other plan so let's check if he is active and 7 days have passed or not
      if (p.status == "cancelled") {
        cancellations[p.type] = (cancellations[p.type] || 0) + 1;
        console.log("It's a cancelled plan", p.userId);
      } else {
        if (p.status == "active") {
          Plans[p.type] = (Plans[p.type] || 0) + 1;
        }
        let key = GetKeyForUpgrade(p, p, true);
        upgradeBreakdown[key] = (upgradeBreakdown[key] || 0) + 1;
      }
    }
  }

  console.log("Upgrades ", upgradeBreakdown);
  return { upgradeBreakdown, cancellations, Plans };
}

async function calculateAvgCLV() {
  // Define the date range for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Fetch payments within the last 6 months
  const payments = await db.PaymentHistory.findAll({
    attributes: ["userId", "price"],
    // where: {
    //   createdAt: {
    //     [Op.gte]: sixMonthsAgo,
    //   },
    // },
    raw: true,
  });

  // Calculate total revenue per user
  let userRevenue = 0;
  let userIds = [];
  let uniqueUsers = 0;
  payments.forEach(({ userId, price }) => {
    if (!userIds.includes(userId)) {
      userIds.push(userId);
      uniqueUsers += 1;
    }

    userRevenue += price;
  });
  console.log(`Users ${uniqueUsers} has total ${userRevenue}`);

  // Calculate CLV per user
  // const clvValues = Object.values(userRevenue).map((totalSpent) => {
  //   return (totalSpent / 6) * 6; // Avg per month * 6 months
  // });

  // Compute the overall average CLV
  const avgCLV = (userRevenue / uniqueUsers) * 6;

  return avgCLV.toFixed(2);
}

// Function to calculate Monthly Recurring Revenue (MRR)
async function calculateMRR(plan = null) {
  if (plan) {
    let totalMRR = await db.PaymentHistory.sum("price", {
      where: { type: plan },
    });
    return totalMRR;
  } else {
    let totalMRR = await db.PaymentHistory.sum("price", {
      where: {
        // status: "active",
        // type: {
        //   [db.Sequelize.Op.ne]: "PhonePurchase",
        // },
      },
    });
    return totalMRR.toFixed(2);
  }
}

// Function to calculate Annual Recurring Revenue (ARR)
async function calculateARR() {
  let totalMRR = await calculateMRR();
  return (totalMRR * 12).toFixed(2);
}

// Function to calculate Net Revenue Retention (NRR)
async function calculateNRR(startDate = new Date()) {
  let revenueStart = await db.PlanHistory.sum("price", {
    where: { createdAt: { [Op.lte]: new Date(startDate) } },
  });
  let revenueEnd = await db.PlanHistory.sum("price", {
    where: { status: "active" },
  });
  let lostRevenue = await db.PlanHistory.sum("price", {
    where: { status: "cancelled" },
  });

  return (((revenueEnd - lostRevenue) / revenueStart) * 100).toFixed(2);
}

export async function GetAdminAnalytics(req, res) {
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

      let stats = await calculateSubscriptionStats("monthly", 0, 1);
      stats.clv = await calculateAvgCLV();
      stats.nrr = await calculateNRR();
      stats.mrr = await calculateMRR();
      stats.arr = await calculateARR();
      return res.send({
        status: true,
        message: "Admin analytics",
        data: stats,
      });
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
    let limit = Number(req.query.limit || 30) || 30; // Default limit
    let sort = req.query.sort || "createdAt";
    let sortOrder = req.query.sortOrder || "ASC";

    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findOne({
        where: { id: userId },
      });
      if (!user || user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access.",
        });
      }

      let searchQuery = req.query.search ? req.query.search.trim() : "";
      let whereCondition = {
        userRole: "AgentX",
        userType: { [db.Sequelize.Op.notIn]: [UserTypes.Admin] },
      };

      if (searchQuery) {
        whereCondition[db.Sequelize.Op.or] = [
          { email: { [db.Sequelize.Op.like]: `%${searchQuery}%` } },
          { phone: { [db.Sequelize.Op.like]: `%${searchQuery}%` } },
          { name: { [db.Sequelize.Op.like]: `%${searchQuery}%` } },
        ];
      }

      // Date Range Filter
      if (req.query.fromCreatedDate) {
        if (req.query.toCreatedDate) {
          whereCondition.createdAt = {
            [db.Sequelize.Op.between]: [
              req.query.fromCreatedDate,
              req.query.toCreatedDate,
            ],
          };
        } else {
          whereCondition.createdAt = {
            [db.Sequelize.Op.gte]: [req.query.fromCreatedDate],
          };
        }
      } else if (req.query.toCreatedDate) {
        whereCondition.createdAt = {
          [db.Sequelize.Op.lte]: [req.query.toCreatedDate],
        };
      }

      // Plan Filter
      if (req.query.plan) {
        const plans = req.query.plan.split(",").map((p) => p.trim());

        let planCondition = [];

        if (plans.includes("Trial")) {
          planCondition.push(`User.isTrial = true`);
        }

        // Include users who have an active plan in `PlanHistories`
        const nonTrialPlans = plans.filter((p) => p !== "Trial");

        if (nonTrialPlans.length > 0) {
          planCondition.push(
            `User.id IN (SELECT userId FROM PlanHistories WHERE type IN (${nonTrialPlans
              .map((p) => `'${p}'`)
              .join(",")}) AND status = 'active')`
          );
        }

        // Apply the condition if at least one condition exists
        if (planCondition.length > 0) {
          whereCondition[db.Sequelize.Op.or] = db.Sequelize.literal(
            `(${planCondition.join(" OR ")})`
          );
        }
      }

      // Teams Filter
      if (req.query.minTeams || req.query.maxTeams) {
        let minTeams = req.query.minTeams ? Number(req.query.minTeams) : 0;
        let maxTeams = req.query.maxTeams
          ? Number(req.query.maxTeams)
          : Number.MAX_SAFE_INTEGER;
        whereCondition.id = {
          [db.Sequelize.Op.in]: db.Sequelize.literal(`(
            SELECT invitingUserId FROM TeamModels GROUP BY invitingUserId HAVING COUNT(*) BETWEEN ${minTeams} AND ${maxTeams}
          )`),
        };
      }

      // Total Spent Filter
      if (req.query.minSpent || req.query.maxSpent) {
        let minSpent = req.query.minSpent ? Number(req.query.minSpent) : 0;
        let maxSpent = req.query.maxSpent
          ? Number(req.query.maxSpent)
          : Number.MAX_SAFE_INTEGER;
        whereCondition.id = {
          [db.Sequelize.Op.in]: db.Sequelize.literal(`(
            SELECT userId FROM PaymentHistories GROUP BY userId HAVING SUM(price) BETWEEN ${minSpent} AND ${maxSpent}
          )`),
        };
      }

      // Mins Balance Filter
      if (req.query.minBalance || req.query.maxBalance) {
        whereCondition.totalSecondsAvailable = {
          [db.Sequelize.Op.between]: [
            req.query.minBalance * 60,
            req.query.maxBalance * 60,
          ],
        };
      }

      // Renewal Date Range
      if (req.query.fromChargeDate && req.query.toChargeDate) {
        whereCondition.nextChargeDate = {
          [db.Sequelize.Op.between]: [
            req.query.fromChargeDate,
            req.query.toChargeDate,
          ],
        };
      }

      // Agent Count Filter
      if (req.query.minAgents || req.query.maxAgents) {
        let minAgents = req.query.minAgents ? Number(req.query.minAgents) : 0;
        let maxAgents = req.query.maxAgents
          ? Number(req.query.maxAgents)
          : Number.MAX_SAFE_INTEGER;
        whereCondition.id = {
          [db.Sequelize.Op.in]: db.Sequelize.literal(`(
            SELECT userId FROM AgentModels GROUP BY userId HAVING COUNT(*) BETWEEN ${minAgents} AND ${maxAgents}
          )`),
        };
      }

      // Minutes Used Filter
      if (req.query.minMinsUsed || req.query.maxMinsUsed) {
        let minMinsUsed = req.query.minMinsUsed
          ? Number(req.query.minMinsUsed) * 60
          : 0;
        let maxMinsUsed = req.query.maxMinsUsed
          ? Number(req.query.maxMinsUsed) * 60
          : Number.MAX_SAFE_INTEGER;

        whereCondition.id = {
          [db.Sequelize.Op.in]: db.Sequelize.literal(`(
            SELECT DISTINCT userId FROM AgentModels 
            WHERE id IN (
              SELECT agentId FROM LeadCallsSents 
              GROUP BY agentId HAVING SUM(duration) BETWEEN ${minMinsUsed} AND ${maxMinsUsed}
            )
          )`),
        };
      }

      // Referred Filter
      if (req.query.referred) {
        whereCondition.inviteCodeUsed =
          req.query.referred === "yes" ? { [db.Sequelize.Op.ne]: null } : null;
      }

      // Closer Filter
      if (req.query.closer) {
        // Convert comma-separated values into an array
        const closerIds = req.query.closer
          .split(",")
          .map((id) => Number(id.trim()));

        whereCondition.campaigneeId = {
          [db.Sequelize.Op.in]: closerIds,
        };
      }

      // **Sorting Mechanism**
      let orderClause;
      switch (sort) {
        case "Leads":
          orderClause = db.Sequelize.literal(
            `(SELECT COUNT(*) FROM LeadModels WHERE LeadModels.userId = User.id) ${sortOrder}`
          );
          break;
        case "MinutesUsed":
          orderClause = db.Sequelize.literal(
            `(SELECT SUM(duration) FROM LeadCallsSents WHERE agentId IN (SELECT id FROM AgentModels WHERE userId = User.id)) ${sortOrder}`
          );
          break;
        case "TotalSpent":
          orderClause = db.Sequelize.literal(
            `(SELECT SUM(price) FROM PaymentHistories WHERE userId = User.id) ${sortOrder}`
          );
          break;
        case "MinutesBalance":
          orderClause = ["totalSecondsAvailable", sortOrder];
          break;
        default:
          orderClause = ["createdAt", sortOrder];
      }

      let users = await db.User.findAll({
        where: whereCondition,
        order: [orderClause],
        limit: limit,
        offset: offset,
      });

      let resource = await UserProfileAdminResource(users);

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

export async function GetUsersForAffiliates(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
    let limit = Number(req.query.limit || 30) || 30; // Default limit

    if (authData) {
      let userId = authData.user.id;
      let campaigneeId = req.query.campaigneeId;
      let search = req.query.search || null;
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
      let searchFilter = search
        ? {
            [db.Sequelize.Op.or]: [
              { email: { [db.Sequelize.Op.like]: `%${search}%` } },
              { phone: { [db.Sequelize.Op.like]: `%${search}%` } },
              { name: { [db.Sequelize.Op.like]: `%${search}%` } },
            ],
          }
        : {}; // Correct way to handle optional filtering

      let users = await db.User.findAll({
        where: {
          campaigneeId: campaigneeId,
          ...searchFilter, // ✅ Merging search filter correctly
        },
        offset: offset,
        limit: limit,
      });

      let usersRes = await UserProfileAdminResource(users);

      return res.send({ status: true, data: usersRes });
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
    let limit = Number(req.query.limit || 30) || 30; // Default limit
    let sort = req.query.sort || "Revenue"; // Default sorting by Revenue
    let sortOrder =
      req.query.sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    if (authData) {
      let userId = authData.user.id;

      let user = await db.User.findOne({ where: { id: userId } });
      if (!user || user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access.",
        });
      }

      // Filters
      let minRevenue = Number(req.query.minRevenue || 0);
      let maxRevenue = Number(req.query.maxRevenue || Number.MAX_SAFE_INTEGER);
      let minUsers = Number(req.query.minUsers || 0);
      let maxUsers = Number(req.query.maxUsers || Number.MAX_SAFE_INTEGER);

      let whereCondition = {}; // No base condition, as we are filtering based on calculated data

      // **SQL Filtering for Revenue and Users Signed Up**
      let affiliates = await db.CampaigneeModel.findAll({
        where: whereCondition,
        attributes: [
          "id",
          "name",
          "email",
          "phone",
          "uniqueUrl",
          [
            db.Sequelize.literal(`(
              SELECT COUNT(*) FROM Users WHERE campaigneeId = CampaigneeModel.id
            )`),
            "UsersSignedUp",
          ],
          [
            db.Sequelize.literal(`(
              SELECT COALESCE(SUM(price), 0) FROM PaymentHistories 
              WHERE userId IN (SELECT id FROM Users WHERE campaigneeId = CampaigneeModel.id)
            )`),
            "Revenue",
          ],
        ],
        having: db.Sequelize.and(
          db.Sequelize.literal(
            `Revenue BETWEEN ${minRevenue} AND ${maxRevenue}`
          ),
          db.Sequelize.literal(
            `UsersSignedUp BETWEEN ${minUsers} AND ${maxUsers}`
          )
        ),
        order: [[db.Sequelize.literal(sort), sortOrder]],
        limit: limit,
        offset: offset,
      });

      let affRes = await AffilitateResource(affiliates);

      return res.send({
        status: true,
        message: "Affiliates list",
        data: affRes,
        offset: offset,
        limit: limit,
      });
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

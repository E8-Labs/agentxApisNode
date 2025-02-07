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

  return {
    totalUsers,
    trialUsers: { count: trialUsers, percentage: trialPercentage },
    usersOnPlans,
    activeUsers: {
      DAU: { count: dailyActiveUsers, percentage: dauPercentage },
      MAU: { count: monthlyActiveUsers, percentage: mauPercentage },
    },
    weeklySignups,
    avgSessionDuration: `${sessionStats.avgSessionDuration} min`,
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

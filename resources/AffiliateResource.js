import db from "../models/index.js";

const Op = db.Sequelize.Op;

const AffilitateResource = async (user, currentUser = null) => {
  if (!Array.isArray(user)) {
    ////////console.log("Not array")
    return await getUserData(user, currentUser);
  } else {
    ////////console.log("Is array")
    const data = [];
    for (let i = 0; i < user.length; i++) {
      const p = await getUserData(user[i], currentUser);
      ////////console.log("Adding to index " + i)
      data.push(p);
    }

    return data;
  }
};

async function getUserData(item, currentUser = null) {
  let totalUsers = await db.User.count({
    where: {
      campaigneeId: item.id,
    },
  });

  let users = await db.User.findAll({
    where: {
      campaigneeId: item.id,
    },
  });
  let userIds = [];
  if (users && users.length > 0) {
    userIds = users.map((user) => user.id);
  }

  let totalSpent = await db.PaymentHistory.sum("price", {
    where: {
      userId: {
        [db.Sequelize.Op.in]: userIds,
      },
    },
  });

  const topSpender = await db.PaymentHistory.findOne({
    attributes: [
      "userId",
      [Sequelize.fn("SUM", Sequelize.col("price")), "totalSpent"],
    ],
    include: [
      {
        model: db.User,
        attributes: [], // Don't fetch extra user details here
        where: { campaigneeId: { [Op.not]: null } }, // Add your constraint on User table
      },
    ],
    group: ["userId"],
    order: [[Sequelize.literal("totalSpent"), "DESC"]], // Sort highest first
    raw: true,
  });

  const xbarTotalRevenue = await db.PaymentHistory.findOne({
    attributes: [[Sequelize.fn("SUM", Sequelize.col("price")), "totalSpent"]],
    include: [
      {
        model: db.User,
        attributes: [], // We don't need extra user details
        where: { campaigneeId: { [Op.not]: null } }, // Ensure user has a campaigneeId
      },
    ],
    where: { type: "SupportPlan" }, // Filter for only SupportPlan payments
    raw: true,
  });

  const Resource = {
    ...item.get(),
    totalUsers: totalUsers,
    totalSpent: totalSpent,
    topSpender,
    xbarTotalRevenue,
  };

  return Resource;
}

export default AffilitateResource;

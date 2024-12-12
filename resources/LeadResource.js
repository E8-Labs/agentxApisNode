import db from "../models/index.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const LeadResource = async (user, currentUser = null) => {
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

async function getUserData(lead, currentUser = null) {
  console.log("Type of user is ", typeof user);
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let leadTags = await db.LeadTagsModel.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let tags = leadTags.map((tag) => tag.tag);

  let sheetTags = await db.LeadSheetTagModel.findAll({
    where: {
      sheetId: lead.sheetId,
    },
  });
  let sheetTagsArray = sheetTags.map((tag) => tag.tag);
  for (let t of sheetTagsArray) {
    tags.push(t);
  }

  const LeadResource = {
    ...lead.get(),
    tags: tags, //{ ...tags, ...sheetTagsArray },
    // sheetTagsArray,
  };

  return LeadResource;
}

export default LeadResource;

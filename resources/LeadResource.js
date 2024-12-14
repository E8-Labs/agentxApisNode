import db from "../models/index.js";
import LeadEmailModel from "../models/lead/LeadEmails.js";
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

  let kycs = await db.LeadKycsExtracted.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let leadData = null;
  try {
    leadData = lead.get();
  } catch (error) {
    leadData = lead;
  }

  let notes = await db.LeadNotesModel.findAll({
    where: {
      leadId: lead.id,
    },
  });

  let callActivity = await db.LeadCallsSent.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let formattedCalls = [];
  if (callActivity && callActivity.length > 0) {
    formattedCalls = callActivity.map((call) => {
      const minutes = Math.floor(call.duration / 60);
      const seconds = call.duration % 60;
      const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;

      return {
        ...call.dataValues, // Include existing call data
        durationFormatted: formattedDuration,
      };
    });
  }
  let emails = await LeadEmailModel.findAll({
    where: {
      leadId: lead.id,
    },
  });
  const LeadResource = {
    ...leadData,
    tags: tags, //{ ...tags, ...sheetTagsArray },
    kycs: kycs,
    notes: notes,
    callActivity: formattedCalls,
    emails: emails,
    // sheetTagsArray,
  };

  return LeadResource;
}

export default LeadResource;

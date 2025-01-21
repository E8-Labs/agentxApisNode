import db from "../models/index.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { AddNotification } from "../controllers/NotificationController.js";

//sent 1 hr after account creation
export async function CheckAndSendTrialTickingNotificaitonSent(user) {
  console.log("Trying to send 1 hour not", user.id);
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 1 hours (in milliseconds) or more have passed
  if (timeDifference >= 1 * 60 * 60 * 1000) {
    console.log("1 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 1 hours have passed since the account was created.",
      timeDifference / 60000
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: NotificationTypes.Trial30MinTicking,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for Trial Ticking");
  } else {
    await AddNotification(
      user,
      null,
      NotificationTypes.Trial30MinTicking,
      null,
      null,
      null,
      null,
      null,
      0
    );
  }
}
//Day 1: sent 3 hr after account creation
export async function CheckAndSendLikelyToWinNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 3 * 60 * 60 * 1000) {
    console.log("3 hours or more have passed since the account was created.");
  } else {
    console.log("Less than 3 hours have passed since the account was created.");
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: NotificationTypes.X3MoreLikeyToWin,
    },
  });
  if (not) {
    console.log(
      "Notificaiton already sent for ",
      NotificationTypes.X3MoreLikeyToWin
    );
  } else {
    await AddNotification(
      user,
      null,
      NotificationTypes.X3MoreLikeyToWin,
      null,
      null,
      null,
      null,
      null,
      0
    );
  }
}
//Day 2: sent 1 day & 3 hr after account creation
export async function CheckAndSendNeedHandNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  // if (!user.isTrial) {
  //   console.log("User is not on trial");
  //   return;
  // }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.NeedHand;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 27 * 60 * 60 * 1000) {
    console.log("27 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 27 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log(`${user.id} | Notificaiton already sent for `, type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}
//Day 3: sent 2 day & 3 hr after account creation
export async function CheckAndSendTrialReminderNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.TrialReminder;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 2 days and 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 51 * 60 * 60 * 1000) {
    console.log("51 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 51 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}
//Day 5: sent 4 day & 3 hr after account creation
export async function CheckAndSendNeedHelpDontMissoutNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.NeedHelpDontMissOut;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 99 hours (in milliseconds) or more have passed
  if (timeDifference >= 99 * 60 * 60 * 1000) {
    console.log("99 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 99 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}
//Day 6: sent 5 day & 3 hr after account creation
export async function CheckAndSendLastChanceToActNotificaitonSent(user) {
  let u = user;
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }

  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.LastChanceToAct;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  //If 7 days have passed
  console.log("Checking If Trial have passed", user.id);
  if (timeDifference > 7 * 24 * 60 * 60 * 1000) {
    console.log("Yes  Trial have passed", u.id);
    console.log("More than 7 days have passed and still on trial");
    user.isTrial = false;
    let seconds = user.totalAvailableSeconds;
    user.totalAvailableSeconds -= seconds;
    await user.save();
    return;
  } else {
    console.log("No  Trial have not passed", u.id);
  }

  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }

  // Check if 99 hours (in milliseconds) or more have passed
  if (timeDifference >= 123 * 60 * 60 * 1000) {
    console.log("123 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 123 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}
//Day 7: sent 6 day & 3 hr after account creation
export async function CheckAndSendLastDayToMakeItCountNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.LastDayToMakeItCount;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 147 hours (in milliseconds) or more have passed
  if (timeDifference >= 147 * 60 * 60 * 1000) {
    console.log("147 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 147 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}
//When 2 minutes of trial time is left
export async function CheckAndSendTwoMinuteTrialLeftNotificaitonSent(user) {
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  console.log("User is ", user.id);
  console.log("User's total seconds available", user.totalSecondsAvailable);
  if (user.totalSecondsAvailable > 300) {
    return;
  }
  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.TrialTime2MinLeft;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 147 hours (in milliseconds) or more have passed
  if (timeDifference >= 147 * 60 * 60 * 1000) {
    console.log("147 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 147 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

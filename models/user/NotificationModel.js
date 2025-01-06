import { UserTypes } from "./userModel.js";

export const NotificationTypes = {
  Hotlead: "Hotlead", //sent at 8 pm
  TotalHotlead: "TotalHotlead", // sent at 8 pm
  MeetingBooked: "MeetingBooked",
  PaymentFailed: "PaymentFailed",
  NoCallsIn3Days: "NoCallsIn3Days",
  LeadCalledBack: "LeadCalledBack",
  InviteAccepted: "InviteAccepted",
  CallsMadeByAgent: "CallsMadeByAgent",
  RedeemedAgentXCode: "RedeemedAgentXCode", // 30 min added for using AgentX Code
  Redeemed60Min: "Redeemed60Min", // 1 hour after the subscription

  //Trial Related
  Trial30MinTicking: "Trial30MinTicking",
  //Day1
  X3MoreLikeyToWin: "3xMoreLikeyToWin", //3x more likely to win/ send 3 hours after account creation
  //Day2: Same time as on first day
  NeedHand: "NeedHand",
  //Day 3
  TrialReminder: "TrialReminder",
  //Day 5
  NeedHelpDontMissOut: "NeedHelpDontMissOut",
  //Day 6
  LastChanceToAct: "LastChanceToAct",
  //Day 7
  LastDayToMakeItCount: "LastDayToMakeItCount",
  TrialTime2MinLeft: "TrialTime2MinLeft", // when two minutes of trial time is left
  PlanRenewed: "PlanRenewed",
};
const NotificationModel = (sequelize, Sequelize) => {
  const NotificationModel = sequelize.define("NotificationModel", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    body: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    fromUserId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    agentId: {
      // Agent Id of the sub agent not the main agent model
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    codeRedeemed: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    isSeen: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return NotificationModel;
};

export default NotificationModel;

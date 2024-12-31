import { UserTypes } from "./userModel.js";

export const NotificationTypes = {
  Hotlead: "Hotlead", //sent at 8 pm
  TotalHotlead: "TotalHotlead", // sent at 8 pm
  MeetingBooked: "MeetingBooked",
  PaymentFailed: "PaymentFailed",
  NoCallsIn3Days: "NoCallsIn3Days",
  InviteAccepted: "InviteAccepted",
  CallsMadeByAgent: "CallsMadeByAgent",
  RedeemedAgentXCode: "RedeemedAgentXCode", // 30 min added for using AgentX Code
  Redeemed60Min: "Redeemed60Min", // 60 min added for using Abort Plan Cancellation
};
const NotificationModel = (sequelize, Sequelize) => {
  const NotificationModel = sequelize.define("NotificationModel", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
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

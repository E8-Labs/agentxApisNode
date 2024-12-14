const WebhookModel = (sequelize, Sequelize) => {
  const WebhookModel = sequelize.define("WebhookModel", {
    url: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    action: {
      type: Sequelize.ENUM,
      values: [WebhookTypes.TypeStageChange, WebhookTypes.TypeNewLeadAdded],
      allowNull: true,
    },
    userId: {
      type: Sequelize.INTEGER,
    },
  });

  return WebhookModel;
};

export const WebhookTypes = {
  TypeStageChange: "StageChange",
  TypeNewLeadAdded: "NewLead",
};

export default WebhookModel;

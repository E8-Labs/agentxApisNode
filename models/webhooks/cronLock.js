const CronLockTable = (sequelize, Sequelize) => {
  const WebhookModel = sequelize.define("CronLockTable", {
    process: {
      type: Sequelize.STRING,
      defaultValue: "batchCron", //"batchCron", "subsequentCron"
    },
  });

  return WebhookModel;
};

export const ProcessTypes = {
  BatchCron: "batchCron",
  BookingCron: "BookingCron",
  SubsequentCron: "subsequentCron",
  RechargeCron: "RechargeCron",
};

export default CronLockTable;

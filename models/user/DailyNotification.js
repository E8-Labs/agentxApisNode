const DailyNotificationModel = (sequelize, Sequelize) => {
  const DailyNotificationModel = sequelize.define("DailyNotificationModel", {
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
  });

  return DailyNotificationModel;
};

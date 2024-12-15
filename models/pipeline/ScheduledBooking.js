const ScheduledBooking = (sequelize, Sequelize) => {
  const ScheduledBooking = sequelize.define("ScheduledBooking", {
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    datetime: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return ScheduledBooking;
};

export default ScheduledBooking;

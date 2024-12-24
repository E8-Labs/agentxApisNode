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
        model: "LeadModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    datetime: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    date: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },
    time: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },
  });

  return ScheduledBooking;
};

export default ScheduledBooking;

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
    agentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "AgentModels",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    data: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    leadId: {
      type: Sequelize.INTEGER,
      allowNull: true,
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
    meetingId: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },
    cadenceCompleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  return ScheduledBooking;
};

export default ScheduledBooking;

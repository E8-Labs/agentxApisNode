const Pipeline = (sequelize, Sequelize) => {
  const Pipeline = sequelize.define("Pipeline", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "Default Pipeline",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
  });

  return Pipeline;
};

export default Pipeline;

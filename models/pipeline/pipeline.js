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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return Pipeline;
};

export default Pipeline;

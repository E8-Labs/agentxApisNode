const Stages = (sequelize, Sequelize) => {
  const Stages = sequelize.define("Stages", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "Default Pipeline",
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    defaultColor: {
      type: Sequelize.STRING,
      defaultValue: "red",
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
  });

  return Stages;
};

export default Stages;

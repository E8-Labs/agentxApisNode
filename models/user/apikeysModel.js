const ApiKeysModel = (sequelize, Sequelize) => {
  const ApiKeysModel = sequelize.define("ApiKeysModel", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    key: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    status: {
      type: Sequelize.ENUM,
      values: ["active", "deactivated"],
      defaultValue: "active",
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users", //
        key: "id",
      },
    },
  });

  return ApiKeysModel;
};

export default ApiKeysModel;

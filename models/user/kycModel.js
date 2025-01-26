export const KycModel = (sequelize, Sequelize) => {
  const KycModel = sequelize.define("KycModel", {
    question: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    category: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: "seller", // buyer
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users", //
        key: "id",
      },
      onDelete: "CASCADE", // Automatically delete related KycModel records
      onUpdate: "CASCADE",
    },
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "MainAgentModels", //
        key: "id",
      },
      onDelete: "CASCADE", // Automatically delete related KycModel records
      onUpdate: "CASCADE",
    },
    actionId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });

  return KycModel;
};

export const KycExampleModel = (sequelize, Sequelize) => {
  const KycExampleModel = sequelize.define("KycExampleModel", {
    kycId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "KycModels", //
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    example: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
  });

  return KycExampleModel;
};

// export default { KycExampleModel, KycExampleModel };

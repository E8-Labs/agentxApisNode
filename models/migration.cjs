export const up = async (queryInterface, Sequelize) => {
  await queryInterface.changeColumn("KycModels", "mainAgentId", {
    type: Sequelize.INTEGER,
    references: {
      model: "MainAgentModels",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.changeColumn("KycModels", "mainAgentId", {
    type: Sequelize.INTEGER,
    references: {
      model: "MainAgentModels",
      key: "id",
    },
    onDelete: null,
    onUpdate: null,
  });
};

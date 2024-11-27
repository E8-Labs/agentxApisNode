const InfoExtractorModel = (sequelize, Sequelize) => {
  const InfoExtractorModel = sequelize.define("InfoExtractorModel", {
    data: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    actionId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    actionType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
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
  });

  return InfoExtractorModel;
};

export default InfoExtractorModel;

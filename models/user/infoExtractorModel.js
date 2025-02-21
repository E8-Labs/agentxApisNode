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
      type: Sequelize.STRING, //defaultIE, liveTransferIE,
      allowNull: true,
    },
    question: {
      type: Sequelize.STRING, //defaultIE, liveTransferIE,
      allowNull: true,
      defaultValue: "",
    },
    identifier: {
      type: Sequelize.STRING, //defaultIE, liveTransferIE,
      allowNull: true,
      defaultValue: "",
    },
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
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

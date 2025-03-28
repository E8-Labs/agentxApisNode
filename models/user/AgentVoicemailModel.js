const AgentVoicemailModel = (sequelize, Sequelize) => {
  const AgentVoicemailModel = sequelize.define("AgentVoicemailModel", {
    voiceName: {
      //Event id is the meeting event on cal.com
      type: Sequelize.STRING, //Ava or Axel
      allowNull: true,
    },
    message: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    agentType: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    agentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "AgentModels", //
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return AgentVoicemailModel;
};

export default AgentVoicemailModel;

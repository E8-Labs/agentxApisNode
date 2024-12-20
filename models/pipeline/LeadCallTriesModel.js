// import LeadCadence from "./LeadsCadence";

//
const LeadCallTriesModel = (sequelize, Sequelize) => {
  const LeadCallTriesModel = sequelize.define("LeadCallTriesModel", {
    batchId: {
      type: Sequelize.INTEGER,
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
    leadCadenceId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "LeadCadences",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
    },

    callId: {
      // synthflowCallId
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: Sequelize.STRING,
      default: "",
      allowNull: false,
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
    pipelineId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      // references: {
      //   model: "Pipeline",
      //   key: "id",
      // },
      // onDelete: "CASCADE",
      // onUpdate: "CASCADE",
    },
  });
  LeadCallTriesModel.associate = (models) => {
    LeadCallTriesModel.belongsTo(models.LeadModel, {
      foreignKey: "leadId",
      as: "LeadCallTries",
    });

    LeadCallTriesModel.belongsTo(models.LeadCadence, {
      foreignKey: "leadCadenceId",
      as: "LeadCadence",
    });

    LeadCallTriesModel.belongsTo(models.PipelineStages, {
      foreignKey: "stage",
      as: "PipelineStages",
    });
  };

  return LeadCallTriesModel;
};

export default LeadCallTriesModel;

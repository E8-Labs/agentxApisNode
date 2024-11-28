//Agent1 will work on stage New Lead in Pipeline 1  and then move the lead to next stage
//Leads can be assigned later to work through.
//Agent1 will go through the call cadence to decide when to push through to next stage
const PipelineCadence = (sequelize, Sequelize) => {
  const PipelineCadence = sequelize.define("PipelineCadence", {
    mainAgentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "MainAgentModels",
        key: "id",
      },
    },
    stage: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "PipelineStages",
        key: "id",
      },
    },

    pipelineId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Pipelines",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: PipelineCadenceStatus.Active, // when user assigns that lead to another pipeline then that cadence status changes to Paused
    },
    moveToStage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "PipelineStages",
        key: "id",
      },
    },
  });

  return PipelineCadence;
};

export const PipelineCadenceStatus = {
  // Pending: "Pending",
  Active: "Active",
  Paused: "Paused",
  // Booked: "Booked", // the rest of the cadence for that
};

export default PipelineCadence;

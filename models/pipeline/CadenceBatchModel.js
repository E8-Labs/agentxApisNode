//Agent1 will work on stage New Lead in Pipeline 1  and then move the lead to next stage
//Leads can be assigned later to work through.
//Agent1 will go through the call cadence to decide when to push through to next stage

import { DATE } from "sequelize";

// import { PipelineCadenceStatus } from "./pipelineCadence";
const CadenceBatchModel = (sequelize, Sequelize) => {
  const CadenceBatchModel = sequelize.define("CadenceBatchModel", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
    totalLeads: {
      // total number of leads
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    batchSize: {
      // total number of calls to be sent per day in batch
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    startTime: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: BatchStatus.Active, // when user assigns that lead to another pipeline then that cadence status changes to Paused
    },
    zap: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false, // when user assigns that lead to another pipeline then that cadence status changes to Paused
    },
  });

  return CadenceBatchModel;
};

export const BatchStatus = {
  // Pending: "Pending",
  Active: "Active",
  Paused: "Paused",
  Completed: "Completed", // the rest of the cadence for that
};

export default CadenceBatchModel;

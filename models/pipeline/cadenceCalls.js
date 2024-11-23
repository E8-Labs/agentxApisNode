/*
When a lead is assigned to an agent in a pipeline then
leadId, agentId, pipelineId, leads initial stage becomes New Lead if the lead has no stage
The we run cron job
it fetches the leads list.
For every lead we will run the following.
1 - We will check for pipelineCadence that matches lead stage, agentId of the lead who will be processing it, pipelineId of the lead & 
2 - Get the the pipelineCadence that matches. Then we will fetch the Call Cadence for that pipelineCadence.
3 - Then we will create a table for CallLogs. We will check if the there is a relevant data for that pipelineCadence, leadId & cadencecallId.
4 - If no data then run the call forthat. Store the call id in the CallLogs table.
5 - If data found then check the next CadenceCall row for the above specified conditions and keep doing that.
6- If we reach the last row then move the lead to next stage as specified in pipeLineCadence moveToStage.

*/

const CadenceCalls = (sequelize, Sequelize) => {
  const CadenceCalls = sequelize.define("CadenceCalls", {
    pipelineCadenceId: {
      // to allow multiple agents to the pipe line and allow it to work with multiple agents to call multiple leads
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "PipelineCadences",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    waitTimeMinutes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    waitTimeHours: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    waitTimeDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  });

  return CadenceCalls;
};

export default CadenceCalls;

// const AgentStages = (sequelize, Sequelize) => {
//   const AgentStages = sequelize.define("AgentStages", {
//     stageId: {
//       type: Sequelize.INTEGER,
//       allowNull: true,
//       references: {
//         model: "Stages",
//         key: "id",
//       },
//     },
//     agentId: {
//       type: Sequelize.INTEGER,
//       allowNull: true,
//       references: {
//         model: "AgentModels",
//         key: "id",
//       },
//     },
//     pipelineId: {
//       type: Sequelize.INTEGER,
//       allowNull: false,
//       references: {
//         model: "Pipelines",
//         key: "id",
//       },
//     },
//   });

//   return AgentStages;
// };

// export default AgentStages;

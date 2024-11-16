import dbConfig from "../config/dbConfig.js";
import User from "./user/userModel.js";
import AreaOfFocus from "./user/areaOfFocus.js";
import AgentService from "./user/agentService.js";
import AgentModel from "./user/agentModel.js";
import MainAgentModel from "./user/mainAgentModel.js";
import { KycExampleModel, KycModel } from "./user/kycModel.js";

import Sequelize from "sequelize";

import {
  createAreaOfFocusValues,
  createAgentServices,
  createAgentDefaultRoles,
  addDefaultStages,
} from "../utils/createPredefinedData.js";
import AgentRole from "./user/agentRole.js";
import AgentModelSynthflow from "./user/mainAgentModel.js";
import Stages from "./pipeline/stages.js";
import LeadModel from "./lead/lead.js";
import { se } from "date-fns/locale";
import Pipeline from "./pipeline/pipeline.js";
// import PipelineAssignedAgent from "./pipeline/pipelineAssignedAgent.js";
import PipelineCadence from "./pipeline/pipelineCadence.js";
import LeadCadence from "./pipeline/LeadsCadence.js";
import CadenceCalls from "./pipeline/cadenceCalls.js";
import PipelineStages from "./pipeline/pipelineStages.js";
import LeadSheetModel from "./lead/leadSheet.js";
import LeadCallsSent from "./pipeline/LeadCallsSent.js";
// import AgentStages from "./pipeline/agentStages.js";

const sequelize = new Sequelize(
  dbConfig.MYSQL_DB,
  dbConfig.MYSQL_DB_USER,
  dbConfig.MYSQL_DB_PASSWORD,
  {
    host: dbConfig.MYSQL_DB_HOST,
    port: dbConfig.MYSQL_DB_PORT,
    dialect: dbConfig.dialect,
    logging: false,
  }
);

try {
  await sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

const db = {};
let models = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = User(sequelize, Sequelize);
models["User"] = db.User;

db.AreaOfFocus = AreaOfFocus(sequelize, Sequelize);
models["AreaOfFocus"] = db.AreaOfFocus;
await createAreaOfFocusValues(db);

db.AgentService = AgentService(sequelize, Sequelize);
models["AgentService"] = db.AgentService;
await createAgentServices(db);

db.AgentRole = AgentRole(sequelize, Sequelize);
models["AgentRole"] = db.AgentRole;
await createAgentDefaultRoles(db);

db.MainAgentModel = MainAgentModel(sequelize, Sequelize);
models["MainAgentModel"] = db.MainAgentModel;

db.AgentModel = AgentModel(sequelize, Sequelize);
models["AgentModel"] = db.AgentModel;

db.KycModel = KycModel(sequelize, Sequelize);
models["KycModel"] = db.KycModel;

db.KycExampleModel = KycExampleModel(sequelize, Sequelize);
models["KycExampleModel"] = db.KycExampleModel;

//Pipeline
db.Stages = Stages(sequelize, Sequelize);
models["Stages"] = db.Stages;
addDefaultStages(db);

db.LeadSheetModel = LeadSheetModel(sequelize, Sequelize);
models["LeadSheetModel"] = db.LeadSheetModel;

db.LeadModel = LeadModel(sequelize, Sequelize);
models["LeadModel"] = db.LeadModel;

db.Pipeline = Pipeline(sequelize, Sequelize);
models["Pipeline"] = db.Pipeline;

db.PipelineStages = PipelineStages(sequelize, Sequelize);
models["PipelineStages"] = db.PipelineStages;

// db.AgentStages = AgentStages(sequelize, Sequelize);
// models["AgentStages"] = db.AgentStages;

// db.PipelineAssignedAgent = PipelineAssignedAgent(sequelize, Sequelize);
// models["PipelineAssignedAgent"] = db.PipelineAssignedAgent;

db.PipelineCadence = PipelineCadence(sequelize, Sequelize);
models["PipelineCadence"] = db.PipelineCadence;

db.CadenceCalls = CadenceCalls(sequelize, Sequelize);
models["CadenceCalls"] = db.CadenceCalls;

db.LeadCadence = LeadCadence(sequelize, Sequelize);
models["LeadCadence"] = db.LeadCadence;

db.LeadCallsSent = LeadCallsSent(sequelize, Sequelize);
models["LeadCallsSent"] = db.LeadCallsSent;

// db.AgentModelSynthflow = AgentModelSynthflow(sequelize, Sequelize);
// models["AgentModelSynthflow"] = db.AgentModelSynthflow;

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

export default db;

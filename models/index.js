import dbConfig from "../config/dbConfig.js";
import User from "./user/userModel.js";
import AreaOfFocus from "./user/areaOfFocus.js";
import AgentService from "./user/agentService.js";
import AgentModel from "./user/agentModel.js";
import MainAgentModel from "./user/mainAgentModel.js";
import AgentPromptModel from "./user/agentPromptModel.js";
import { KycExampleModel, KycModel } from "./user/kycModel.js";

import Sequelize from "sequelize";
import {
  createAreaOfFocusValues,
  createAgentServices,
  createAgentDefaultRoles,
  addDefaultStages,
} from "../utils/createPredefinedData.js";

import AgentRole from "./user/agentRole.js";
import Stages from "./pipeline/stages.js";
import LeadModel from "./lead/lead.js";
import Pipeline from "./pipeline/pipeline.js";
import PipelineCadence from "./pipeline/pipelineCadence.js";
import LeadCadence from "./pipeline/LeadsCadence.js";
import CadenceCalls from "./pipeline/cadenceCalls.js";
import PipelineStages from "./pipeline/pipelineStages.js";
import LeadSheetModel from "./lead/leadSheet.js";
import LeadCallsSent from "./pipeline/LeadCallsSent.js";
import UserFocusModel from "./user/userFocusModel.js";
import UserServicesModel from "./user/userServicesModel.js";
import UserPhoneNumbers from "./user/userPhoneModel.js";
import InfoExtractorModel from "./user/infoExtractorModel.js";
import LeadSheetColumnModel from "./lead/sheetColumnModel.js";

import ObjectionAndGuradrails from "./user/objectAndGaurdrailsModel.js";

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

// Define models
db.AreaOfFocus = AreaOfFocus(sequelize, Sequelize);
db.AgentService = AgentService(sequelize, Sequelize);
db.User = User(sequelize, Sequelize);
db.UserFocusModel = UserFocusModel(sequelize, Sequelize);
db.UserServicesModel = UserServicesModel(sequelize, Sequelize);
db.UserPhoneNumbers = UserPhoneNumbers(sequelize, Sequelize);
db.AgentRole = AgentRole(sequelize, Sequelize);
db.MainAgentModel = MainAgentModel(sequelize, Sequelize);
db.AgentPromptModel = AgentPromptModel(sequelize, Sequelize);
db.AgentModel = AgentModel(sequelize, Sequelize);
db.KycModel = KycModel(sequelize, Sequelize);
db.KycExampleModel = KycExampleModel(sequelize, Sequelize);
db.InfoExtractorModel = InfoExtractorModel(sequelize, Sequelize);

// Pipeline models
db.Stages = Stages(sequelize, Sequelize);
db.LeadSheetModel = LeadSheetModel(sequelize, Sequelize);
db.LeadSheetColumnModel = LeadSheetColumnModel(sequelize, Sequelize);
db.LeadModel = LeadModel(sequelize, Sequelize);
models["LeadModel"] = db.LeadModel;
db.Pipeline = Pipeline(sequelize, Sequelize);
db.PipelineStages = PipelineStages(sequelize, Sequelize);
models["PipelineStages"] = db.PipelineStages;
db.PipelineCadence = PipelineCadence(sequelize, Sequelize);
db.CadenceCalls = CadenceCalls(sequelize, Sequelize);
db.LeadCadence = LeadCadence(sequelize, Sequelize);
models["LeadCadence"] = db.LeadCadence;
db.LeadCallsSent = LeadCallsSent(sequelize, Sequelize);
models["LeadCallsSent"] = db.LeadCallsSent;

db.ObjectionAndGuradrails = ObjectionAndGuradrails(sequelize, Sequelize);
models["ObjectionAndGuradrails"] = db.ObjectionAndGuradrails;

// Run predefined setup
models["AreaOfFocus"] = db.AreaOfFocus;
await createAreaOfFocusValues(db);
models["AgentService"] = db.AgentService;
await createAgentServices(db);
models["AgentRole"] = db.AgentRole;
await createAgentDefaultRoles(db);
models["Stages"] = db.Stages;
await addDefaultStages(db);

// Model associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

console.log("Association ", db.LeadCallsSent.associations);

export default db;

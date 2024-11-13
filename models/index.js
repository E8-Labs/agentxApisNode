import dbConfig from "../config/dbconfig.js";
import User from "./user/usermodel.js";
import AreaOfFocus from "./user/areaoffocus.js";
import AgentService from "./user/agentservice.js";
import AgentModel from "./user/agentmodel.js";
import { KycExampleModel, KycModel } from "./user/kycmodel.js";

import Sequelize from "sequelize";

import {
  createAreaOfFocusValues,
  createAgentServices,
  createAgentDefaultRoles,
} from "../utils/createpredefineddata.js";
import AgentRole from "./user/agentrole.js";
import AgentModelSynthflow from "./user/agentmodelsynthflow.js";

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

db.AgentModel = AgentModel(sequelize, Sequelize);
models["AgentModel"] = db.AgentModel;

db.KycModel = KycModel(sequelize, Sequelize);
models["KycModel"] = db.KycModel;

db.KycExampleModel = KycExampleModel(sequelize, Sequelize);
models["KycExampleModel"] = db.KycExampleModel;

// db.AgentModelSynthflow = AgentModelSynthflow(sequelize, Sequelize);
// models["AgentModelSynthflow"] = db.AgentModelSynthflow;

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

export default db;

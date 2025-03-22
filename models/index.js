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
  createAgentDefaultIndustry,
} from "../utils/createPredefinedData.js";

import CampaigneeModel from "./user/campaign/campaigneeModel.js";
import AgentRole from "./user/agentRole.js";
import UserIndustry from "./user/userIndustry.js";
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
import LeadSheetTagModel from "./lead/LeadSheetTags.js";
import LeadTagsModel from "./lead/LeadTagsModel.js";

import StageTagModel from "./pipeline/StageTags.js";

import ObjectionAndGuradrails from "./user/objectAndGaurdrailsModel.js";
import ApiKeysModel from "./user/apikeysModel.js";
import GhlCalendarModel from "./user/ghlCalendarModel.js";
import LeadKycsExtracted from "./lead/LeadKycsExtracted.js";
import CalendarIntegration from "./user/calendarIntegration.js";
import CadenceBatchModel from "./pipeline/CadenceBatchModel.js";
import LeadNotesModel from "./lead/LeadNotesModel.js";
import LeadEmailModel from "./lead/LeadEmails.js";
import WebhookModel from "./webhooks/WebhookModel.js";
import ScheduledBooking from "./pipeline/ScheduledBooking.js";

import PaymentHistory from "./user/payment/paymentPlans.js";
import PlanHistory from "./user/payment/PlanHistory.js";
import LeadCallTriesModel from "./pipeline/LeadCallTriesModel.js";
import PhoneVerificationCodeModel from "./user/PhoneVerificationCodeModel.js";

import NotificationModel from "./user/NotificationModel.js";
import { DailyNotificationModel } from "./user/DailyNotification.js";
import TeamModel from "./user/team/TeamModel.js";
import { TestNumbers } from "./Testing/TestNumbers.js";
import TeamLeadAssignModel from "./user/team/TeamLeadAssign.js";
import TeamStageAssignModel from "./user/team/TeamStageAssignModel.js";
import UserActivityModel from "./user/UserActivityModel.js";
import CronLockTable from "./webhooks/cronLock.js";
import { UserTwilioAccounts } from "./user/UserTwilioAccount.js";
import PaymentMethod from "./user/payment/paymentMethod.js";
import PaymentMethodFails from "./user/payment/PaymentFails.js";
import KnowledgeBase from "./user/knowlegebase/Knowledgebase.js";
import UserSelectedIndustryModel from "./user/UserSelectedIndustry.js";

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

db.CampaigneeModel = CampaigneeModel(sequelize, Sequelize);
db.TestNumbers = TestNumbers(sequelize, Sequelize);
db.UserIndustry = UserIndustry(sequelize, Sequelize);
db.AreaOfFocus = AreaOfFocus(sequelize, Sequelize);
db.AgentService = AgentService(sequelize, Sequelize);

db.User = User(sequelize, Sequelize);
db.UserTwilioAccounts = UserTwilioAccounts(sequelize, Sequelize);

db.KnowledgeBase = KnowledgeBase(sequelize, Sequelize);
db.KnowledgeBase.belongsTo(db.User, {
  foreignKey: "userId",
});
db.User.hasMany(db.KnowledgeBase, {
  foreignKey: "userId",
});

db.UserFocusModel = UserFocusModel(sequelize, Sequelize);
db.UserServicesModel = UserServicesModel(sequelize, Sequelize);
db.UserSelectedIndustryModel = UserSelectedIndustryModel(sequelize, Sequelize);

db.UserPhoneNumbers = UserPhoneNumbers(sequelize, Sequelize);
db.User.hasMany(db.UserPhoneNumbers, {
  foreignKey: "userId",
  as: "PhoneNumbers",
});
db.UserPhoneNumbers.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});

db.TeamModel = TeamModel(sequelize, Sequelize);
db.User.hasMany(db.TeamModel, {
  foreignKey: "invitingUserId",
  as: "InvitingUser",
});

db.PaymentMethodFails = PaymentMethodFails(sequelize, Sequelize);
db.PaymentMethodFails.belongsTo(db.User, { foreignKey: "userId" });
db.User.hasMany(db.PaymentMethodFails, { foreignKey: "userId" });

db.User.hasMany(db.TeamModel, {
  foreignKey: "invitedUserId",
  as: "InvitedUser",
});

db.PhoneVerificationCodeModel = PhoneVerificationCodeModel(
  sequelize,
  Sequelize
);
db.PhoneVerificationCodeModel.belongsTo(db.User, {
  foreignKey: "phone",
  targetKey: "phone", // This assumes both models share the phone field
  constraints: false, // Important: no actual FK in DB
});

db.NotificationModel = NotificationModel(sequelize, Sequelize);
db.DailyNotificationModel = DailyNotificationModel(sequelize, Sequelize);
db.AgentRole = AgentRole(sequelize, Sequelize);
db.MainAgentModel = MainAgentModel(sequelize, Sequelize);
db.AgentPromptModel = AgentPromptModel(sequelize, Sequelize);
db.AgentModel = AgentModel(sequelize, Sequelize);
db.User.hasMany(db.AgentModel, { foreignKey: "userId", as: "agents" });
db.AgentModel.belongsTo(db.User, { foreignKey: "userId", as: "user" });

db.KycModel = KycModel(sequelize, Sequelize);
db.KycExampleModel = KycExampleModel(sequelize, Sequelize);
db.InfoExtractorModel = InfoExtractorModel(sequelize, Sequelize);

db.WebhookModel = WebhookModel(sequelize, Sequelize);

db.PaymentMethod = PaymentMethod(sequelize, Sequelize);
db.User.hasMany(db.PaymentMethod, {
  foreignKey: "userId",
  as: "paymentMethods",
});
db.PaymentMethod.belongsTo(db.User, {
  foreignKey: "userId",
});

db.PaymentHistory = PaymentHistory(sequelize, Sequelize);
db.PaymentHistory.belongsTo(db.User, {
  foreignKey: "userId",
});
db.User.hasMany(db.PaymentHistory, {
  foreignKey: "userId",
  as: "paymentHistory",
});

db.PlanHistory = PlanHistory(sequelize, Sequelize);
db.PlanHistory.belongsTo(db.User, {
  foreignKey: "userId",
});
db.User.hasMany(db.PlanHistory, {
  foreignKey: "userId",
  as: "planHistory",
});

// Pipeline models
db.Stages = Stages(sequelize, Sequelize);
db.LeadSheetModel = LeadSheetModel(sequelize, Sequelize);
db.LeadSheetColumnModel = LeadSheetColumnModel(sequelize, Sequelize);
db.LeadSheetTagModel = LeadSheetTagModel(sequelize, Sequelize);
db.LeadSheetModel.hasMany(db.LeadSheetTagModel, {
  foreignKey: "sheetId",
  as: "tags", // Alias for association
});
db.LeadSheetTagModel.belongsTo(db.LeadSheetModel, {
  foreignKey: "sheetId",
});

db.LeadSheetModel.hasMany(db.LeadSheetColumnModel, {
  foreignKey: "sheetId",
  as: "columns", // Alias for association
});
db.LeadSheetColumnModel.belongsTo(db.LeadSheetModel, {
  foreignKey: "sheetId",
});

db.LeadModel = LeadModel(sequelize, Sequelize);
db.User.hasMany(db.LeadModel, {
  foreignKey: "userId",
  as: "leads",
});
db.LeadModel.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});
models["LeadModel"] = db.LeadModel;

db.TeamLeadAssignModel = TeamLeadAssignModel(sequelize, Sequelize);
models["TeamLeadAssignModel"] = db.TeamLeadAssignModel;

db.ScheduledBooking = ScheduledBooking(sequelize, Sequelize);

db.LeadEmailModel = LeadEmailModel(sequelize, Sequelize);

db.LeadNotesModel = LeadNotesModel(sequelize, Sequelize);

db.LeadTagsModel = LeadTagsModel(sequelize, Sequelize);

db.Pipeline = Pipeline(sequelize, Sequelize);
db.User.hasMany(db.Pipeline, {
  foreignKey: "userId",
  as: "pipelines", // Alias for association
});
db.Pipeline.belongsTo(db.User, {
  foreignKey: "pipelineId",
  as: "user", // Alias for association
});

db.PipelineStages = PipelineStages(sequelize, Sequelize);
db.Pipeline.hasMany(db.PipelineStages, {
  foreignKey: "pipelineId",
  as: "stages", // Alias for association
});
db.PipelineStages.belongsTo(db.Pipeline, {
  foreignKey: "pipelineId",
  as: "stages", // Alias for association
});
models["PipelineStages"] = db.PipelineStages;

db.TeamStageAssignModel = TeamStageAssignModel(sequelize, Sequelize);

db.StageTagModel = StageTagModel(sequelize, Sequelize);
db.PipelineStages.hasMany(db.StageTagModel, {
  foreignKey: "pipelineStageId",
  as: "tags", // Alias for association
});
db.StageTagModel.belongsTo(db.PipelineStages, {
  foreignKey: "pipelineStageId",
});

db.PipelineCadence = PipelineCadence(sequelize, Sequelize);
db.CadenceBatchModel = CadenceBatchModel(sequelize, Sequelize);
db.LeadCadence = LeadCadence(sequelize, Sequelize);

db.LeadCadence.belongsTo(db.CadenceBatchModel, { foreignKey: "batchId" });
db.CadenceBatchModel.hasMany(db.LeadCadence, { foreignKey: "batchId" });

db.CronLockTable = CronLockTable(sequelize, Sequelize);
// db.PipelineCadence.hasMany(db.LeadCadence, {
//   foreignKey: "pipelineCadenceId",
// });

// db.LeadCadence.belongsTo(db.PipelineCadence, {
//   foreignKey: "pipelineCadenceId", // Ensure this column exists in LeadCadence
//   as: "PipelineCadence",
// });

db.CadenceBatchModel.belongsTo(db.User, {
  foreignKey: "userId",
});
db.User.hasMany(db.CadenceBatchModel, {
  foreignKey: "userId",
});

db.UserActivityModel = UserActivityModel(sequelize, Sequelize);

db.CadenceBatchModel.belongsTo(db.Pipeline, {
  foreignKey: "pipelineId",
});
db.Pipeline.hasMany(db.CadenceBatchModel, {
  foreignKey: "pipelineId",
});

db.CadenceCalls = CadenceCalls(sequelize, Sequelize);

models["LeadCadence"] = db.LeadCadence;
db.LeadCallsSent = LeadCallsSent(sequelize, Sequelize);
models["LeadCallsSent"] = db.LeadCallsSent;

db.AgentModel.hasMany(db.LeadCallsSent, { foreignKey: "agentId", as: "calls" });
db.LeadCallsSent.belongsTo(db.AgentModel, {
  foreignKey: "agentId",
  as: "agent",
});

db.LeadCallTriesModel = LeadCallTriesModel(sequelize, Sequelize);
models["LeadCallTriesModel"] = db.LeadCallTriesModel;

db.LeadKycsExtracted = LeadKycsExtracted(sequelize, Sequelize);
// db.LeadModel.hasMany(db.LeadKycsExtracted, {
//   foreignKey: "leadId",
//   as: "kycs", // Alias for association
// });
// db.LeadKycsExtracted.belongsTo(db.LeadModel, {
//   foreignKey: "pipelineStageId",
// });

db.ObjectionAndGuradrails = ObjectionAndGuradrails(sequelize, Sequelize);
models["ObjectionAndGuradrails"] = db.ObjectionAndGuradrails;

db.ApiKeysModel = ApiKeysModel(sequelize, Sequelize);
models["ApiKeysModel"] = db.ApiKeysModel;

db.GhlCalendarModel = GhlCalendarModel(sequelize, Sequelize);

db.CalendarIntegration = CalendarIntegration(sequelize, Sequelize);

db.User.hasMany(db.CalendarIntegration, {
  foreignKey: "userId",
  as: "calendars",
});
db.CalendarIntegration.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});
models["CalendarIntegration"] = db.CalendarIntegration;
models["GhlCalendarModel"] = db.GhlCalendarModel;

// Run predefined setup
models["AreaOfFocus"] = db.AreaOfFocus;
await createAreaOfFocusValues(db);
models["AgentService"] = db.AgentService;
await createAgentServices(db);
models["AgentRole"] = db.AgentRole;
await createAgentDefaultRoles(db);
models["Stages"] = db.Stages;
await addDefaultStages(db);

await createAgentDefaultIndustry(db);

// Model associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

console.log("Association ", db.LeadCallsSent.associations);

export default db;

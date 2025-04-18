const LeadModel = (sequelize, Sequelize) => {
  const LeadModel = sequelize.define("LeadModel", {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true,
      // defaultValue: NULL,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    email: {
      //Community Update
      type: Sequelize.STRING,
      defaultValue: "",
    },
    phone: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    status: {
      //what's the status
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "active", // deleted
    },

    address: {
      //Address. Google map picker
      type: Sequelize.STRING,
      allowNull: true,
    },
    sheetId: {
      type: Sequelize.INTEGER,
    },
    extraColumns: {
      // JSON Text here
      type: Sequelize.TEXT("medium"),
    },
    columnMappings: {
      //Community Update
      type: Sequelize.STRING,
      defaultValue: "",
    },

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
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: "PipelineStages",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    dncCheckPassed: {
      // column to track whether this lead has passed the dnc check or not
      type: Sequelize.BOOLEAN, // by default null, if batch has dncCheck true then this value should be true in order to be called
      allowNull: true,
    },
    dncData: {
      // column to track whether this lead has passed the dnc check or not
      type: Sequelize.TEXT("medium"), // by default null, if batch has dncCheck true then this value should be true in order to be called
      allowNull: true,
    },
    enrich: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    enrichData: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
  });
  LeadModel.associate = (models) => {
    LeadModel.hasMany(models.LeadCallsSent, {
      foreignKey: "leadId",
      as: "LeadCalls",
    });
    LeadModel.hasMany(models.LeadCadence, {
      foreignKey: "leadId",
      as: "LeadCadence",
    });
  };

  // LeadModel.afterCreate(async (lead, options) => {
  //   console.log("Should enrich for lead", lead.firstName);
  //   if (options.transaction) {
  //     await options.transaction.afterCommit(async () => {});
  //   } else {
  //   }
  // });

  // LeadModel.afterBulkCreate(async (users, options) => {
  //   for (const user of users) {
  //   }
  // });

  LeadModel.prototype.sanitizeForUser = function () {
    const values = { ...this.get() };
    delete values.enrich;
    delete values.enrichData;
    return values;
  };
  return LeadModel;
};

export default LeadModel;

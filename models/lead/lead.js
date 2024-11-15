const LeadModel = (sequelize, Sequelize) => {
  const LeadModel = sequelize.define("LeadModel", {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
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
    },
    stage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 9, // 9 is the id of the "No Stage" stage
      references: {
        model: "Stages",
        key: "id",
      },
    },
  });

  return LeadModel;
};

export default LeadModel;

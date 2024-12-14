const LeadEmailModel = (sequelize, Sequelize) => {
  const LeadEmailModel = sequelize.define("LeadEmailModel", {
    email: {
      //Community Update
      type: Sequelize.STRING,
      defaultValue: "",
    },

    leadId: {
      type: Sequelize.INTEGER,
    },
  });

  return LeadEmailModel;
};

export default LeadEmailModel;

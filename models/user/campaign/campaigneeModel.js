const CampaigneeModel = (sequelize, Sequelize) => {
  const CampaigneeModel = sequelize.define("CampaigneeModel", {
    email: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    uniqueUrl: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    officeHoursUrl: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    status: {
      type: Sequelize.STRING,
      default: "Active", // Active, Paused,
    },
  });

  return CampaigneeModel;
};

export default CampaigneeModel;

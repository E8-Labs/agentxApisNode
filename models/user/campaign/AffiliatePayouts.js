const AffiliatePayout = (sequelize, Sequelize) => {
  const User = sequelize.define("AffiliatePayout", {
    amount: {
      // subject of the url
      type: Sequelize.DOUBLE,
      // defaultValue: "",
      allowNull: true,
    },

    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    affiliateId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "CampaigneeModels", // Table name (plural form)
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return User;
};

export default AffiliatePayout;

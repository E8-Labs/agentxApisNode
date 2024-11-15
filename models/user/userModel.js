const User = (sequelize, Sequelize) => {
  const User = sequelize.define("User", {
    name: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    phone: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    email: {
      type: Sequelize.STRING,
    },
    // password: {
    //   type: Sequelize.STRING,
    // },
    agentService: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AgentServices",
        key: "id",
      },
    },

    areaOfFocus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "AreaOfFocus",
        key: "id",
      },
    },
    farm: {
      type: Sequelize.STRING, //"customer", "business", "admin"
      defaultValue: "",
    },

    brokerage: {
      // we store smaller image for fast loading here
      type: Sequelize.STRING,
      defaultValue: "",
    },

    userType: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: UserTypes.RealEstateAgent,
    },
    averageTransactionPerYear: {
      // we store full size image here
      type: Sequelize.DOUBLE,
      defaultValue: 0,
    },
    inviteCodeUsed: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    myInviteCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    plan_status: {
      type: Sequelize.ENUM,
      values: ["free", "monthly", "yearly", "weekly"],
      default: "free",
      allowNull: true,
    },
  });

  return User;
};

export default User;

export const UserTypes = {
  RealEstateAgent: "RealEstateAgent",
  SolarRep: "SolarRep",
  SalesDevRep: "SalesDevRep",
  InsuranceAgent: "InsuranceAgent",
};

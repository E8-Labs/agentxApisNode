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
    full_profile_image: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    thumb_profile_image: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    // agentService: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   references: {
    //     model: "AgentServices",
    //     key: "id",
    //   },
    // },

    // areaOfFocus: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    //   references: {
    //     model: "AreaOfFocus",
    //     key: "id",
    //   },
    // },
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
    userRole: {
      // Main AgentX account, Invitee
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: UserRole.AgentX,
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
    inviteCodeRedeemed: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    plan_status: {
      type: Sequelize.ENUM,
      values: ["free", "monthly", "yearly", "weekly"],
      default: "free",
      allowNull: true,
    },
    stripeCustomerIdLive: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    stripeCustomerIdTest: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    totalSecondsAvailable: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cancelPlanRedemptions: {
      // To track if and how many times the user redeemed cancel plan gift minutes
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    projectSizeKw: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    areaOfService: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    company: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    projectsPerYear: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    primaryClientType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    website: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    timeZone: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "America/Los_Angeles",
    },
    fcm_token: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    isTrial: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    campaigneeId: {
      type: Sequelize.INTEGER,
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
  MarketerAgent: "MarketerAgent",
  WebsiteAgent: "WebsiteAgent",
  InsuranceAgent: "InsuranceAgent",
  RecruiterAgent: "RecruiterAgent",
  TaxAgent: "TaxAgent",
};

export const UserRole = {
  AgentX: "AgentX",
  Invitee: "Invitee",
  Admin: "Admin",
};

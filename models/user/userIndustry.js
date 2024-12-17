import { UserTypes } from "./userModel.js";
const UserIndustry = (sequelize, Sequelize) => {
  const UserIndustry = sequelize.define("UserIndustry", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    agentType: {
      type: Sequelize.STRING,
      defaultValue: UserTypes.RecruiterAgent,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return UserIndustry;
};

export default UserIndustry;

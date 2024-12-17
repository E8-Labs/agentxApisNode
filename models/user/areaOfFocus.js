import { UserTypes } from "./userModel.js";
const AreaOfFocus = (sequelize, Sequelize) => {
  const AreaOfFocus = sequelize.define("AreaOfFocus", {
    title: {
      type: Sequelize.STRING,
      defaultValue: "",
    },

    description: {
      type: Sequelize.STRING,
      defaultValue: "",
    },
    agentType: {
      type: Sequelize.STRING,
      defaultValue: UserTypes.RealEstateAgent,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  });

  return AreaOfFocus;
};

export default AreaOfFocus;

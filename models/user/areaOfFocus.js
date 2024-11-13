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
  });

  return AreaOfFocus;
};

export default AreaOfFocus;

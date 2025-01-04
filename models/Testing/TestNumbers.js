export const TestNumbers = (sequelize, Sequelize) => {
  const TestNumbers = sequelize.define("TestNumbers", {
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return TestNumbers;
};

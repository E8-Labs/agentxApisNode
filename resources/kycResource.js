import db from "../models/index.js";

const Op = db.Sequelize.Op;

const KycResource = async (user, currentUser = null) => {
  if (!Array.isArray(user)) {
    ////////console.log("Not array")
    return await getUserData(user, currentUser);
  } else {
    ////////console.log("Is array")
    const data = [];
    for (let i = 0; i < user.length; i++) {
      const p = await getUserData(user[i], currentUser);
      ////////console.log("Adding to index " + i)
      data.push(p);
    }

    return data;
  }
};

async function getUserData(kyc, currentUser = null) {
  let examples = await db.KycExampleModel.findAll({
    where: {
      kycId: kyc.id,
    },
  });
  const KycResource = {
    ...kyc.get(),
    examples: examples,
  };

  return KycResource;
}

export default KycResource;

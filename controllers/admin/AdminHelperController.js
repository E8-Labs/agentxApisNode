import JWT from "jsonwebtoken";
import db from "../../models/index.js";

const limit = 30;

export const PayoutAffiliate = (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let user = await db.User.findByPk(authData.user.id);
    let affilitateId = req.body.affiliateId;
    let amount = req.body.amount;

    const created = await db.AffiliatePayout.create({
      amount: amount,
      affiliateId: affilitateId,
    });

    return res.send({
      status: true,
      message: "Affiliate paid",
      data: created,
    });
  });
};

export const GetAffiliatePayouts = (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let user = await db.User.findByPk(authData.user.id);
    let affiliateId = req.query.affiliateId;
    console.log("Getting payouts for ", affiliateId);
    let payouts = await db.AffiliatePayout.findAll({
      where: {
        affiliateId,
      },
    });

    return res.send({
      status: true,
      message: "Affiliate payouts",
      data: payouts,
    });
  });
};

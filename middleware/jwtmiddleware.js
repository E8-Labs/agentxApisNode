import JWT from "jsonwebtoken";
import db from "../models/index.js";

const SignUser = async (user) => {
  return new Promise((resolve, reject) => {
    JWT.sign(
      { user },
      process.env.SecretJwtKey,
      { expiresIn: "365d" },
      async (err, token) => {
        if (err) {
          reject(err);
        } else {
          // let u = await UserProfileFullResource(user);
          resolve(token);
        }
      }
    );
  });
};

export const verifyJwtToken = async (req, response, next) => {
  const authHeaders = req.headers["authorization"];
  const apiKeyHeaders = req.headers["x-api-key"];
  console.log("Auth headers");
  console.log(authHeaders);
  if (typeof authHeaders !== "undefined") {
    const parts = authHeaders.split(" ");
    req.token = parts[1];
    next();
  } else if (typeof apiKeyHeaders !== "undefined") {
    console.log("Auth through api key");
    let Key = await db.ApiKeysModel.findOne({
      where: {
        key: apiKeyHeaders,
      },
    });
    if (Key && Key.status == "active") {
      let user = await db.User.findByPk(Key.userId);
      if (user) {
        const token = await SignUser(user);
        req.token = token;
        next();
      } else {
        response.send({
          status: false,
          message: "No such user",
          data: null,
        });
      }
    } else {
      response.status(401).send({
        status: false,
        message: "Invalid api key",
        data: null,
      });
    }
  } else {
    response.status(401).send({
      status: false,
      message: "Unauthenticated user",
      data: null,
    });
  }
};

export default verifyJwtToken;

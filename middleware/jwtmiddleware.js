import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { UserRole } from "../models/user/userModel.js";

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

export const verifyJwtTokenWithTeam = async (req, response, next) => {
  const authHeaders = req.headers["authorization"];
  const apiKeyHeaders = req.headers["x-api-key"];
  console.log("Auth headers");
  console.log(authHeaders);
  if (typeof authHeaders !== "undefined") {
    const parts = authHeaders.split(" ");
    req.token = parts[1];
    const authData = await new Promise((resolve, reject) => {
      JWT.verify(req.token, process.env.SecretJwtKey, (error, decoded) => {
        if (error) reject(error);
        else resolve(decoded);
      });
    });
    let user = authData.user;
    if (user.userRole == UserRole.Invitee) {
      console.log("User is invited");
      let invite = await db.TeamModel.findOne({
        where: {
          invitedUserId: user.id,
        },
      });
      console.log("Found invite ", invite);
      if (invite) {
        let admin = await db.User.findByPk(invite.invitingUserId);
        req.admin = admin;
        console.log("Found admin", admin);
      }
    }
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
        if (user.userRole == UserRole.Invitee) {
          let invite = await db.TeamModel.findOne({
            where: {
              invitedUserId: user.id,
            },
          });
          if (invite) {
            let admin = await db.User.findByPk(invite.invitingUserId);
            req.admin = admin;
          }
        }
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

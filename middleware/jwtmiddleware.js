import JWT from "jsonwebtoken";
import db from "../models/index.js";
import { UserRole } from "../models/user/userModel.js";
import { detectDevice } from "../utils/auth.js";

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
  let isMobile = detectDevice(req);
  const authHeaders = req.headers["authorization"];
  const apiKeyHeaders = req.headers["x-api-key"];
  console.log("Auth headers");
  console.log(authHeaders);
  let data = JSON.stringify({
    body: req.body || null,
    query: req.query || null,
    params: req.params || null,
    isMobile: isMobile,
  });
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
    db.UserActivityModel.create({
      action: req.url,
      method: req.method,
      activityData: data,
      userId: user.id,
      authMethod: "jwt",
      headers: JSON.stringify(headers),
    });
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
      db.UserActivityModel.create({
        action: req.url,
        method: req.method,
        activityData: data,
        userId: user.id,
        authMethod: "apiKey",
        headers: JSON.stringify(headers),
      });
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
  let isMobile = detectDevice(req);
  console.log("This is on mobile = ", isMobile);
  let headers = req.headers;
  const authHeaders = req.headers["authorization"];
  const apiKeyHeaders = req.headers["x-api-key"];
  console.log("Auth headers");
  console.log(authHeaders);
  let data = JSON.stringify({
    body: req.body || null,
    query: req.query || null,
    params: req.params || null,
    isMobile: isMobile,
  });
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
    db.UserActivityModel.create({
      action: req.url,
      method: req.method,
      activityData: data,
      userId: user.id,
      authMethod: "jwt",
      headers: JSON.stringify(headers),
    });
    if (user.userRole == UserRole.Invitee) {
      req.admin = user;
      // console.log("User is invited");
      let invite = await db.TeamModel.findOne({
        where: {
          invitedUserId: user.id,
        },
      });
      // console.log("Found invite ", invite);
      if (invite) {
        let admin = await db.User.findByPk(invite.invitingUserId);
        req.admin = admin;
        // console.log("Found admin", admin);
      }
    } else {
      req.admin = user;
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
      db.UserActivityModel.create({
        action: req.url,
        method: req.method,
        activityData: data,
        userId: user.id,
        authMethod: "apiKey",
        headers: JSON.stringify(headers),
      });
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

export const NoAuthMiddleware = async (req, response, next) => {
  // console.log(authHeaders);
  let isMobile = detectDevice(req);
  console.log("This is on mobile = ", isMobile);
  let data = JSON.stringify({
    body: req.body || null,
    query: req.query || null,
    params: req.params || null,
    isMobile: isMobile,
  });

  // let user = authData.user;
  db.UserActivityModel.create({
    action: req.url,
    method: req.method,
    activityData: data,
    userId: 1,
    authMethod: "none",
    headers: JSON.stringify(req.headers),
  });
  next();
};

export default verifyJwtToken;

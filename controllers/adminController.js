import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
const limit = 50;
export async function GetUsers(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;

    if (authData) {
      let userId = authData.user.id;

      // Fetch user and agents
      let user = await db.User.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access.",
        });
      }
      if (user.userType != "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access. Only admin can access this",
        });
      }

      let users = await db.User.findAll({
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: offset,
      });

      let resource = await UserProfileFullResource(users);

      return res.send({
        status: true,
        message: "users list",
        data: resource,
        offset: offset,
        limit: limit,
      });
    }
  });
}

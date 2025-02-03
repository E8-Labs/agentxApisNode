import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import UserProfileLiteResource from "../resources/userProfileLiteResource.js";
const limit = 50;
import { Op } from "sequelize";
import { UserTypes } from "../models/user/userModel.js";

export async function GetUsers(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    let offset = Number(req.query.offset || 0) || 0;
    // let limit = Number(req.query.limit || limit) || limit; // Default limit

    if (authData) {
      let userId = authData.user.id;

      // Fetch user and check role
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      if (!user) {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access.",
        });
      }
      if (user.userType !== "admin") {
        return res.status(401).send({
          status: false,
          message: "Unauthorized access. Only admin can access this",
        });
      }

      // Search parameter
      let searchQuery = req.query.search ? req.query.search.trim() : "";

      let whereCondition = {
        userRole: "AgentX",
        userType: {
          [db.Sequelize.Op.notIn]: [UserTypes.Admin],
        },
      };

      if (searchQuery) {
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${searchQuery}%` } }, // Case-insensitive LIKE
          { phone: { [Op.like]: `%${searchQuery}%` } },
          { name: { [Op.like]: `%${searchQuery}%` } },
        ];
      }

      let users = await db.User.findAll({
        where: whereCondition,
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: offset,
      });

      let resource = await UserProfileLiteResource(users);

      return res.send({
        status: true,
        message: "Users list",
        data: resource,
        offset: offset,
        limit: limit,
      });
    }
  });
}

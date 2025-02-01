import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import { GetUsers } from "../controllers/adminController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let AdminRouter = express.Router();

AdminRouter.get("/users", verifyJwtTokenWithTeam, uploadFiles, GetUsers);

export default AdminRouter;

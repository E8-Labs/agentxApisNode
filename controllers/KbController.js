// import verifyJwtToken from "../middleware/jwtmiddleware"
import JWT from "jsonwebtoken";
import db from "../models/index.js";
import mammoth from "mammoth";

import pdfExtract from "pdf-extraction";
import fs from "fs";
import path from "path";
import { ensureDirExists } from "../utils/mediaservice.js";
import { GetTeamAdminFor } from "../utils/auth.js";
export async function AddKnowledgebase(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.send({ status: false, message: "Unauthenticated User" });
    }

    let userId = authData.user.id;
    let user = await db.User.findByPk(userId);
    let admin = await GetTeamAdminFor(user);
    user = admin;
    let type = req.body.type;
    let description = req.body.description;
    let originalContent = req.body.originalContent; // Default content from request body
    let title = req.body.title || ""; //Name of document
    let pdf = null;

    if (req.files && req.files.media) {
      // Type is Document
      let file = req.files.media[0];

      const mediaBuffer = file.buffer;
      const mediaType = file.mimetype;
      const mediaExt = path.extname(file.originalname);
      const mediaFilename = `${Date.now()}${mediaExt}`;

      // Ensure directories exist
      let dir = process.env.DocsDir; // e.g., /var/www/neo/neoapis/uploads
      const docsDir = path.join(dir + "/documents");
      ensureDirExists(docsDir);

      // Save the uploaded file
      const docPath = path.join(docsDir, mediaFilename);
      fs.writeFileSync(docPath, mediaBuffer);
      pdf = `https://www.blindcircle.com/agentx/uploads/documents/${mediaFilename}`;

      // Extract text from the uploaded file based on its type
      if (mediaType.includes("pdf")) {
        try {
          const extracted = await pdfExtract(mediaBuffer);
          originalContent = extracted.text.trim(); // Extract and assign content from PDF
        } catch (err) {
          console.error("Error extracting text from PDF:", err);
          return res
            .status(500)
            .send({ status: false, message: "Error processing PDF file." });
        }
      } else if (mediaType.includes("docx") || mediaType.includes("doc")) {
        try {
          const result = await mammoth.extractRawText({ buffer: mediaBuffer });
          originalContent = result.value.trim(); // Extract and assign content from DOCX
        } catch (err) {
          console.error("Error extracting text from DOCX:", err);
          return res
            .status(500)
            .send({ status: false, message: "Error processing DOCX file." });
        }
      } else if (mediaType.includes("text") || mediaExt.includes(".txt")) {
        try {
          originalContent = mediaBuffer.toString("utf8"); // Extract and assign content from TXT
        } catch (err) {
          console.error("Error reading text file:", err);
          return res
            .status(500)
            .send({ status: false, message: "Error processing text file." });
        }
      }
    }
    // else if(type == "Text"){
    //     originalContent = req.body.originalContent;
    // }

    // Create the knowledge base entry in the database
    try {
      let kbcreated = await db.KnowledgeBase.create({
        type: type,
        originalContent: originalContent, // Use the extracted or default text content
        documentUrl: pdf,
        description: description,
        userId: userId,
        title: title,
      });

      if (kbcreated) {
        return res.send({
          status: true,
          message: "Knowledge base added",
          data: kbcreated,
        });
      }
    } catch (dbError) {
      console.error("Error creating KnowledgeBase entry:", dbError);
      return res
        .status(500)
        .send({ status: false, message: "Error saving KnowledgeBase entry." });
    }
  });
}

export async function GetKnowledgebase(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.send({ status: false, message: "Unauthenticated User" });
    }

    let userId = authData.user.id;
    let user = await db.User.findByPk(userId);
    let admin = await GetTeamAdminFor(user);
    user = admin;

    let kb = await db.KnowledgeBase.findAll({
      where: {
        userId: user.id,
      },
    });

    return res.send({
      message: "Kb",
      status: true,
      data: kb,
    });
  });
}

export async function DeleteKnowledgebase(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.send({ status: false, message: "Unauthenticated User" });
    }

    let kbId = req.body.kbId;
    let userId = authData.user.id;
    let user = await db.User.findByPk(userId);

    let admin = await GetTeamAdminFor(user);
    user = admin;

    let del = await db.KnowledgeBase.destroy({
      where: {
        id: kbId,
      },
    });
    let kb = await db.KnowledgeBase.findAll({
      where: {
        userId: user.Id,
      },
    });

    return res.send({
      message: "Kb",
      status: true,
      data: kb,
    });
  });
}

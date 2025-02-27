// import verifyJwtToken from "../middleware/jwtmiddleware"
import JWT from "jsonwebtoken";
import db from "../models/index.js";
import mammoth from "mammoth";
import axios from "axios";

import pdfExtract from "pdf-extraction";
import fs from "fs";
import path from "path";
import { ensureDirExists } from "../utils/mediaservice.js";
import { GetTeamAdminFor } from "../utils/auth.js";
import { addToVectorDb, findVectorData } from "../services/pineconeDb.js";
import { CallOpenAi } from "../services/GptService.js";
import { GptPrompts } from "../constants/GptPrompts.js";

function getYouTubeVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*[?&]v=)([^&]+)/);
  return match ? match[1] : null;
}

export async function AddKnowledgebase(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.send({ status: false, message: "Unauthenticated User" });
    }

    console.log(req.files);
    let userId = authData.user.id;
    let user = await db.User.findByPk(userId);
    let admin = await GetTeamAdminFor(user);
    user = admin;
    let documentName = req.body.documentName;
    let type = req.body.type;
    let description = req.body.description;
    let originalContent = req.body.originalContent; // Default content from request body
    let title = req.body.title || ""; //Name of document
    let pdf = null;
    let webUrl = "";

    let agentId = req.body.agentId;
    let mainAgentId = req.body.mainAgentId;

    let agent = await db.AgentModel.findByPk(agentId);

    if (req.files && req.files.media) {
      // console.log("Found file uploaded", req.files);
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
      pdf = `${
        process.env.Environment == "Development"
          ? "https://www.blindcircle.com/agentxtest"
          : "https://www.blindcircle.com/agentx"
      }/uploads/documents/${mediaFilename}`;

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

    if (type == "Url") {
      webUrl = originalContent;
      originalContent = "";
      //process with gpt
      let prompt = GptPrompts.WeburlPrompt;
      prompt = prompt.replace(new RegExp("{website}", "g"), webUrl);
      let result = await CallOpenAi(prompt);
      if (result.status) {
        let totalCost = result.cost || 0;
        let content = result.message;
        originalContent = content;
      } else {
        console.log("Could not summarize web url");
        return res.send({
          status: false,
          message: "Some error occurred while processing the url",
        });
      }
    }
    if (type == "Youtube") {
      webUrl = originalContent;
      originalContent = "";
      let vidId = getYouTubeVideoId(webUrl);
      let transcript = await fetchVideoCaptionsAndProcessWithPrompt(
        vidId,
        user
      );
      originalContent = transcript;
    }
    // else if(type == "Text"){
    //     originalContent = req.body.originalContent;
    // }

    // Create the knowledge base entry in the database
    try {
      let kbcreated = await db.KnowledgeBase.create({
        type: type,
        originalContent: originalContent, // Use the extracted or default text content
        webUrl: webUrl,
        documentUrl: pdf,
        documentName: documentName,
        description: description,
        userId: userId,
        title: title,
        mainAgentId: agent.mainAgentId,
        agentId: agentId,
      });

      let added = await addToVectorDb(originalContent, user, agent, type, {
        mainAgentId: agent.mainAgentId,
        date: new Date(),
        kbId: kbcreated.id,
      });
      // console.log("Vector added ", added);

      if (kbcreated) {
        return res.send({
          status: true,
          message: "Knowledge base added",
          data: kbcreated,
        });
      }
    } catch (dbError) {
      console.error("Error creating KnowledgeBase entry:", dbError.message);
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

    let agentId = req.query.agentId;
    let userId = authData.user.id;
    let user = await db.User.findByPk(userId);
    let admin = await GetTeamAdminFor(user);
    user = admin;

    let kb = await db.KnowledgeBase.findAll({
      where: {
        userId: user.id,
        agentId: agentId,
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

export async function SearchKb(req, res) {
  let question = req.query.user_question;
  let modelId = req.query.modelId;
  let agent = await db.AgentModel.findOne({
    where: {
      modelId: modelId,
    },
  });

  if (!agent) {
    return res.send({
      status: false,
      message: "No such agent",
    });
  }
  let user = await db.User.findByPk(agent.userId);
  //find the data from vector db
  let response = await findVectorData(question, user, agent);
  if (response) {
    return res.send({
      status: false,
      message: "Found answer",
      data: response,
    });
  } else {
    return res.send({
      status: false,
      message: "Nothing found",
    });
  }
}

//Youtube Video Transcripts
export const fetchVideoCaptionsAndProcessWithPrompt = async (videoId, user) => {
  let data = "";

  console.log("Fetching Transcript", user.id);
  // return;
  let transcript = "";

  if (transcript == null || transcript == "") {
    console.log("Dont have transcript. Fetching New");
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://www.searchapi.io/api/v1/search?api_key=${process.env.YoutubeSearchApiKey}&engine=youtube_transcripts&video_id=${videoId}`,
      headers: {
        Authorization: `Bearer ${process.env.YoutubeSearchApiKey}`,
      },
      data: data,
    };

    let response = await axios.request(config);
    let resData = response.data;
    if (resData.error) {
      return null;
    } else {
      // continue
    }
    console.log("Fetched Transcript");

    resData.transcripts.map((t) => {
      transcript += t.text ? t.text : "";
    });
  } else {
    console.log("Already have transcript. Using that.");
  }

  //add the transcript to vdb

  if (transcript == null || transcript == "") {
    return null;
  }
  return transcript;
};

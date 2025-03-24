import sharp from "sharp"; // For image processing
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
// import { generateThumbnail } from '../utils/generateThumbnail.js';

export const generateThumbnail = async (buffer) => {
  return await sharp(buffer)
    .resize(400, 400) // Adjust size as needed
    .toBuffer();
};

export const createThumbnailAndUpload = async (
  fileContent,
  fieldname,
  folder = "media"
) => {
  const image = sharp(fileContent);
  const metadata = await image.metadata();
  const width = 420;
  const height = Math.round((metadata.height / metadata.width) * width);

  const thumbnailBuffer = await image.resize(width, height).toBuffer();
  const thumbnailUrl = await uploadMedia(
    `thumbnail_${fieldname}`,
    thumbnailBuffer,
    "image/jpeg",
    folder
  );
  return thumbnailUrl;
};

export const uploadMedia = (
  fieldname,
  fileContent,
  mime = "image/jpeg",
  folder = "media",
  currentDate = new Date().toISOString().slice(0, 10),
  newUUID = uuidv4()
) => {
  const resolvedDocsDir = path.resolve(process.env.DocsDir);
  console.log("Resolved DocsDir Path:", resolvedDocsDir);
  return new Promise((resolve, reject) => {
    try {
      let dir = process.env.DocsDir; // e.g., /var/www/neo/neoapis/uploads
      const docsDir = path.join(dir + `/${folder}`);
      ensureDirExists(docsDir);

      // Get the appropriate file extension based on the mime type
      let extension = "";
      switch (mime) {
        case "image/jpeg":
        case "image/jpg":
          extension = ".jpg";
          break;
        case "image/png":
          extension = ".png";
          break;
        case "image/gif":
          extension = ".gif";
          break;
        default:
          extension = ""; // If you want to handle more types, add cases here
      }

      // Check if the fieldname already has an extension
      // const currentDate = new Date().toISOString().slice(0, 10); // Formats as YYYY-MM-DD
      // const newUUID = uuidv4();
      if (!path.extname(fieldname)) {
        // Append the extension if it's missing
        fieldname = `${currentDate}_${newUUID}_${fieldname}${extension}`;
      } else {
        fieldname = `${currentDate}_${newUUID}_${fieldname}`;
      }

      const docPath = path.join(docsDir, fieldname);
      fs.writeFileSync(docPath, fileContent);
      const BaseUrl =
        process.env.Environment == "Sandbox"
          ? "https://www.blindcircle.com/agentxtest/uploads/"
          : "https://www.blindcircle.com/agentx/uploads/";
      let image = `${BaseUrl}${folder}/${fieldname}`;
      console.log("File uploaded is ", image);

      resolve(image);
    } catch (error) {
      reject(error);
    }
  });
};

export const generateAudioFilePath = (
  fileName = "recording",
  recordingUrl = "",
  folder = "recordings",
  currentDate = new Date().toISOString().slice(0, 10),
  newUUID = uuidv4()
) => {
  let extension = "";
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      extension = ".jpg";
      break;
    case "image/png":
      extension = ".png";
      break;
    case "image/gif":
      extension = ".gif";
      break;
    default:
      extension = ""; // If you want to handle more types, add cases here
  }

  // Check if the fieldname already has an extension
  // const currentDate = new Date().toISOString().slice(0, 10); // Formats as YYYY-MM-DD
  // const newUUID = uuidv4();
  if (!path.extname(fileName)) {
    // Append the extension if it's missing
    fileName = `${currentDate}_${newUUID}_${fileName}${extension}`;
  } else {
    fileName = `${currentDate}_${newUUID}_${fileName}`;
  }

  // const docPath = path.join(docsDir, fileName)
  const BaseUrl =
    process.env.Environment == "Sandbox"
      ? "https://www.blindcircle.com/agentxtest/uploads/"
      : "https://www.blindcircle.com/agentx/uploads/";
  let path = `${BaseUrl}${folder}/${fileName}`;
  return path;
};

export const downloadAndStoreRecording = async (
  recordingUrl,
  fileName = "recording",
  folder = "recordings",
  currentDate = new Date().toISOString().slice(0, 10),
  newUUID = uuidv4()
) => {
  try {
    // Download the recording as a buffer
    const response = await axios.get(recordingUrl, {
      responseType: "arraybuffer",
    });
    const fileContent = Buffer.from(response.data);

    // Try to guess the mime type from the URL
    let mimeType = mime.lookup(recordingUrl) || "audio/mpeg";

    // You can change the folder name if needed
    const uploadedUrl = await uploadMedia(
      fileName,
      fileContent,
      mimeType,
      folder,
      currentDate,
      newUUID
    );

    return uploadedUrl;
  } catch (error) {
    console.error("Error downloading and storing Twilio recording:", error);
    throw error;
  }
};
// DocsDir="/var/www/voiceapp/voiceapis/uploads"
// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

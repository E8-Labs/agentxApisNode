import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function WriteToFile(string) {
  console.log(string);

  const folderPath = path.join(__dirname, "/Files");
  const chunkFilePath = path.join(folderPath, "LogFile.txt");

  // Check if the folder exists, create it if it doesn't
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true }); // Recursive ensures nested directories
  }

  // Check if the file exists, create it if it doesn't
  if (!fs.existsSync(chunkFilePath)) {
    fs.writeFileSync(chunkFilePath, "", "utf8"); // Create an empty file
  }

  // Append the string to the file
  fs.appendFileSync(chunkFilePath, string + "\n\n", "utf8");
}

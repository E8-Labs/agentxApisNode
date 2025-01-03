import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import { WriteToFile } from "./FileService.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function WriteToFile(string) {
  console.log(string);
  let chunkFilePath = path.join(__dirname, `/Files/LogFile.txt`);
  fs.appendFileSync(chunkFilePath, string + "\n\n", "utf8");
}

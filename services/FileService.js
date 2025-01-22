import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lockFilePath = path.join(__dirname, "/Files/lockfile.txt");

export async function WriteToFile(string, string2 = null) {
  if (string2) {
    string += " " + string2;
  }
  console.log(string);

  const folderPath = path.join(__dirname, "/Files");
  const chunkFilePath = path.join(folderPath, "LogFile.txt");

  // Ensure the folder exists
  try {
    await fs.mkdir(folderPath, { recursive: true });
  } catch (err) {
    console.error("Error creating folder:", err.message);
  }

  // Append the string to the file
  try {
    await fs.appendFile(chunkFilePath, string + "\n\n", "utf8");
  } catch (err) {
    console.error("Error writing to file:", err.message);
  }
}

async function createOrGetFile(filename = "lockfile.txt") {
  const folderPath = path.join(__dirname, "/Files");
  const filePath = path.join(folderPath, filename);

  // Ensure the folder exists
  try {
    await fs.mkdir(folderPath, { recursive: true });
  } catch (err) {
    console.error("Error creating folder:", err.message);
  }

  // Create an empty file if it doesn't exist
  try {
    await fs.writeFile(filePath, "", { flag: "wx" }); // "wx" ensures it doesn't overwrite if it exists
  } catch (err) {
    if (err.code !== "EEXIST") {
      console.error("Error creating file:", err.message);
    }
  }
  return filePath;
}

export async function TryToLockFile() {
  try {
    const lockFilePath = await createOrGetFile("lockfile.txt");
    try {
      // Check if lock file exists
      await fs.access(lockFilePath);
      console.log("Task is already running. Skipping execution.");
      return false; // Exit if lock file exists
    } catch {
      // Lock file does not exist; proceed
    }

    // Create the lock file
    await fs.writeFile(lockFilePath, "locked", "utf8");
    console.log("Lock file created. Task started.");
    return true;
  } catch (err) {
    console.error("Error creating lock file:", err.message);
    return false;
  }
}

export async function RemoveLock() {
  try {
    const lockFilePath = await createOrGetFile("lockfile.txt");
    await fs.unlink(lockFilePath);
    console.log("Lock file removed. Task finished.");
    return true;
  } catch (err) {
    console.error("Failed to remove lock file:", err.message);
    return false;
  }
}

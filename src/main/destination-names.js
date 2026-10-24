const fs = require("node:fs/promises");
const path = require("node:path");

function splitFileName(fileName) {
  const extension = path.extname(fileName);
  return extension
    ? { baseName: fileName.slice(0, -extension.length), extension }
    : { baseName: fileName, extension: "" };
}

function nextAvailableFileName(fileName, existingNames) {
  const existing = new Set([...existingNames].map((name) => name.toLocaleLowerCase()));
  if (!existing.has(fileName.toLocaleLowerCase())) return fileName;

  const { baseName, extension } = splitFileName(fileName);
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${baseName} (${suffix})${extension}`;
    if (!existing.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

async function readExistingNames(directoryPath) {
  try {
    return await fs.readdir(directoryPath);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

module.exports = { nextAvailableFileName, readExistingNames };

const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { isInsideRoot } = require("./scanner");

function samePath(first, second) {
  const resolvedFirst = path.resolve(first);
  const resolvedSecond = path.resolve(second);
  return process.platform === "win32"
    ? resolvedFirst.toLowerCase() === resolvedSecond.toLowerCase()
    : resolvedFirst === resolvedSecond;
}

async function readPurposeFolders(indexPath, roots) {
  let content;
  try {
    content = await fs.readFile(indexPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  let entries;
  try {
    entries = JSON.parse(content);
  } catch (error) {
    throw new Error(`The purpose-folder list could not be read: ${error.message}`);
  }
  if (!Array.isArray(entries)) throw new Error("The purpose-folder list has an invalid format.");

  const validated = [];
  for (const entry of entries) {
    if (!entry || typeof entry.name !== "string" || typeof entry.path !== "string" ||
        typeof entry.parentType !== "string") {
      throw new Error("The purpose-folder list contains an invalid entry.");
    }
    const root = roots.find((item) => item.id === entry.parentType);
    if (!root || !path.isAbsolute(entry.path)) {
      throw new Error(`The purpose-folder entry "${entry.name}" is outside the approved folders.`);
    }
    const resolvedPath = path.resolve(entry.path);
    let canonicalRoot;
    try {
      canonicalRoot = await fs.realpath(root.path);
    } catch (error) {
      if (!["ENOENT", "EACCES", "EPERM"].includes(error.code)) throw error;
      const lexicalRoot = path.resolve(root.path);
      if (!isInsideRoot(lexicalRoot, resolvedPath)) {
        throw new Error(`The purpose-folder entry "${entry.name}" is outside the approved folders.`);
      }
      validated.push({
        name: entry.name,
        path: resolvedPath,
        parentType: entry.parentType,
        available: false
      });
      continue;
    }
    const canonicalParent = await fs.realpath(path.dirname(resolvedPath));
    const canonicalCandidate = path.join(canonicalParent, path.basename(resolvedPath));
    if (!isInsideRoot(canonicalRoot, canonicalParent) || !isInsideRoot(canonicalRoot, canonicalCandidate)) {
      throw new Error(`The purpose-folder entry "${entry.name}" is outside the approved folders.`);
    }

    let available = true;
    let storedPath = canonicalCandidate;
    try {
      const realPath = await fs.realpath(canonicalCandidate);
      if (!isInsideRoot(canonicalRoot, realPath)) {
        throw new Error(`The purpose-folder entry "${entry.name}" is outside the approved folders.`);
      }
      storedPath = realPath;
      if (!(await fs.stat(realPath)).isDirectory()) {
        available = false;
      }
    } catch (error) {
      if (error.code === "ENOENT") available = false;
      else throw error;
    }
    validated.push({
      name: entry.name,
      path: storedPath,
      parentType: entry.parentType,
      available
    });
  }
  return validated;
}

async function addPurposeFolder(indexPath, roots, entry) {
  const root = roots.find((item) => item.id === entry.parentType);
  if (!root) throw new Error("That parent folder is not one of the approved locations.");
  const canonicalRoot = await fs.realpath(root.path);
  const folderPath = path.resolve(entry.path);
  const canonicalParent = await fs.realpath(path.dirname(folderPath));
  if (!isInsideRoot(canonicalRoot, canonicalParent)) {
    throw new Error("The purpose folder must be inside an approved folder.");
  }
  const canonicalFolder = path.join(canonicalParent, path.basename(folderPath));
  const realFolderPath = await fs.realpath(canonicalFolder);
  if (!isInsideRoot(canonicalRoot, realFolderPath) || !(await fs.stat(realFolderPath)).isDirectory()) {
    throw new Error("The purpose folder is not available inside the approved location.");
  }

  const entries = await readPurposeFolders(indexPath, roots);
  const existing = entries.find((item) => samePath(item.path, realFolderPath));
  if (existing) return existing;

  const nextEntries = [
    ...entries.map(({ name, path: existingPath, parentType }) => ({
      name,
      path: existingPath,
      parentType
    })),
    { name: entry.name, path: realFolderPath, parentType: entry.parentType }
  ];
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  const temporaryPath = `${indexPath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(nextEntries, null, 2)}\n`, { flag: "wx" });
    await fs.rename(temporaryPath, indexPath);
  } catch (error) {
    try {
      await fs.unlink(temporaryPath);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        throw new Error(`${error.message} The temporary purpose-folder file could not be removed: ${cleanupError.message}`);
      }
    }
    throw error;
  }
  return { name: entry.name, path: realFolderPath, parentType: entry.parentType, available: true };
}

module.exports = { addPurposeFolder, readPurposeFolders };

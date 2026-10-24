const fs = require("node:fs/promises");
const path = require("node:path");

const FOLDER_DEFINITIONS = [
  ["documents", "Documents", "documents"],
  ["downloads", "Downloads", "downloads"],
  ["desktop", "Desktop", "desktop"],
  ["pictures", "Pictures", "pictures"],
  ["music", "Music", "music"],
  ["videos", "Videos", "videos"]
];

function createFolderRoots(getPath) {
  return FOLDER_DEFINITIONS.map(([id, label, pathName]) => ({
    id,
    label,
    path: getPath(pathName)
  }));
}

function isInsideRoot(rootPath, targetPath) {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

async function getCanonicalRoot(root) {
  try {
    const realPath = await fs.realpath(root.path);
    const stats = await fs.stat(realPath);
    if (!stats.isDirectory()) {
      return { ...root, canonicalPath: null, error: "This location is not a folder." };
    }
    return { ...root, canonicalPath: realPath, error: null };
  } catch (error) {
    return { ...root, canonicalPath: null, error: error.message };
  }
}

async function scanDirectory(root, directoryPath, files) {
  let entries;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    return [{ path: directoryPath, message: error.message }];
  }

  const errors = [];
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) continue;

    let realEntryPath;
    try {
      realEntryPath = await fs.realpath(entryPath);
      if (!isInsideRoot(root.canonicalPath, realEntryPath)) continue;
    } catch (error) {
      errors.push({ path: entryPath, message: error.message });
      continue;
    }

    if (entry.isDirectory()) {
      errors.push(...await scanDirectory(root, realEntryPath, files));
    } else if (entry.isFile()) {
      try {
        const stats = await fs.stat(realEntryPath);
        files.push({
          name: entry.name,
          path: realEntryPath,
          rootId: root.id,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString()
        });
      } catch (error) {
        errors.push({ path: entryPath, message: error.message });
      }
    }
  }
  return errors;
}

async function scanFolders(roots) {
  const folders = [];
  for (const root of roots) {
    const canonicalRoot = await getCanonicalRoot(root);
    if (!canonicalRoot.canonicalPath) {
      folders.push({
        id: root.id,
        label: root.label,
        path: root.path,
        available: false,
        fileCount: 0,
        errors: [{ path: root.path, message: canonicalRoot.error }]
      });
      continue;
    }

    const files = [];
    const errors = await scanDirectory(canonicalRoot, canonicalRoot.canonicalPath, files);
    folders.push({
      id: root.id,
      label: root.label,
      path: root.path,
      available: true,
      fileCount: files.length,
      files,
      errors
    });
  }
  return folders;
}

async function listDirectory(roots, rootId, relativeDirectory = "") {
  const root = roots.find((item) => item.id === rootId);
  if (!root) throw new Error("That folder is not available.");

  const canonicalRoot = await getCanonicalRoot(root);
  if (!canonicalRoot.canonicalPath) throw new Error(canonicalRoot.error);
  if (path.isAbsolute(relativeDirectory)) throw new Error("That location is outside the selected folder.");

  const requestedPath = path.resolve(canonicalRoot.canonicalPath, relativeDirectory);
  if (!isInsideRoot(canonicalRoot.canonicalPath, requestedPath)) {
    throw new Error("That location is outside the selected folder.");
  }

  const realPath = await fs.realpath(requestedPath);
  if (!isInsideRoot(canonicalRoot.canonicalPath, realPath)) {
    throw new Error("That location is outside the selected folder.");
  }

  const entries = await fs.readdir(realPath, { withFileTypes: true });
  return Promise.all(entries
    .filter((entry) => !entry.isSymbolicLink())
    .map(async (entry) => {
      const entryPath = path.join(realPath, entry.name);
      let modifiedAt = null;
      try {
        modifiedAt = (await fs.stat(entryPath)).mtime.toISOString();
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return {
        name: entry.name,
        kind: entry.isDirectory() ? "folder" : entry.isFile() ? "file" : "other",
        modifiedAt
      };
    }));
}

module.exports = { createFolderRoots, isInsideRoot, listDirectory, scanFolders };

const fs = require("node:fs/promises");
const path = require("node:path");
const { isInsideRoot } = require("./scanner");
const { nextAvailableFileName, readExistingNames } = require("./destination-names");

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function normalizeFolderName(value) {
  if (typeof value !== "string") throw new Error("Enter a folder name or leave it empty.");
  const name = value.trim();
  if (!name) return "";
  if (name.length > 80) throw new Error("Folder names must be 80 characters or fewer.");
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(name) || /[. ]$/.test(name) || name === "." || name === "..") {
    throw new Error("That folder name contains characters Windows cannot use.");
  }
  if (WINDOWS_RESERVED_NAMES.test(name)) throw new Error("That folder name is reserved by Windows.");
  return name;
}

async function getAllowedRoot(roots, rootId) {
  const root = roots.find((item) => item.id === rootId);
  if (!root) throw new Error("That destination is not one of the approved folders.");
  const canonicalPath = await fs.realpath(root.path);
  const stats = await fs.stat(canonicalPath);
  if (!stats.isDirectory()) throw new Error("That destination is not a folder.");
  return { ...root, canonicalPath };
}

async function resolveDestinationDirectory(root, folderName, create) {
  if (!folderName) return root.canonicalPath;
  const destination = path.join(root.canonicalPath, folderName);
  let stats;
  try {
    stats = await fs.lstat(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!stats && create) {
    try {
      await fs.mkdir(destination);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    stats = await fs.lstat(destination);
  }
  if (!stats) return destination;
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error("The destination must be a real folder inside the selected location.");
  }
  const canonicalDestination = await fs.realpath(destination);
  if (!isInsideRoot(root.canonicalPath, canonicalDestination)) {
    throw new Error("The destination folder is outside the approved location.");
  }
  return canonicalDestination;
}

function normalizeComparablePath(value) {
  return path.resolve(value).toLocaleLowerCase();
}

async function findSuggestionDestination(pending, suggestion, destinationRootId, requestedFolderName) {
  const folderName = normalizeFolderName(requestedFolderName);
  const root = await getAllowedRoot(pending.roots, destinationRootId);
  const directory = await resolveDestinationDirectory(root, folderName, false);
  const existingNames = await readExistingNames(directory);
  const reservedNames = [];
  for (const other of pending.suggestions.values()) {
    if (other.id === suggestion.id || !other.destinationPath) continue;
    if (normalizeComparablePath(path.dirname(other.destinationPath)) === normalizeComparablePath(directory)) {
      reservedNames.push(path.basename(other.destinationPath));
    }
  }
  const fileName = nextAvailableFileName(suggestion.fileName, [...existingNames, ...reservedNames]);
  return {
    destinationRootId,
    folderName,
    root,
    directory,
    destinationPath: path.join(directory, fileName)
  };
}

async function removeCreatedCopy(targetPath, originalError) {
  try {
    await fs.unlink(targetPath);
  } catch (cleanupError) {
    throw new Error(`${originalError.message} The source file was preserved, but the extra copy at ${targetPath} could not be removed: ${cleanupError.message}`);
  }
  throw new Error(`${originalError.message} The source file was preserved and the incomplete copy was removed.`);
}

async function moveSuggestedFile(roots, suggestion, destinationRootId, requestedFolderName, expectedPath) {
  const folderName = normalizeFolderName(requestedFolderName);
  if (typeof suggestion.fileName !== "string" ||
      /[\\/]/.test(suggestion.fileName) ||
      path.basename(suggestion.fileName) !== suggestion.fileName) {
    throw new Error("The scanned file name is not valid for a move.");
  }
  const sourceRoot = await getAllowedRoot(roots, suggestion.sourceRootId);
  const destinationRoot = await getAllowedRoot(roots, destinationRootId);
  const sourcePath = path.resolve(sourceRoot.canonicalPath, suggestion.sourceRelativePath);
  if (!isInsideRoot(sourceRoot.canonicalPath, sourcePath)) {
    throw new Error("The source file is outside the approved folders.");
  }
  const sourceStats = await fs.lstat(sourcePath);
  if (sourceStats.isSymbolicLink() || !sourceStats.isFile()) {
    throw new Error("The source file changed after scanning and cannot be moved safely.");
  }
  const canonicalSource = await fs.realpath(sourcePath);
  if (!isInsideRoot(sourceRoot.canonicalPath, canonicalSource)) {
    throw new Error("The source file is outside the approved folders.");
  }
  if (sourceStats.size !== suggestion.fileSizeBytes ||
      sourceStats.mtime.toISOString() !== suggestion.modifiedAt) {
    throw new Error("The file changed after the scan. Rescan before moving it.");
  }

  const destinationDirectory = await resolveDestinationDirectory(destinationRoot, folderName, true);
  const targetPath = path.resolve(expectedPath);
  if (!isInsideRoot(destinationRoot.canonicalPath, targetPath) ||
      normalizeComparablePath(path.dirname(targetPath)) !== normalizeComparablePath(destinationDirectory)) {
    throw new Error("The proposed file destination is outside the approved folder.");
  }
  if (normalizeComparablePath(canonicalSource) === normalizeComparablePath(targetPath)) {
    throw new Error("The file is already in that location.");
  }

  await fs.copyFile(canonicalSource, targetPath, fs.constants.COPYFILE_EXCL);
  try {
    const sourceAfterCopy = await fs.stat(canonicalSource);
    if (sourceAfterCopy.size !== sourceStats.size || sourceAfterCopy.mtimeMs !== sourceStats.mtimeMs) {
      throw new Error("The file changed while it was being moved.");
    }
    await fs.utimes(targetPath, sourceAfterCopy.atime, sourceAfterCopy.mtime);
    await fs.unlink(canonicalSource);
  } catch (error) {
    await removeCreatedCopy(
      targetPath,
      new Error(`Could not complete the move: ${error.message}`)
    );
  }
  return targetPath;
}

function createMoveSuggestionQueue(roots, initialSuggestions, { createThumbnail } = {}) {
  const pending = {
    roots,
    suggestions: new Map(initialSuggestions.map((suggestion) => [suggestion.id, suggestion]))
  };

  return {
    list() {
      return [...pending.suggestions.values()];
    },
    skip(suggestionId) {
      if (!pending.suggestions.has(suggestionId)) {
        throw new Error("That suggestion is no longer available. Rescan to refresh it.");
      }
      pending.suggestions.delete(suggestionId);
    },
    async preview(suggestionId, destinationRootId, requestedFolderName) {
      const suggestion = pending.suggestions.get(suggestionId);
      if (!suggestion) throw new Error("That suggestion is no longer available. Rescan to refresh it.");
      const destination = await findSuggestionDestination(
        pending,
        suggestion,
        destinationRootId ?? suggestion.destinationRootId,
        requestedFolderName ?? suggestion.purposeFolderName
      );
      suggestion.destinationRootId = destination.destinationRootId;
      suggestion.destinationRootLabel = destination.root.label;
      suggestion.purposeFolderName = destination.folderName;
      suggestion.destinationPath = destination.destinationPath;
      return require("./preview").buildFilePreview(
        roots,
        suggestion,
        destination.destinationPath,
        createThumbnail
      );
    },
    async approve(suggestionId, destinationRootId, requestedFolderName, expectedPath) {
      const suggestion = pending.suggestions.get(suggestionId);
      if (!suggestion) throw new Error("That suggestion is no longer available. Rescan to refresh it.");
      const destination = await findSuggestionDestination(
        pending,
        suggestion,
        destinationRootId,
        requestedFolderName
      );
      if (!expectedPath || normalizeComparablePath(expectedPath) !== normalizeComparablePath(destination.destinationPath)) {
        return {
          requiresReview: true,
          destinationPath: destination.destinationPath,
          fileName: suggestion.fileName
        };
      }
      let destinationPath;
      try {
        destinationPath = await moveSuggestedFile(
          roots,
          suggestion,
          destinationRootId,
          destination.folderName,
          expectedPath
        );
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const refreshed = await findSuggestionDestination(
          pending,
          suggestion,
          destinationRootId,
          destination.folderName
        );
        return {
          requiresReview: true,
          destinationPath: refreshed.destinationPath,
          fileName: suggestion.fileName
        };
      }
      pending.suggestions.delete(suggestionId);
      return { fileName: suggestion.fileName, destinationPath };
    }
  };
}

module.exports = {
  createMoveSuggestionQueue,
  moveSuggestedFile,
  normalizeFolderName
};

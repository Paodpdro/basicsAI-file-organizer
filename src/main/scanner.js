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
const STAT_CONCURRENCY = 16;
const SKIPPED_FOLDER_REASONS = new Map([
  ["node_modules", "Dependency cache"],
  [".git", "Version-control data"],
  [".cache", "Application cache"],
  [".npm", "Package-manager cache"],
  [".pnpm-store", "Package-manager cache"],
  [".yarn", "Package-manager cache"],
  [".gradle", "Build cache"],
  [".next", "Generated framework cache"],
  [".turbo", "Build cache"],
  [".pytest_cache", "Test cache"],
  [".mypy_cache", "Type-checker cache"],
  ["__pycache__", "Python bytecode cache"],
  [".venv", "Python virtual environment"],
  ["venv", "Python virtual environment"]
]);

function createLimiter(limit) {
  const waiting = [];
  let active = 0;
  return (task) => new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          waiting.shift()?.();
        });
    };
    if (active < limit) start();
    else waiting.push(start);
  });
}

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

async function getCanonicalRoot(root, stat = fs.stat) {
  try {
    const realPath = await fs.realpath(root.path);
    const stats = await stat(realPath);
    if (!stats.isDirectory()) {
      return { ...root, canonicalPath: null, error: "This location is not a folder." };
    }
    return { ...root, canonicalPath: realPath, error: null };
  } catch (error) {
    return { ...root, canonicalPath: null, error: error.message };
  }
}

async function countFilesInDirectory(root, directoryPath, errors) {
  let entries;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    errors.push({ path: directoryPath, message: error.message, kind: "folder" });
    return 0;
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));
  let fileCount = 0;
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      try {
        const realEntryPath = await fs.realpath(entryPath);
        if (isInsideRoot(root.canonicalPath, realEntryPath)) {
          fileCount += await countFilesInDirectory(root, realEntryPath, errors);
        }
      } catch (error) {
        errors.push({ path: entryPath, message: error.message, kind: "folder" });
      }
    } else if (entry.isFile()) {
      fileCount += 1;
    }
  }
  return fileCount;
}

async function scanDirectory(root, directoryPath, state) {
  let entries;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    state.errors.push({ path: directoryPath, message: error.message, kind: "folder" });
    return;
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      let realEntryPath;
      try {
        realEntryPath = await fs.realpath(entryPath);
      } catch (error) {
        state.errors.push({ path: entryPath, message: error.message, kind: "folder" });
        continue;
      }
      if (!isInsideRoot(root.canonicalPath, realEntryPath)) continue;
      const exclusionReason = SKIPPED_FOLDER_REASONS.get(entry.name.toLowerCase());
      if (exclusionReason) {
        const skipped = { name: entry.name, path: realEntryPath, reason: exclusionReason };
        state.skippedFolders.push(skipped);
        const skippedFileCount = await countFilesInDirectory(root, realEntryPath, state.errors);
        state.fileCount += skippedFileCount;
        state.progressCount += skippedFileCount;
        state.onProgress({
          rootId: root.id,
          rootLabel: root.label,
          scannedCount: state.scannedCount + state.progressCount
        });
      } else {
        await scanDirectory(root, realEntryPath, state);
      }
    } else if (entry.isFile()) {
      const fileIndex = state.files.length;
      state.files.push(null);
      state.pending.push(state.runStat(async () => {
        try {
          const realEntryPath = await fs.realpath(entryPath);
          if (!isInsideRoot(root.canonicalPath, realEntryPath)) return;
          const stats = await state.stat(realEntryPath);
          state.files[fileIndex] = {
            name: entry.name,
            path: realEntryPath,
            rootId: root.id,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString()
          };
          state.fileCount += 1;
        } catch (error) {
          state.errors.push({ path: entryPath, message: error.message, kind: "file" });
        } finally {
          state.progressCount += 1;
          state.onProgress({
            rootId: root.id,
            rootLabel: root.label,
            scannedCount: state.scannedCount + state.progressCount
          });
        }
      }));
    }
  }
}

async function scanFolders(roots, {
  concurrency = STAT_CONCURRENCY,
  stat = fs.stat,
  onProgress = () => {},
  onFolderTiming = () => {}
} = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Scan concurrency must be a positive integer.");
  }
  if (typeof stat !== "function" || typeof onProgress !== "function" || typeof onFolderTiming !== "function") {
    throw new Error("Scan callbacks must be functions.");
  }

  const folders = [];
  let scannedCount = 0;
  for (const root of roots) {
    const startedAt = Date.now();
    const canonicalRoot = await getCanonicalRoot(root, stat);
    if (!canonicalRoot.canonicalPath) {
      const folder = {
        id: root.id,
        label: root.label,
        path: root.path,
        available: false,
        fileCount: 0,
        files: [],
        errors: [{ path: root.path, message: canonicalRoot.error }],
        skippedFolders: []
      };
      folders.push(folder);
      onProgress({
        rootId: root.id,
        rootLabel: root.label,
        scannedCount,
        complete: true
      });
      onFolderTiming({ rootId: root.id, rootLabel: root.label, durationMs: Date.now() - startedAt });
      continue;
    }

    const state = {
      files: [],
      errors: [],
      skippedFolders: [],
      fileCount: 0,
      progressCount: 0,
      scannedCount,
      pending: [],
      runStat: createLimiter(concurrency),
      stat,
      onProgress
    };
    onProgress({ rootId: root.id, rootLabel: root.label, scannedCount });
    await scanDirectory(canonicalRoot, canonicalRoot.canonicalPath, state);
    await Promise.all(state.pending);
    state.errors.sort((left, right) => left.path.localeCompare(right.path));
    const folder = {
      id: root.id,
      label: root.label,
      path: root.path,
      available: true,
      fileCount: state.fileCount,
      files: state.files.filter(Boolean),
      errors: state.errors,
      skippedFolders: state.skippedFolders
    };
    folders.push(folder);
    scannedCount += state.progressCount;
    onProgress({
      rootId: root.id,
      rootLabel: root.label,
      scannedCount,
      complete: true
    });
    onFolderTiming({
      rootId: root.id,
      rootLabel: root.label,
      durationMs: Date.now() - startedAt,
      fileCount: folder.fileCount
    });
  }
  return folders;
}

async function listDirectory(roots, rootId, relativeDirectory = "") {
  const root = roots.find((item) => item.id === rootId);
  if (!root) throw new Error("That folder is not available.");
  if (typeof relativeDirectory !== "string") throw new Error("That folder location is not valid.");

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
      let sizeBytes = null;
      try {
        const stats = await fs.stat(entryPath);
        modifiedAt = stats.mtime.toISOString();
        if (entry.isFile()) sizeBytes = stats.size;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return {
        rootId,
        name: entry.name,
        kind: entry.isDirectory() ? "folder" : entry.isFile() ? "file" : "other",
        path: entryPath,
        relativePath: path.relative(canonicalRoot.canonicalPath, entryPath),
        sizeBytes,
        modifiedAt
      };
    }));
}

async function resolveFilePath(roots, rootId, relativeFile) {
  const root = roots.find((item) => item.id === rootId);
  if (!root) throw new Error("That file is outside the approved folders.");
  if (typeof relativeFile !== "string" || path.isAbsolute(relativeFile)) {
    throw new Error("That file is outside the approved folders.");
  }

  const canonicalRoot = await getCanonicalRoot(root);
  if (!canonicalRoot.canonicalPath) throw new Error(canonicalRoot.error);
  const candidate = path.resolve(canonicalRoot.canonicalPath, relativeFile);
  if (!isInsideRoot(canonicalRoot.canonicalPath, candidate)) {
    throw new Error("That file is outside the approved folders.");
  }
  const before = await fs.lstat(candidate);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error("The selected item is not a safe file.");
  }
  const realPath = await fs.realpath(candidate);
  if (!isInsideRoot(canonicalRoot.canonicalPath, realPath)) {
    throw new Error("That file is outside the approved folders.");
  }
  return { path: realPath, root: canonicalRoot, stats: await fs.stat(realPath) };
}

module.exports = {
  createFolderRoots,
  isInsideRoot,
  listDirectory,
  resolveFilePath,
  scanFolders,
  SKIPPED_FOLDER_REASONS,
  STAT_CONCURRENCY
};

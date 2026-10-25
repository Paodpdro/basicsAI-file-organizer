const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { isInsideRoot } = require("./scanner");
const { nextAvailableFileName, readExistingNames } = require("./destination-names");

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".log"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".heic"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const DOCUMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".rtf", ".odt", ".ppt", ".pptx", ".xls", ".xlsx"]);
const TYPE_LABELS = {
  ".7z": "7Z",
  ".aac": "AAC",
  ".avi": "AVI",
  ".bmp": "BMP",
  ".csv": "CSV",
  ".doc": "DOC",
  ".docx": "DOCX",
  ".flac": "FLAC",
  ".gif": "GIF",
  ".heic": "HEIC",
  ".jpeg": "JPEG",
  ".jpg": "JPG",
  ".js": "JS",
  ".json": "JSON",
  ".ino": "INO",
  ".log": "LOG",
  ".m4a": "M4A",
  ".mkv": "MKV",
  ".md": "MD",
  ".mp3": "MP3",
  ".mp4": "MP4",
  ".mov": "MOV",
  ".odt": "ODT",
  ".ogg": "OGG",
  ".pdf": "PDF",
  ".png": "PNG",
  ".ppt": "PPT",
  ".pptx": "PPTX",
  ".rtf": "RTF",
  ".txt": "TXT",
  ".wav": "WAV",
  ".webm": "WEBM",
  ".webp": "WEBP",
  ".xls": "XLS",
  ".xlsx": "XLSX",
  ".zip": "ZIP"
};
const MAX_TEXT_BYTES = 512 * 1024;
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_PDF_PAGES = 4;
const PDFJS_ROOT = path.resolve(path.dirname(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")), "../..");
const PDFJS_CMAP_URL = pathToFileURL(`${path.join(PDFJS_ROOT, "cmaps")}${path.sep}`).href;
const PDFJS_STANDARD_FONT_DATA_URL = pathToFileURL(
  `${path.join(PDFJS_ROOT, "standard_fonts")}${path.sep}`
).href;

let pdfjsPromise;

function createPdfJsOptions(pdfjs, data) {
  return {
    data,
    cMapUrl: PDFJS_CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS
  };
}

function fileTypeLabel(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return TYPE_LABELS[extension] ?? (extension ? extension.slice(1).toUpperCase() : "Unknown");
}

async function readFileBytes(roots, file, limit) {
  const root = roots.find((item) => item.id === file.rootId);
  if (!root) throw new Error("The file is outside the approved folders.");

  const canonicalRoot = await fs.realpath(root.path);
  const entryStats = await fs.lstat(file.path);
  if (entryStats.isSymbolicLink() || !entryStats.isFile()) {
    throw new Error("The file changed after scanning and cannot be read safely.");
  }
  const canonicalFile = await fs.realpath(file.path);
  if (!isInsideRoot(canonicalRoot, canonicalFile)) {
    throw new Error("The file is outside the approved folders.");
  }

  const handle = await fs.open(canonicalFile, "r");
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) throw new Error("The scanned item is no longer a file.");
    if (stats.size > limit) return { skipped: true, size: stats.size };
    const content = Buffer.alloc(stats.size);
    let bytesRead = 0;
    while (bytesRead < content.length) {
      const result = await handle.read(content, bytesRead, content.length - bytesRead, bytesRead);
      if (result.bytesRead === 0) break;
      bytesRead += result.bytesRead;
    }
    return { content: content.subarray(0, bytesRead) };
  } finally {
    await handle.close();
  }
}

async function extractText(roots, file) {
  const extension = path.extname(file.name).toLowerCase();
  if (TEXT_EXTENSIONS.has(extension)) {
    const result = await readFileBytes(roots, file, MAX_TEXT_BYTES);
    if (result.skipped) {
      return { text: "", warning: "Text extraction was skipped because this file is larger than 512 KB." };
    }
    return { text: result.content.toString("utf8"), warning: null };
  }
  if (extension !== ".pdf") return { text: "", warning: null };

  const result = await readFileBytes(roots, file, MAX_PDF_BYTES);
  if (result.skipped) {
    return { text: "", warning: "PDF text extraction was skipped because this file is larger than 6 MB." };
  }
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = await pdfjsPromise;
  const loadingTask = pdfjs.getDocument(createPdfJsOptions(pdfjs, new Uint8Array(result.content)));
  try {
    const document = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, MAX_PDF_PAGES); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str ?? "").join(" "));
    }
    return { text: pages.join(" "), warning: null };
  } finally {
    await loadingTask.destroy();
  }
}

function classifyFile(file, searchableText, roots) {
  const extension = path.extname(file.name).toLowerCase();
  const haystack = `${file.name}\n${searchableText}`.toLowerCase();
  const rootById = new Map(roots.map((root) => [root.id, root]));

  if (extension === ".ino" || /\barduino\b/.test(haystack)) {
    return {
      destinationRootId: "documents",
      purposeFolderName: "Arduino",
      reason: "Arduino files belong together in an Arduino folder in Documents."
    };
  }
  if (IMAGE_EXTENSIONS.has(extension) && /\bqatar\b/.test(haystack)) {
    return {
      destinationRootId: "pictures",
      purposeFolderName: "Qatar Images",
      reason: "File names mentioning Qatar point to a Qatar Images folder in Pictures."
    };
  }
  if (/\bminecraft\b/.test(haystack)) {
    return {
      destinationRootId: "desktop",
      purposeFolderName: "Minecraft",
      reason: "File names or readable text mentioning Minecraft point to a Minecraft folder on Desktop."
    };
  }
  if (/\bwebtech\s*2\b/.test(haystack)) {
    return {
      destinationRootId: "documents",
      purposeFolderName: "Webtech 2",
      reason: "File names or readable text mentioning Webtech 2 point to a matching folder in Documents."
    };
  }
  if (/\bresearch\b|\bthesis\b|\bacademic paper\b|\bliterature review\b|\bjournal article\b/.test(haystack)) {
    return {
      destinationRootId: "documents",
      purposeFolderName: "Research",
      reason: "File names or readable text mentioning research point to a Research folder in Documents."
    };
  }
  if (/\bstudy\b|\bcourse notes\b|\blecture notes\b|\bassignment\b|\bstudy materials\b|\bstudent records\b/.test(haystack)) {
    return {
      destinationRootId: "documents",
      purposeFolderName: "Study Materials",
      reason: "File names or readable text suggest study materials for a Study Materials folder in Documents."
    };
  }

  const destinationByType = [
    [IMAGE_EXTENSIONS, "pictures", "Pictures"],
    [AUDIO_EXTENSIONS, "music", "Music"],
    [VIDEO_EXTENSIONS, "videos", "Videos"],
    [DOCUMENT_EXTENSIONS, "documents", "Documents"]
  ];
  const destination = destinationByType.find(([extensions]) => extensions.has(extension));
  if (!destination) return null;
  const [, destinationRootId, label] = destination;
  if (!rootById.has(destinationRootId)) return null;
  return {
    destinationRootId,
    purposeFolderName: "",
    reason: `These files may fit in ${label}.`
  };
}

const UNSAFE_READ_CODES = new Set(["EACCES", "EBUSY", "EIO", "ENOENT", "EPERM", "ETXTBSY"]);

function isUnsafeToHandle(error) {
  return UNSAFE_READ_CODES.has(error.code) ||
    /outside the approved folders|changed after scanning|cannot be read safely|no longer be read/i.test(error.message);
}

async function findProjectRoots(files, canonicalRoots) {
  const filesByDirectory = new Map();
  for (const file of files) {
    const rootPath = canonicalRoots.get(file.rootId);
    if (!rootPath) continue;
    const directory = path.dirname(file.path);
    if (path.resolve(directory) !== path.resolve(rootPath)) continue;
    const entries = filesByDirectory.get(directory) ?? [];
    entries.push(path.basename(file.name).toLowerCase());
    filesByDirectory.set(directory, entries);
  }

  const projectRoots = new Set();
  for (const rootPath of canonicalRoots.values()) {
    const names = filesByDirectory.get(rootPath) ?? [];
    const nameSet = new Set(names);
    const hasProjectFile =
      nameSet.has("package.json") ||
      names.some((name) => [".ino", ".sln"].includes(path.extname(name))) ||
      (names.some((name) => path.extname(name) === ".py") && nameSet.has("requirements.txt"));
    let hasGitMarker = false;
    try {
      await fs.lstat(path.join(rootPath, ".git"));
      hasGitMarker = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (hasProjectFile || hasGitMarker) projectRoots.add(rootPath);
  }
  return projectRoots;
}

async function resolveExistingDestinationDirectory(rootPath, folderName) {
  const destination = path.resolve(rootPath, folderName || ".");
  if (!isInsideRoot(rootPath, destination)) {
    throw new Error("The proposed destination is outside the approved folder.");
  }
  let stats;
  try {
    stats = await fs.lstat(destination);
  } catch (error) {
    if (error.code === "ENOENT") return destination;
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error("The proposed destination is not a safe folder.");
  }
  const canonicalDestination = await fs.realpath(destination);
  if (!isInsideRoot(rootPath, canonicalDestination)) {
    throw new Error("The proposed destination is outside the approved folder.");
  }
  return canonicalDestination;
}

async function buildMoveSuggestions(folders, roots) {
  const files = folders.flatMap((folder) => folder.files ?? []);
  const skippedFiles = folders.flatMap((folder) =>
    folder.errors
      .filter((error) => error.kind === "file")
      .map((error) => ({
        fileName: path.basename(error.path),
        path: error.path,
        reason: `This file cannot be safely read or handled: ${error.message}`
      }))
  );
  const rootsById = new Map(roots.map((root) => [root.id, root]));
  const canonicalRoots = new Map();
  for (const root of roots) {
    const canonicalPath = await fs.realpath(root.path).catch((error) => {
      if (!["EACCES", "ENOENT", "EPERM"].includes(error.code)) throw error;
      return null;
    });
    if (canonicalPath) canonicalRoots.set(root.id, canonicalPath);
  }

  const projectRoots = await findProjectRoots(files, canonicalRoots);
  const analyzedFiles = [];
  for (const file of files) {
    const rootPath = canonicalRoots.get(file.rootId);
    if (!rootPath || !isInsideRoot(rootPath, file.path)) {
      skippedFiles.push({
        fileName: file.name,
        path: file.path,
        reason: "The containing folder could not be checked safely."
      });
      continue;
    }
    const relativePath = path.relative(rootPath, file.path);
    const pathSegments = relativePath.split(path.sep);
    if (pathSegments.length > 1) {
      analyzedFiles.push({
        file,
        organizedPath: path.join(rootPath, pathSegments[0])
      });
      continue;
    }
    if (projectRoots.has(rootPath)) {
      analyzedFiles.push({ file, organizedPath: rootPath });
      continue;
    }

    let searchableText = "";
    try {
      const extracted = await extractText(roots, file);
      searchableText = extracted.text;
    } catch (error) {
      if (!isUnsafeToHandle(error)) {
        analyzedFiles.push({
          file,
          destination: classifyFile(file, searchableText, roots)
        });
        continue;
      }
      skippedFiles.push({
        fileName: file.name,
        path: file.path,
        reason: `This file cannot be safely read or handled: ${error.message}`
      });
      continue;
    }
    analyzedFiles.push({
      file,
      destination: classifyFile(file, searchableText, roots)
    });
  }

  const suggestions = [];
  const organizedCounts = new Map();
  for (const { file, organizedPath, destination } of analyzedFiles) {
    if (organizedPath) {
      organizedCounts.set(organizedPath, (organizedCounts.get(organizedPath) ?? 0) + 1);
      continue;
    }
    const rootPath = canonicalRoots.get(file.rootId);
    if (!destination || !rootsById.has(destination.destinationRootId)) continue;
    if (file.rootId === destination.destinationRootId && !destination.purposeFolderName) continue;

    const destinationRoot = rootsById.get(destination.destinationRootId);
    suggestions.push({
      id: randomUUID(),
      fileName: file.name,
      sourcePath: file.path,
      sourceRootId: file.rootId,
      sourceRootLabel: rootsById.get(file.rootId)?.label ?? file.rootId,
      sourceRelativePath: path.relative(rootPath, file.path),
      fileSizeBytes: file.sizeBytes,
      modifiedAt: file.modifiedAt,
      typeLabel: fileTypeLabel(file.name),
      destinationRootId: destination.destinationRootId,
      destinationRootLabel: destinationRoot.label,
      purposeFolderName: destination.purposeFolderName,
      reason: destination.reason,
      destinationPath: ""
    });
  }

  const usedNamesByDirectory = new Map();
  const safeSuggestions = [];
  for (const suggestion of suggestions) {
    const rootPath = canonicalRoots.get(suggestion.destinationRootId);
    let destinationDirectory;
    try {
      destinationDirectory = await resolveExistingDestinationDirectory(
        rootPath,
        suggestion.purposeFolderName
      );
    } catch (error) {
      skippedFiles.push({
        fileName: suggestion.fileName,
        path: suggestion.sourcePath,
        reason: `The destination could not be checked safely: ${error.message}`
      });
      continue;
    }
    let usedNames = usedNamesByDirectory.get(destinationDirectory);
    if (!usedNames) {
      try {
        usedNames = new Set((await readExistingNames(destinationDirectory)).map((name) => name.toLowerCase()));
      } catch (error) {
        skippedFiles.push({
          fileName: suggestion.fileName,
          path: suggestion.sourcePath,
          reason: `The destination could not be checked safely: ${error.message}`
        });
        continue;
      }
      usedNamesByDirectory.set(destinationDirectory, usedNames);
    }
    const targetName = nextAvailableFileName(suggestion.fileName, usedNames);
    usedNames.add(targetName.toLowerCase());
    suggestion.destinationPath = path.join(destinationDirectory, targetName);
    suggestion.destinationFileName = targetName;
    safeSuggestions.push(suggestion);
  }

  const alreadyOrganized = [...organizedCounts]
    .map(([organizedPath, fileCount]) => ({
      path: organizedPath,
      folderName: path.basename(organizedPath),
      fileCount
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { suggestions: safeSuggestions, skippedFiles, alreadyOrganized };
}

module.exports = {
  buildMoveSuggestions,
  createPdfJsOptions,
  extractText,
  fileTypeLabel,
  isUnsafeToHandle
};

const fs = require("node:fs/promises");
const path = require("node:path");
const { isInsideRoot } = require("./scanner");
const { fileTypeLabel } = require("./analyzer");

const MAX_TEXT_PREVIEW_BYTES = 50 * 1024;
const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const TEXT_TYPES = new Set([".txt", ".md", ".json", ".csv", ".js"]);

async function resolvePreviewFile(roots, file) {
  const root = roots.find((item) => item.id === file.sourceRootId);
  if (!root) throw new Error("The file is outside the approved folders.");
  const canonicalRoot = await fs.realpath(root.path);
  const sourcePath = path.resolve(canonicalRoot, file.sourceRelativePath);
  if (!isInsideRoot(canonicalRoot, sourcePath)) {
    throw new Error("The file is outside the approved folders.");
  }
  const before = await fs.lstat(sourcePath);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error("The file changed after scanning and cannot be previewed safely.");
  }
  const realPath = await fs.realpath(sourcePath);
  if (!isInsideRoot(canonicalRoot, realPath)) {
    throw new Error("The file is outside the approved folders.");
  }
  const stats = await fs.stat(realPath);
  return { realPath, stats };
}

async function readTextPreview(realPath, size) {
  const bytesToRead = Math.min(size, MAX_TEXT_PREVIEW_BYTES);
  const handle = await fs.open(realPath, "r");
  try {
    const buffer = Buffer.alloc(bytesToRead);
    let bytesRead = 0;
    while (bytesRead < bytesToRead) {
      const result = await handle.read(buffer, bytesRead, bytesToRead - bytesRead, bytesRead);
      if (result.bytesRead === 0) break;
      bytesRead += result.bytesRead;
    }
    return buffer.subarray(0, bytesRead).toString("utf8").replace(/^\uFEFF/, "");
  } finally {
    await handle.close();
  }
}

async function buildFilePreview(roots, file, destinationPath, createThumbnail) {
  const extension = path.extname(file.fileName).toLowerCase();
  const result = {
    fileName: file.fileName,
    sizeBytes: file.fileSizeBytes,
    type: fileTypeLabel(file.fileName),
    modifiedAt: file.modifiedAt,
    sourcePath: file.sourcePath,
    destinationPath,
    kind: "unavailable"
  };

  try {
    const { realPath, stats } = await resolvePreviewFile(roots, file);
    result.sizeBytes = stats.size;
    result.modifiedAt = stats.mtime.toISOString();
    if (IMAGE_TYPES.has(extension)) {
      if (typeof createThumbnail !== "function") {
        throw new Error("Image preview is unavailable in this app session.");
      }
      result.dataUrl = await createThumbnail(realPath);
      result.kind = "image";
    } else if (TEXT_TYPES.has(extension)) {
      result.text = await readTextPreview(realPath, stats.size);
      result.truncated = stats.size > MAX_TEXT_PREVIEW_BYTES;
      result.kind = "text";
    } else {
      result.reason = "Preview unavailable for this file type.";
    }
  } catch (error) {
    result.kind = "error";
    result.error = error.message;
  }
  return result;
}

module.exports = { buildFilePreview, MAX_TEXT_PREVIEW_BYTES };

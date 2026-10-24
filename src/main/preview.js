const fs = require("node:fs/promises");
const path = require("node:path");
const { resolveFilePath } = require("./scanner");
const { extractText, fileTypeLabel } = require("./analyzer");

const MAX_TEXT_PREVIEW_BYTES = 50 * 1024;
const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const TEXT_TYPES = new Set([".txt", ".md", ".json", ".csv", ".js"]);

async function resolvePreviewFile(roots, file) {
  const { path: realPath, stats } = await resolveFilePath(
    roots,
    file.sourceRootId,
    file.sourceRelativePath
  );
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

async function buildBrowseFilePreview(roots, rootId, relativePath, createThumbnail) {
  const root = roots.find((item) => item.id === rootId);
  const fileName = path.basename(relativePath || "");
  const result = {
    fileName,
    sizeBytes: null,
    type: fileTypeLabel(fileName),
    modifiedAt: null,
    sourcePath: root ? path.resolve(root.path, relativePath) : relativePath,
    kind: "unavailable"
  };

  try {
    const file = {
      sourceRootId: rootId,
      sourceRelativePath: relativePath,
      fileName,
      fileSizeBytes: null,
      modifiedAt: null,
      sourcePath: result.sourcePath
    };
    const { realPath, stats } = await resolvePreviewFile(roots, file);
    result.sourcePath = realPath;
    result.sizeBytes = stats.size;
    result.modifiedAt = stats.mtime.toISOString();
    const extension = path.extname(fileName).toLowerCase();
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
    } else if (extension === ".pdf") {
      const extracted = await extractText(roots, {
        rootId,
        path: realPath,
        name: fileName
      });
      const encodedText = Buffer.from(extracted.text, "utf8");
      const textBytes = encodedText.subarray(0, MAX_TEXT_PREVIEW_BYTES);
      result.text = new TextDecoder("utf-8").decode(textBytes);
      result.truncated = encodedText.byteLength > MAX_TEXT_PREVIEW_BYTES;
      result.kind = result.text.trim() ? "text" : "unavailable";
      result.reason = result.text.trim()
        ? "PDF text preview"
        : extracted.warning || "No selectable text is available for preview.";
    } else {
      result.reason = "Preview unavailable for this file type.";
    }
  } catch (error) {
    result.kind = "error";
    result.error = error.message;
  }
  return result;
}

module.exports = { buildBrowseFilePreview, buildFilePreview, MAX_TEXT_PREVIEW_BYTES };

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { buildMoveSuggestions, createPdfJsOptions } = require("../src/main/analyzer");
const { searchFileRecords } = require("../src/main/file-search");
const { createMoveSuggestionQueue } = require("../src/main/file-operations");
const { addPurposeFolder, readPurposeFolders } = require("../src/main/purpose-folder-store");
const { buildBrowseFilePreview, MAX_TEXT_PREVIEW_BYTES } = require("../src/main/preview");
const { scanFolders } = require("../src/main/scanner");

const FOLDER_NAMES = ["Documents", "Downloads", "Desktop", "Pictures", "Music", "Videos"];

async function createFixture(t) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "organizer-moves-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const roots = FOLDER_NAMES.map((label) => ({
    id: label.toLowerCase(),
    label,
    path: path.join(temporaryRoot, label)
  }));
  await Promise.all(roots.map(async (root) => {
    await fs.mkdir(root.path, { recursive: true });
    root.path = await fs.realpath(root.path);
  }));
  return roots;
}

function createPdf(text) {
  const escapedText = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const stream = `BT /F1 12 Tf 50 100 Td (${escapedText}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  document += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  document += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document);
}

async function scanAndBuildSuggestions(roots) {
  const folders = await scanFolders(roots);
  return buildMoveSuggestions(folders, roots);
}

function findSuggestion(suggestions, fileName) {
  return suggestions.find((suggestion) => suggestion.fileName === fileName);
}

test("configures PDF.js with bundled CMaps and standard fonts and suppresses warnings", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const options = createPdfJsOptions(pdfjs, new Uint8Array());
  const packageRoot = path.resolve(
    path.dirname(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")),
    "../.."
  );

  assert.equal(options.cMapUrl, pathToFileURL(`${path.join(packageRoot, "cmaps")}${path.sep}`).href);
  assert.equal(
    options.standardFontDataUrl,
    pathToFileURL(`${path.join(packageRoot, "standard_fonts")}${path.sep}`).href
  );
  assert.equal(options.cMapPacked, true);
  assert.equal(options.verbosity, pdfjs.VerbosityLevel.ERRORS);
  assert.equal((await fs.stat(fileURLToPath(options.cMapUrl))).isDirectory(), true);
  assert.equal((await fs.stat(fileURLToPath(options.standardFontDataUrl))).isDirectory(), true);
});

async function comparablePath(filePath) {
  return path.join(await fs.realpath(path.dirname(filePath)), path.basename(filePath)).toLowerCase();
}

test("does not use PDF content for purpose suggestions and marks unmatched text files Needs preview", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "A17.pdf");
  const unmatchedTextPath = path.join(roots.find((root) => root.id === "downloads").path, "chapter.txt");
  await fs.writeFile(sourcePath, createPdf("A short research paper about marine plants."));
  await fs.writeFile(unmatchedTextPath, "These are research notes.");

  const { suggestions, skippedFiles, needsPreview } = await scanAndBuildSuggestions(roots);
  const pdfSuggestion = findSuggestion(suggestions, "A17.pdf");

  assert.equal(pdfSuggestion.destinationRootId, "documents");
  assert.equal(pdfSuggestion.purposeFolderName, "");
  assert.doesNotMatch(pdfSuggestion.reason, /research/i);
  assert.equal(skippedFiles.length, 0);
  assert.equal(needsPreview.length, 1);
  assert.equal(needsPreview[0].fileName, "chapter.txt");
  assert.match(needsPreview[0].reason, /Preview it/);
  assert.equal(await fs.readFile(sourcePath).then((content) => content.subarray(0, 5).toString()), "%PDF-");
});

test("creates an independent move card for each file even when destinations match", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  await fs.writeFile(path.join(downloads.path, "study-notes.docx"), "docx");
  await fs.writeFile(path.join(downloads.path, "study-slides.pptx"), "pptx");
  await fs.writeFile(path.join(downloads.path, "study-course.pdf"), createPdf("Course notes"));

  const { suggestions } = await scanAndBuildSuggestions(roots);
  const cards = suggestions.filter((suggestion) => suggestion.purposeFolderName === "Study Materials");

  assert.equal(cards.length, 3);
  assert.equal(new Set(cards.map((suggestion) => suggestion.id)).size, 3);
  assert.deepEqual(cards.map((suggestion) => suggestion.fileName).sort(), [
    "study-course.pdf",
    "study-notes.docx",
    "study-slides.pptx"
  ]);
});

test("suggests only loose root files and summarizes existing subfolders as already organized", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  const projectCases = [
    ["git-project", [".git"]],
    ["node-project", ["package.json"]],
    ["python-project", ["main.py", "requirements.txt"]],
    ["solution-project", ["app.sln"]],
    ["Arduino", ["board.ino"]],
    ["Research", ["research-notes.txt"]],
    ["1.Bun", ["research-notes.txt"]],
    ["QU", ["study-notes.txt"]]
  ];

  for (const [folderName, markers] of projectCases) {
    const folderPath = path.join(downloads.path, folderName);
    await fs.mkdir(folderPath, { recursive: true });
    for (const marker of markers) {
      const markerPath = path.join(folderPath, marker);
      if (marker === ".git") await fs.mkdir(markerPath);
      else await fs.writeFile(markerPath, marker.endsWith(".txt") ? "research notes" : "project marker");
    }
    await fs.writeFile(path.join(folderPath, "research-file.txt"), "ordinary file");
  }

  const nestedProject = path.join(downloads.path, "nested-project");
  await fs.mkdir(path.join(nestedProject, ".git"), { recursive: true });
  await fs.mkdir(path.join(nestedProject, "src"));
  await fs.writeFile(path.join(nestedProject, "src", "research-notes.txt"), "research notes");
  await fs.writeFile(path.join(downloads.path, "study-loose.txt"), "study notes");

  const desktop = roots.find((root) => root.id === "desktop");
  await fs.writeFile(path.join(desktop.path, "package.json"), "{}");
  await fs.writeFile(path.join(desktop.path, "research-project-notes.txt"), "research notes");

  const { suggestions, alreadyOrganized, skippedFiles } = await scanAndBuildSuggestions(roots);
  const organizedNames = new Set(alreadyOrganized.map((folder) => folder.folderName));

  for (const [folderName] of projectCases) assert.ok(organizedNames.has(folderName), folderName);
  assert.ok(organizedNames.has("nested-project"));
  assert.ok(organizedNames.has("Desktop"));
  assert.deepEqual(suggestions.map((suggestion) => suggestion.fileName), ["study-loose.txt"]);
  assert.equal(skippedFiles.length, 0);
  assert.ok(alreadyOrganized.every((folder) => folder.fileCount > 0));
  assert.equal(alreadyOrganized.find((folder) => folder.folderName === "1.Bun").fileCount, 2);
  assert.equal(alreadyOrganized.find((folder) => folder.folderName === "Desktop").fileCount, 2);
});

test("keeps unmatched content-oriented files out of skipped files", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  await fs.writeFile(path.join(downloads.path, "unknown-extension.xyz"), "not classifiable");
  await fs.writeFile(path.join(downloads.path, "research-corrupt.pdf"), "not a real PDF");
  await fs.writeFile(path.join(downloads.path, "research-large.txt"), Buffer.alloc(600 * 1024, "x"));
  await fs.writeFile(path.join(downloads.path, "meeting.txt"), "research notes");

  const result = await scanAndBuildSuggestions(roots);

  assert.equal(Object.hasOwn(result, "warnings"), false);
  assert.equal(result.skippedFiles.length, 0);
  assert.ok(result.suggestions.some((suggestion) => suggestion.fileName === "research-corrupt.pdf"));
  assert.ok(result.suggestions.some((suggestion) => suggestion.fileName === "research-large.txt"));
  assert.deepEqual(result.needsPreview.map((file) => file.fileName), ["meeting.txt"]);
});

test("lists a metadata read failure as skipped with a reason", async (t) => {
  const roots = await createFixture(t);
  const folders = await scanFolders(roots);
  const downloads = folders.find((folder) => folder.id === "downloads");
  const downloadsPath = await fs.realpath(roots.find((root) => root.id === "downloads").path);
  downloads.errors.push({
    path: path.join(downloadsPath, "research-locked.txt"),
    message: "Permission denied",
    kind: "file"
  });

  const { suggestions, skippedFiles } = await buildMoveSuggestions(folders, roots);

  assert.equal(suggestions.some((suggestion) => suggestion.fileName === "research-locked.txt"), false);
  assert.equal(skippedFiles.length, 1);
  assert.equal(skippedFiles[0].fileName, "research-locked.txt");
  assert.match(skippedFiles[0].reason, /cannot be safely read or handled/);
});

test("skip for now dismisses one suggestion without moving its source", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-notes.md");
  const originalContent = "Research notes for class.";
  await fs.writeFile(sourcePath, originalContent);
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-notes.md");
  const queue = createMoveSuggestionQueue(roots, suggestions);

  queue.skip(suggestion.id);

  assert.equal(await fs.readFile(sourcePath, "utf8"), originalContent);
  assert.equal(queue.list().some((item) => item.id === suggestion.id), false);
});

test("approval moves only the selected file after preview and preserves its contents", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  const firstPath = path.join(downloads.path, "research-notes.md");
  const secondPath = path.join(downloads.path, "research-plan.md");
  await fs.writeFile(firstPath, "Research notes");
  await fs.writeFile(secondPath, "Research plan");
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const queue = createMoveSuggestionQueue(roots, suggestions);
  const suggestion = findSuggestion(suggestions, "research-notes.md");

  const preview = await queue.preview(suggestion.id, "documents", "Research");
  assert.equal(await fs.readFile(firstPath, "utf8"), "Research notes");
  assert.match(preview.destinationPath, /Documents[\\/]Research[\\/]research-notes\.md$/);

  const result = await queue.approve(
    suggestion.id,
    "documents",
    "Research",
    preview.destinationPath
  );

  assert.equal(result.fileName, "research-notes.md");
  assert.equal(await fs.readFile(result.destinationPath, "utf8"), "Research notes");
  assert.equal(await fs.readFile(secondPath, "utf8"), "Research plan");
  assert.equal(queue.list().length, 1);
});

test("previews and moves a colliding file to the first free numbered name", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-notes.md");
  const destinationDirectory = path.join(roots.find((root) => root.id === "documents").path, "Research");
  await fs.mkdir(destinationDirectory);
  await fs.writeFile(sourcePath, "new contents");
  const existingPath = path.join(destinationDirectory, "research-notes.md");
  await fs.writeFile(existingPath, "keep this existing file");
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-notes.md");
  const queue = createMoveSuggestionQueue(roots, suggestions);

  const preview = await queue.preview(suggestion.id, "documents", "Research");

  assert.equal(
    await comparablePath(preview.destinationPath),
    await comparablePath(path.join(destinationDirectory, "research-notes (2).md"))
  );
  const result = await queue.approve(suggestion.id, "documents", "Research", preview.destinationPath);

  assert.equal(await comparablePath(result.destinationPath), await comparablePath(preview.destinationPath));
  assert.equal(await fs.readFile(existingPath, "utf8"), "keep this existing file");
  assert.equal(await fs.readFile(result.destinationPath, "utf8"), "new contents");
  await assert.rejects(fs.stat(sourcePath), { code: "ENOENT" });
});

test("requires renewed preview and approval if a destination name becomes occupied", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-notes.txt");
  await fs.writeFile(sourcePath, "Research notes");
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-notes.txt");
  const queue = createMoveSuggestionQueue(roots, suggestions);
  const originalPreview = await queue.preview(suggestion.id, "documents", "Research");
  await fs.mkdir(path.dirname(originalPreview.destinationPath), { recursive: true });
  await fs.writeFile(originalPreview.destinationPath, "created after preview");

  const firstAttempt = await queue.approve(
    suggestion.id,
    "documents",
    "Research",
    originalPreview.destinationPath
  );

  assert.equal(firstAttempt.requiresReview, true);
  assert.equal(await fs.readFile(sourcePath, "utf8"), "Research notes");
  const refreshedPreview = await queue.preview(suggestion.id, "documents", "Research");
  assert.equal(refreshedPreview.destinationPath, path.join(path.dirname(originalPreview.destinationPath), "research-notes (2).txt"));

  const result = await queue.approve(
    suggestion.id,
    "documents",
    "Research",
    refreshedPreview.destinationPath
  );
  assert.equal(result.destinationPath, refreshedPreview.destinationPath);
  assert.equal(await fs.readFile(originalPreview.destinationPath, "utf8"), "created after preview");
});

test("assigns unique preview names to duplicate source names", async (t) => {
  const roots = await createFixture(t);
  const sourceName = "research-summary.md";
  for (const rootId of ["downloads", "desktop"]) {
    await fs.writeFile(path.join(roots.find((root) => root.id === rootId).path, sourceName), `Research notes from ${rootId}`);
  }
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const duplicateSuggestions = suggestions.filter((suggestion) => suggestion.fileName === sourceName);
  const targetNames = duplicateSuggestions.map((suggestion) => path.basename(suggestion.destinationPath));

  assert.equal(duplicateSuggestions.length, 2);
  assert.deepEqual(targetNames.sort(), ["research-summary (2).md", "research-summary.md"]);
});

test("previews the first 50 KB of supported text as plain text", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-notes.txt");
  const untrustedText = "<script>do not execute</script>\n" + "x".repeat(MAX_TEXT_PREVIEW_BYTES);
  await fs.writeFile(sourcePath, untrustedText);
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-notes.txt");
  const queue = createMoveSuggestionQueue(roots, suggestions);

  const preview = await queue.preview(suggestion.id, "documents", "Research");

  assert.equal(preview.kind, "text");
  assert.equal(preview.sizeBytes, Buffer.byteLength(untrustedText));
  assert.equal(preview.truncated, true);
  assert.match(preview.text, /^<script>do not execute<\/script>/);
  assert.ok(Buffer.byteLength(preview.text) <= MAX_TEXT_PREVIEW_BYTES);
});

test("supports all specified text preview extensions", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  const extensions = ["txt", "md", "json", "csv", "js"];
  for (const extension of extensions) {
    await fs.writeFile(path.join(downloads.path, `research-example.${extension}`), "plain text");
  }
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const queue = createMoveSuggestionQueue(roots, suggestions);

  for (const extension of extensions) {
    const suggestion = findSuggestion(suggestions, `research-example.${extension}`);
    const preview = await queue.preview(suggestion.id, "documents", "Research");
    assert.equal(preview.kind, "text", extension);
    assert.equal(preview.text, "plain text", extension);
  }
});

test("previews browsing files safely, including local PDF text and unsupported-file fallback", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  const textPath = path.join(downloads.path, "private-notes.txt");
  const imagePath = path.join(downloads.path, "thumbnail.png");
  const pdfPath = path.join(downloads.path, "research-paper.pdf");
  const otherPath = path.join(downloads.path, "archive.zip");
  await fs.writeFile(textPath, "<script>not markup</script>");
  await fs.writeFile(imagePath, "image bytes");
  await fs.writeFile(pdfPath, createPdf("A research paper preview."));
  await fs.writeFile(otherPath, "zip bytes");
  const thumbnail = async () => "data:image/png;base64,dGh1bWI=";

  const textPreview = await buildBrowseFilePreview(roots, "downloads", "private-notes.txt", thumbnail);
  assert.equal(textPreview.kind, "text");
  assert.equal(textPreview.text, "<script>not markup</script>");
  const imagePreview = await buildBrowseFilePreview(roots, "downloads", "thumbnail.png", thumbnail);
  assert.equal(imagePreview.kind, "image");
  assert.equal(imagePreview.dataUrl, "data:image/png;base64,dGh1bWI=");
  const pdfPreview = await buildBrowseFilePreview(roots, "downloads", "research-paper.pdf", thumbnail);
  assert.equal(pdfPreview.kind, "text");
  assert.match(pdfPreview.text, /research paper preview/i);
  const unsupportedPreview = await buildBrowseFilePreview(roots, "downloads", "archive.zip", thumbnail);
  assert.equal(unsupportedPreview.kind, "unavailable");
  assert.equal(unsupportedPreview.fileName, "archive.zip");
  assert.equal(unsupportedPreview.sizeBytes, Buffer.byteLength("zip bytes"));
  const outsidePreview = await buildBrowseFilePreview(roots, "downloads", "../outside.txt", thumbnail);
  assert.equal(outsidePreview.kind, "error");
  assert.match(outsidePreview.error, /outside the approved folders/);
});

test("searches scan file names and paths without returning unbounded results", () => {
  const files = [
    { name: "Research-notes.pdf", path: "C:\\Users\\TestUser\\Documents\\Research-notes.pdf" },
    { name: "budget.csv", path: "C:\\Users\\TestUser\\Documents\\Finance\\budget.csv" },
    { name: "slides.pptx", path: "C:\\Users\\TestUser\\Desktop\\Study\\slides.pptx" }
  ];
  assert.deepEqual(searchFileRecords(files, "rEsEaRcH").results.map((file) => file.name), [
    "Research-notes.pdf"
  ]);
  assert.deepEqual(searchFileRecords(files, "finance").results.map((file) => file.name), ["budget.csv"]);
  assert.deepEqual(searchFileRecords(files, " ").results, []);

  const manyFiles = Array.from({ length: 105 }, (_, index) => ({
    name: `report-${index}.pdf`,
    path: `C:\\Documents\\report-${index}.pdf`
  }));
  const limited = searchFileRecords(manyFiles, "report");
  assert.equal(limited.total, 105);
  assert.equal(limited.results.length, 100);
});

test("returns bounded image thumbnails for PNG, JPG, GIF, and WebP", async (t) => {
  const roots = await createFixture(t);
  const downloads = roots.find((root) => root.id === "downloads");
  const extensions = ["png", "jpg", "gif", "webp"];
  for (const extension of extensions) {
    await fs.writeFile(path.join(downloads.path, `Qatar-photo.${extension}`), "image fixture");
  }
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const thumbnailPaths = [];
  const queue = createMoveSuggestionQueue(roots, suggestions, {
    createThumbnail: (filePath) => {
      thumbnailPaths.push(filePath);
      return "data:image/png;base64,thumbnail";
    }
  });

  for (const extension of extensions) {
    const suggestion = findSuggestion(suggestions, `Qatar-photo.${extension}`);
    const preview = await queue.preview(suggestion.id, "pictures", "Qatar Images");
    assert.equal(preview.kind, "image", extension);
    assert.match(preview.dataUrl, /^data:image\/png;base64,/, extension);
  }
  assert.equal(thumbnailPaths.length, extensions.length);
});

test("shows metadata and an unavailable state for unsupported preview types", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-paper.pdf");
  await fs.writeFile(sourcePath, createPdf("A research paper."));
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-paper.pdf");
  const queue = createMoveSuggestionQueue(roots, suggestions);

  const preview = await queue.preview(suggestion.id, "documents", "Research");

  assert.equal(preview.kind, "unavailable");
  assert.equal(preview.fileName, "research-paper.pdf");
  assert.equal(preview.sizeBytes, (await fs.stat(sourcePath)).size);
  assert.equal(preview.type, "PDF");
  assert.equal(await comparablePath(preview.sourcePath), await comparablePath(sourcePath));
  assert.match(preview.destinationPath, /Research[\\/]research-paper\.pdf$/);
});

test("returns a visible preview error when a selected file disappears", async (t) => {
  const roots = await createFixture(t);
  const sourcePath = path.join(roots.find((root) => root.id === "downloads").path, "research-notes.txt");
  await fs.writeFile(sourcePath, "Research notes");
  const { suggestions } = await scanAndBuildSuggestions(roots);
  const suggestion = findSuggestion(suggestions, "research-notes.txt");
  const queue = createMoveSuggestionQueue(roots, suggestions);
  await fs.unlink(sourcePath);

  const preview = await queue.preview(suggestion.id, "documents", "Research");

  assert.equal(preview.kind, "error");
  assert.equal(preview.fileName, "research-notes.txt");
  assert.equal(preview.type, "TXT");
  assert.match(preview.error, /ENOENT/);
});

test("purpose-folder index stores only folders inside approved roots", async (t) => {
  const roots = await createFixture(t);
  const documents = roots.find((root) => root.id === "documents");
  const researchPath = path.join(documents.path, "Research");
  const indexPath = path.join(path.dirname(documents.path), "user-data", "purpose-folders.json");
  await fs.mkdir(researchPath);

  await addPurposeFolder(indexPath, roots, {
    name: "Research",
    path: researchPath,
    parentType: documents.id
  });
  const nestedResearchPath = path.join(documents.path, "School", "Research");
  await fs.mkdir(nestedResearchPath, { recursive: true });
  await addPurposeFolder(indexPath, roots, {
    name: "Course Research",
    path: nestedResearchPath,
    parentType: documents.id
  });
  await addPurposeFolder(indexPath, roots, {
    name: "Research",
    path: researchPath,
    parentType: documents.id
  });
  const purposeFolders = await readPurposeFolders(indexPath, roots);
  assert.equal(purposeFolders.length, 2);
  assert.equal(purposeFolders[0].name, "Research");
  assert.ok(purposeFolders.some((folder) => folder.name === "Course Research"
    && path.basename(folder.path) === "Research"
    && folder.parentType === documents.id
    && folder.available));
  await assert.rejects(addPurposeFolder(indexPath, roots, {
    name: "Outside",
    path: path.join(path.dirname(documents.path), "outside"),
    parentType: documents.id
  }), /inside an approved folder/);
  assert.equal((await readPurposeFolders(indexPath, roots)).length, 2);
  await fs.rm(documents.path, { recursive: true });
  const unavailable = await readPurposeFolders(indexPath, roots);
  assert.ok(unavailable.every((folder) => !folder.available));
});

test("rejects a source path that escapes its approved root", async (t) => {
  const roots = await createFixture(t);
  const documentsPath = await fs.realpath(roots.find((root) => root.id === "documents").path);
  const destinationPath = path.join(documentsPath, "Research", "outside.txt");
  const queue = createMoveSuggestionQueue(roots, [{
    id: "unsafe-test",
    fileName: "outside.txt",
    sourcePath: path.join(path.dirname(roots[1].path), "outside.txt"),
    sourceRootId: "downloads",
    sourceRelativePath: "../outside.txt",
    fileSizeBytes: 1,
    modifiedAt: new Date().toISOString(),
    destinationRootId: "documents",
    destinationRootLabel: "Documents",
    purposeFolderName: "Research",
    destinationPath
  }]);

  await assert.rejects(
    queue.approve(
      "unsafe-test",
      "documents",
      "Research",
      destinationPath
    ),
    /source file is outside the approved folders/
  );
});

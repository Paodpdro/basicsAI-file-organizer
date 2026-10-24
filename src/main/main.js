const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { buildMoveSuggestions, fileTypeLabel } = require("./analyzer");
const { buildDeletionCandidates, createDeletionReviewQueue } = require("./deletion-review");
const { createMoveSuggestionQueue } = require("./file-operations");
const { searchFileRecords } = require("./file-search");
const { createFolderRoots, isInsideRoot, listDirectory, resolveFilePath, scanFolders } = require("./scanner");
const { addPurposeFolder, readPurposeFolders } = require("./purpose-folder-store");
const { buildBrowseFilePreview } = require("./preview");

let folderRoots = [];
let purposeIndexPath;
let mainWindow;
let scannedFiles = [];
let suggestionQueue = createMoveSuggestionQueue(folderRoots, []);
let deletionReviewQueue = createDeletionReviewQueue(folderRoots, [], (filePath) => shell.trashItem(filePath));

function createImageThumbnail(filePath) {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) throw new Error("The image could not be decoded.");
  return image.resize({ width: 480, height: 320, quality: "good" }).toDataURL();
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#fff8df",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, "../renderer/index.html"));
  return window;
}

app.whenReady().then(() => {
  folderRoots = createFolderRoots((name) => app.getPath(name));
  purposeIndexPath = path.join(app.getPath("userData"), "purpose-folders.json");

  ipcMain.handle("folders:scan", async () => {
    scannedFiles = [];
    const folders = await scanFolders(folderRoots);
    const canonicalRoots = new Map();
    for (const folder of folders) {
      if (folder.available) canonicalRoots.set(folder.id, await fs.realpath(folder.path));
    }
    scannedFiles = folders.flatMap((folder) => (folder.files ?? []).map((file) => ({
      ...file,
      kind: "file",
      relativePath: path.relative(canonicalRoots.get(folder.id), file.path),
      rootLabel: folder.label,
      typeLabel: fileTypeLabel(file.name)
    })));
    const { suggestions, skippedFiles, alreadyOrganized } = await buildMoveSuggestions(folders, folderRoots);
    const deletionReview = await buildDeletionCandidates(folderRoots, scannedFiles);
    const purposeFolders = (await readPurposeFolders(purposeIndexPath, folderRoots)).map((folder) => ({
      ...folder,
      rootId: folder.parentType,
      relativeDirectory: canonicalRoots.has(folder.parentType)
        ? path.relative(canonicalRoots.get(folder.parentType), folder.path)
        : ""
    }));
    suggestionQueue = createMoveSuggestionQueue(folderRoots, suggestions, {
      createThumbnail: createImageThumbnail
    });
    deletionReviewQueue = createDeletionReviewQueue(
      folderRoots,
      deletionReview.candidates,
      (filePath) => shell.trashItem(filePath)
    );
    return {
      folders: folders.map(({ files, ...folder }) => folder),
      suggestions,
      skippedFiles,
      alreadyOrganized,
      deletionCandidates: deletionReview.candidates,
      deletionIssues: deletionReview.issues,
      purposeFolders
    };
  });
  ipcMain.handle("folders:list", (_event, rootId, relativeDirectory) =>
    listDirectory(folderRoots, rootId, relativeDirectory)
  );
  ipcMain.handle("files:search", (_event, query) => searchFileRecords(scannedFiles, query));
  ipcMain.handle("files:preview", (_event, rootId, relativePath) =>
    buildBrowseFilePreview(folderRoots, rootId, relativePath, createImageThumbnail)
  );
  ipcMain.handle("files:open", async (_event, rootId, relativePath) => {
    const file = await resolveFilePath(folderRoots, rootId, relativePath);
    const openError = await shell.openPath(file.path);
    if (openError) throw new Error(openError);
    return { opened: true };
  });
  ipcMain.handle("purpose-folders:add-existing", async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a purpose folder",
      buttonLabel: "Add folder",
      properties: ["openDirectory"]
    });
    if (selection.canceled) return { cancelled: true };
    if (!selection.filePaths[0]) throw new Error("No folder was selected.");
    const selectedPath = await fs.realpath(selection.filePaths[0]);
    for (const root of folderRoots) {
      let canonicalRoot;
      try {
        canonicalRoot = await fs.realpath(root.path);
      } catch (error) {
        if (["ENOENT", "EACCES", "EPERM"].includes(error.code)) continue;
        throw error;
      }
      if (!isInsideRoot(canonicalRoot, selectedPath)) continue;
      const entry = await addPurposeFolder(purposeIndexPath, folderRoots, {
        name: path.basename(selectedPath),
        path: selectedPath,
        parentType: root.id
      });
      return { cancelled: false, entry };
    }
    throw new Error("Choose a folder inside Documents, Downloads, Desktop, Pictures, Music, or Videos.");
  });
  ipcMain.handle("suggestions:skip", (_event, suggestionId) => suggestionQueue.skip(suggestionId));
  ipcMain.handle("suggestions:preview", (_event, suggestionId, destinationRootId, folderName) =>
    suggestionQueue.preview(suggestionId, destinationRootId, folderName)
  );
  ipcMain.handle("suggestions:approve", async (_event, suggestionId, destinationRootId, folderName, expectedPath) => {
    const result = await suggestionQueue.approve(
      suggestionId,
      destinationRootId,
      folderName,
      expectedPath
    );
    if (!result.requiresReview && result.destinationPath && typeof folderName === "string" && folderName.trim()) {
      try {
        await addPurposeFolder(purposeIndexPath, folderRoots, {
          name: folderName.trim(),
          path: path.dirname(result.destinationPath),
          parentType: destinationRootId
        });
      } catch (error) {
        result.indexWarning = `Files moved, but the purpose folder could not be saved: ${error.message}`;
      }
    }
    return result;
  });
  ipcMain.handle("deletions:keep", (_event, candidateId) => deletionReviewQueue.keep(candidateId));
  ipcMain.handle("deletions:delete", (_event, candidateId) => deletionReviewQueue.delete(candidateId));
  ipcMain.handle("folders:copy-path", async (_event, rootId, targetPath) => {
    const root = folderRoots.find((folder) => folder.id === rootId);
    if (!root) throw new Error("That folder is not available.");
    const canonicalRoot = await fs.realpath(root.path).catch(() => path.resolve(root.path));
    const resolvedTarget = path.resolve(targetPath || root.path);
    if (!isInsideRoot(canonicalRoot, resolvedTarget)) {
      throw new Error("That location is outside the selected folder.");
    }
    clipboard.writeText(resolvedTarget);
  });

  mainWindow = createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

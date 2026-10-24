const { app, BrowserWindow, clipboard, ipcMain, nativeImage } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createFolderRoots, isInsideRoot, listDirectory, scanFolders } = require("./scanner");
const { buildMoveSuggestions } = require("./analyzer");
const { createMoveSuggestionQueue } = require("./file-operations");
const { addPurposeFolder, readPurposeFolders } = require("./purpose-folder-store");

let folderRoots = [];
let purposeIndexPath;
let suggestionQueue = createMoveSuggestionQueue(folderRoots, []);

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
}

app.whenReady().then(() => {
  folderRoots = createFolderRoots((name) => app.getPath(name));
  purposeIndexPath = path.join(app.getPath("userData"), "purpose-folders.json");

  ipcMain.handle("folders:scan", async () => {
    const folders = await scanFolders(folderRoots);
    const { suggestions, skippedFiles, alreadyOrganized } = await buildMoveSuggestions(folders, folderRoots);
    const purposeFolders = await readPurposeFolders(purposeIndexPath, folderRoots);
    suggestionQueue = createMoveSuggestionQueue(folderRoots, suggestions, {
      createThumbnail: createImageThumbnail
    });
    return {
      folders: folders.map(({ files, ...folder }) => folder),
      suggestions,
      skippedFiles,
      alreadyOrganized,
      purposeFolders
    };
  });
  ipcMain.handle("folders:list", (_event, rootId, relativeDirectory) =>
    listDirectory(folderRoots, rootId, relativeDirectory)
  );
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

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

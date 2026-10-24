const { app, BrowserWindow, clipboard, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createFolderRoots, isInsideRoot, listDirectory, scanFolders } = require("./scanner");

let folderRoots = [];

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

  ipcMain.handle("folders:scan", () => scanFolders(folderRoots));
  ipcMain.handle("folders:list", (_event, rootId, relativeDirectory) =>
    listDirectory(folderRoots, rootId, relativeDirectory)
  );
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

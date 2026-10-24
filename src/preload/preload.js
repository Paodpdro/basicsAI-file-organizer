const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("organizer", {
  scanFolders: () => ipcRenderer.invoke("folders:scan"),
  listFolder: (rootId, relativeDirectory = "") =>
    ipcRenderer.invoke("folders:list", rootId, relativeDirectory),
  copyFolderPath: (rootId, targetPath) => ipcRenderer.invoke("folders:copy-path", rootId, targetPath)
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("organizer", {
  scanFolders: () => ipcRenderer.invoke("folders:scan"),
  listFolder: (rootId, relativeDirectory = "") =>
    ipcRenderer.invoke("folders:list", rootId, relativeDirectory),
  skipMoveSuggestion: (suggestionId) => ipcRenderer.invoke("suggestions:skip", suggestionId),
  previewSuggestedFile: (suggestionId, destinationRootId, folderName) =>
    ipcRenderer.invoke("suggestions:preview", suggestionId, destinationRootId, folderName),
  approveMoveSuggestion: (suggestionId, destinationRootId, folderName, expectedPath) =>
    ipcRenderer.invoke("suggestions:approve", suggestionId, destinationRootId, folderName, expectedPath),
  copyFolderPath: (rootId, targetPath) => ipcRenderer.invoke("folders:copy-path", rootId, targetPath)
});

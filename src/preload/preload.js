const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("organizer", {
  scanFolders: () => ipcRenderer.invoke("folders:scan"),
  onScanProgress: (listener) => {
    if (typeof listener !== "function") throw new Error("A scan progress listener is required.");
    const handler = (_event, progress) => listener(progress);
    ipcRenderer.on("folders:scan-progress", handler);
    return () => ipcRenderer.removeListener("folders:scan-progress", handler);
  },
  listFolder: (rootId, relativeDirectory = "") =>
    ipcRenderer.invoke("folders:list", rootId, relativeDirectory),
  searchFiles: (query) => ipcRenderer.invoke("files:search", query),
  previewFile: (rootId, relativePath) =>
    ipcRenderer.invoke("files:preview", rootId, relativePath),
  openFile: (rootId, relativePath) =>
    ipcRenderer.invoke("files:open", rootId, relativePath),
  addExistingPurposeFolder: () => ipcRenderer.invoke("purpose-folders:add-existing"),
  skipMoveSuggestion: (suggestionId) => ipcRenderer.invoke("suggestions:skip", suggestionId),
  previewSuggestedFile: (suggestionId, destinationRootId, folderName) =>
    ipcRenderer.invoke("suggestions:preview", suggestionId, destinationRootId, folderName),
  approveMoveSuggestion: (suggestionId, destinationRootId, folderName, expectedPath) =>
    ipcRenderer.invoke("suggestions:approve", suggestionId, destinationRootId, folderName, expectedPath),
  keepDeletionCandidate: (candidateId) => ipcRenderer.invoke("deletions:keep", candidateId),
  deleteCandidate: (candidateId) => ipcRenderer.invoke("deletions:delete", candidateId),
  copyFolderPath: (rootId, targetPath) => ipcRenderer.invoke("folders:copy-path", rootId, targetPath)
});

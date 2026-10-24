const folderGrid = document.querySelector("#folder-grid");
const fileList = document.querySelector("#file-list");
const scanStatus = document.querySelector("#scan-status");
const accessIssues = document.querySelector("#access-issues");
const contentsHeading = document.querySelector("#contents-heading");
const folderPath = document.querySelector("#folder-path");
const rescanButton = document.querySelector("#rescan-button");
const backButton = document.querySelector("#back-button");

const folderIcons = {
  documents: "📄",
  downloads: "⬇️",
  desktop: "🖥️",
  pictures: "🖼️",
  music: "🎵",
  videos: "🎬"
};

let folders = [];
let selectedFolder = null;

function setStatus(message) {
  scanStatus.textContent = message;
}

function showMessage(message) {
  fileList.replaceChildren();
  const item = document.createElement("li");
  item.className = "empty-message";
  item.textContent = message;
  fileList.append(item);
}

function renderFolders() {
  folderGrid.replaceChildren();
  for (const folder of folders) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-card";
    button.setAttribute("aria-pressed", String(selectedFolder?.id === folder.id));
    button.disabled = !folder.available;

    const icon = document.createElement("span");
    icon.className = "folder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = folderIcons[folder.id] ?? "📁";

    const name = document.createElement("span");
    name.className = "folder-name";
    name.textContent = folder.label;

    const count = document.createElement("span");
    count.className = "folder-count";
    count.textContent = folder.available
      ? `${folder.fileCount} ${folder.fileCount === 1 ? "file" : "files"}`
      : "Not available";

    button.append(icon, name, count);
    button.addEventListener("click", () => openFolder(folder));
    folderGrid.append(button);
  }
}

function renderAccessIssues() {
  accessIssues.replaceChildren();
  for (const folder of folders) {
    for (const error of folder.errors) {
      const issue = document.createElement("div");
      issue.className = "access-issue";
      const description = document.createElement("p");
      description.textContent = `${folder.label}: ${error.message} `;
      const path = document.createElement("code");
      path.textContent = error.path;
      description.append(path);

      const copyButton = document.createElement("button");
      copyButton.className = "button button-secondary";
      copyButton.type = "button";
      copyButton.textContent = "Copy path";
      copyButton.addEventListener("click", async () => {
        try {
          await window.organizer.copyFolderPath(folder.id, error.path);
          copyButton.textContent = "Copied";
        } catch (copyError) {
          copyButton.textContent = "Could not copy";
          copyButton.title = copyError.message;
        }
      });
      issue.append(description, copyButton);
      accessIssues.append(issue);
    }
  }
}

function renderDirectoryEntries(entries) {
  fileList.replaceChildren();
  if (entries.length === 0) {
    showMessage("This folder is empty.");
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "file-row";
    const name = document.createElement("span");
    name.textContent = `${entry.kind === "folder" ? "📁" : "📄"} ${entry.name}`;
    const kind = document.createElement("span");
    kind.className = "file-kind";
    kind.textContent = entry.kind === "folder" ? "Folder" : "File";
    const modified = document.createElement("time");
    modified.className = "file-modified";
    modified.textContent = formatModifiedDate(entry.modifiedAt);
    if (entry.modifiedAt) modified.dateTime = entry.modifiedAt;
    modified.setAttribute("aria-label", `Last modified: ${modified.textContent}`);
    item.append(name, kind, modified);
    fileList.append(item);
  }
}

async function openFolder(folder) {
  selectedFolder = folder;
  contentsHeading.textContent = folder.label;
  folderPath.textContent = folder.path;
  backButton.hidden = false;
  renderFolders();
  showMessage("Loading files…");
  try {
    const entries = await window.organizer.listFolder(folder.id);
    renderDirectoryEntries(entries);
  } catch (error) {
    showMessage(`Could not open this folder: ${error.message}`);
  }
}

async function scanFolders() {
  selectedFolder = null;
  contentsHeading.textContent = "Choose a folder";
  folderPath.textContent = "Your files will appear here.";
  backButton.hidden = true;
  showMessage("Checking your folders…");
  setStatus("Scanning…");
  rescanButton.disabled = true;

  try {
    folders = await window.organizer.scanFolders();
    renderFolders();
    renderAccessIssues();
    const issueCount = folders.reduce((count, folder) => count + folder.errors.length, 0);
    setStatus(issueCount ? `${issueCount} locations need attention` : "Folders are up to date");
    if (issueCount) {
      showMessage("Some locations could not be accessed. Their paths are listed above.");
    } else {
      showMessage("Choose a folder to see its files.");
    }
  } catch (error) {
    setStatus("Scan could not finish");
    showMessage(`We could not scan your folders: ${error.message}`);
  } finally {
    rescanButton.disabled = false;
  }
}

rescanButton.addEventListener("click", scanFolders);
backButton.addEventListener("click", () => {
  selectedFolder = null;
  contentsHeading.textContent = "Choose a folder";
  folderPath.textContent = "Your files will appear here.";
  backButton.hidden = true;
  renderFolders();
  showMessage("Choose a folder to see its files.");
});

scanFolders();

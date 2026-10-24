const folderGrid = document.querySelector("#folder-grid");
const purposeFolderGrid = document.querySelector("#purpose-folder-grid");
const fileList = document.querySelector("#file-list");
const scanStatus = document.querySelector("#scan-status");
const accessIssues = document.querySelector("#access-issues");
const contentsHeading = document.querySelector("#contents-heading");
const folderPath = document.querySelector("#folder-path");
const rescanButton = document.querySelector("#rescan-button");
const backButton = document.querySelector("#back-button");
const foldersSection = document.querySelector("#folders-section");
const purposeSection = document.querySelector("#purpose-section");
const browserToolbar = document.querySelector("#browser-toolbar");
const contentsSection = document.querySelector("#contents-section");
const suggestionsButton = document.querySelector("#suggestions-button");
const deletionReviewButton = document.querySelector("#deletion-review-button");
const purposeFoldersButton = document.querySelector("#purpose-folders-button");
const generalFoldersButton = document.querySelector("#general-folders-button");
const addPurposeFolderButton = document.querySelector("#add-purpose-folder-button");
const appNotice = document.querySelector("#app-notice");
const searchInput = document.querySelector("#file-search-input");
const listViewButton = document.querySelector("#list-view-button");
const gridViewButton = document.querySelector("#grid-view-button");
const searchResultsSection = document.querySelector("#search-results-section");
const searchResultsCount = document.querySelector("#search-results-count");
const searchNotice = document.querySelector("#search-notice");
const searchResultsList = document.querySelector("#search-results-list");
const browseNotice = document.querySelector("#browse-notice");
const filePreviewSection = document.querySelector("#file-preview-section");
const filePreviewPanel = document.querySelector("#file-preview-panel");
const closePreviewButton = document.querySelector("#close-preview-button");
const suggestionsSection = document.querySelector("#suggestions-section");
const suggestionProgress = document.querySelector("#suggestion-progress");
const suggestionNotice = document.querySelector("#suggestion-notice");
const suggestionEmpty = document.querySelector("#suggestion-empty");
const suggestionGrid = document.querySelector("#suggestion-grid");
const movePagination = document.querySelector("#move-pagination");
const movePageSize = document.querySelector("#move-page-size");
const movePagePrevious = document.querySelector("#move-page-previous");
const movePageStatus = document.querySelector("#move-page-status");
const movePageNext = document.querySelector("#move-page-next");
const skippedFilesDisclosure = document.querySelector("#skipped-files-disclosure");
const skippedFilesSummary = document.querySelector("#skipped-files-summary");
const skippedFilesList = document.querySelector("#skipped-files-list");
const alreadyOrganizedDisclosure = document.querySelector("#already-organized-disclosure");
const alreadyOrganizedSummary = document.querySelector("#already-organized-summary");
const alreadyOrganizedList = document.querySelector("#already-organized-list");
const deletionSection = document.querySelector("#deletion-section");
const deletionProgress = document.querySelector("#deletion-progress");
const deletionNotice = document.querySelector("#deletion-notice");
const deletionIssues = document.querySelector("#deletion-issues");
const deletionEmpty = document.querySelector("#deletion-empty");
const deletionCandidateContainer = document.querySelector("#deletion-candidate");
const deletionPagination = document.querySelector("#deletion-pagination");
const deletionPageSize = document.querySelector("#deletion-page-size");
const deletionPagePrevious = document.querySelector("#deletion-page-previous");
const deletionPageStatus = document.querySelector("#deletion-page-status");
const deletionPageNext = document.querySelector("#deletion-page-next");

const folderIcons = {
  documents: "📄",
  downloads: "⬇️",
  desktop: "🖥️",
  pictures: "🖼️",
  music: "🎵",
  videos: "🎬"
};

let folders = [];
let purposeFolders = [];
let moveSuggestions = [];
let deletionCandidates = [];
let deletionReviewIssues = [];
let deletionReviewedCount = 0;
let movePage = 0;
let deletionPage = 0;
let skippedFiles = [];
let alreadyOrganized = [];
let selectedFolder = null;
let moveNotice = "";
let currentPage = "general";
let pageBeforeSearch = "general";
let layoutMode = "list";
let directoryEntries = [];
let searchEntries = [];
let searchRequest = 0;
let browsePreviewRequest = 0;
let directoryRequest = 0;
let searchTimer;

function setStatus(message) {
  scanStatus.textContent = message;
}

function setAppStatus(message, { processing = false, error = false } = {}) {
  appNotice.textContent = message;
  appNotice.hidden = !message;
  appNotice.setAttribute("aria-busy", String(processing));
  appNotice.classList.toggle("app-status-processing", processing);
  appNotice.classList.toggle("app-status-error", error);
}

function renderPagination(length, pageSize, page, controls) {
  const pageCount = Math.max(1, Math.ceil(length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const first = length === 0 ? 0 : currentPage * pageSize + 1;
  const last = Math.min(length, (currentPage + 1) * pageSize);
  controls.status.textContent = length
    ? `Showing ${first}–${last} of ${length}`
    : "No items";
  controls.previous.disabled = currentPage === 0;
  controls.next.disabled = currentPage >= pageCount - 1;
  return { start: currentPage * pageSize, end: (currentPage + 1) * pageSize, page: currentPage };
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
    button.addEventListener("click", () => openFolder({
      ...folder,
      rootId: folder.id,
      relativeDirectory: ""
    }, "general"));
    folderGrid.append(button);
  }
}

function renderPurposeFolders() {
  purposeFolderGrid.replaceChildren();
  for (const folder of purposeFolders) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-card";
    button.disabled = !folder.available;

    const icon = makeTextElement("span", "folder-icon", "📂");
    icon.setAttribute("aria-hidden", "true");
    const name = makeTextElement("span", "folder-name", folder.name);
    const root = folders.find((item) => item.id === folder.rootId);
    const location = makeTextElement(
      "span",
      "folder-count",
      root ? `In ${root.label}` : "Location unavailable"
    );
    button.append(icon, name, location);
    button.addEventListener("click", () => openFolder({
      ...folder,
      label: folder.name
    }, "purpose"));
    purposeFolderGrid.append(button);
  }
}

function renderAccessIssues() {
  accessIssues.replaceChildren();
  for (const folder of folders) {
    for (const error of folder.errors) {
      if (error.kind === "file") continue;
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

function renderDirectoryEntries(entries, targetList = fileList, emptyMessage = "This folder is empty.") {
  targetList.replaceChildren();
  targetList.classList.toggle("file-grid-view", layoutMode === "grid");
  if (entries.length === 0) {
    targetList.append(makeTextElement("li", "empty-message", emptyMessage));
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "file-row";
    const name = document.createElement("div");
    name.className = "file-name";
    if (entry.kind === "folder") {
      const openFolderButton = makeTextElement("button", "entry-folder-button", `📁 ${entry.name}`);
      openFolderButton.type = "button";
      openFolderButton.addEventListener("click", () => openSubfolder(entry));
      name.append(openFolderButton);
    } else {
      name.textContent = `${entry.kind === "other" ? "📦" : "📄"} ${entry.name}`;
    }
    const kind = makeTextElement("span", "file-kind", entry.kind === "folder"
      ? "Folder"
      : entry.typeLabel ?? typeLabel(entry.name));
    const modified = document.createElement("time");
    modified.className = "file-modified";
    modified.textContent = formatModifiedDate(entry.modifiedAt);
    if (entry.modifiedAt) modified.dateTime = entry.modifiedAt;
    modified.setAttribute("aria-label", `Last modified: ${modified.textContent}`);
    const details = document.createElement("div");
    details.className = "file-details";
    details.append(kind, modified);
    if (entry.sizeBytes !== null && entry.sizeBytes !== undefined) {
      details.append(makeTextElement("span", "file-size", formatBytes(entry.sizeBytes)));
    }
    if (entry.path) details.append(makeTextElement("code", "file-location", entry.path));
    item.append(name, details);

    if (entry.kind === "file") {
      const actions = document.createElement("div");
      actions.className = "file-actions";
      const previewButton = makeTextElement("button", "button button-secondary", "Preview");
      previewButton.type = "button";
      previewButton.addEventListener("click", () => previewFile(entry));
      const openButton = makeTextElement("button", "button button-secondary", "Open");
      openButton.type = "button";
      openButton.addEventListener("click", () => openFile(entry));
      actions.append(previewButton, openButton);
      item.append(actions);
    }
    targetList.append(item);
  }
}

function typeLabel(fileName) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  return extension ? extension.toUpperCase() : "File";
}

function hideFilePreview() {
  browsePreviewRequest += 1;
  filePreviewSection.hidden = true;
  filePreviewPanel.replaceChildren();
}

function setLayout(mode) {
  layoutMode = mode;
  listViewButton.setAttribute("aria-pressed", String(mode === "list"));
  gridViewButton.setAttribute("aria-pressed", String(mode === "grid"));
  renderDirectoryEntries(directoryEntries);
  if (currentPage === "search") renderDirectoryEntries(searchEntries, searchResultsList);
}

function showPage(page) {
  if (page !== "contents") directoryRequest += 1;
  if (["general", "purpose", "suggestions", "deletions"].includes(page)) {
    selectedFolder = null;
    directoryEntries = [];
    if (page === "general") renderFolders();
  }
  currentPage = page;
  purposeSection.hidden = page !== "purpose";
  foldersSection.hidden = page !== "general";
  contentsSection.hidden = page !== "contents";
  searchResultsSection.hidden = page !== "search";
  suggestionsSection.hidden = page !== "suggestions";
  deletionSection.hidden = page !== "deletions";
  browserToolbar.hidden = ["suggestions", "deletions"].includes(page);
  purposeFoldersButton.hidden = purposeFolders.length === 0;
  purposeFoldersButton.setAttribute("aria-pressed", String(page === "purpose"));
  generalFoldersButton.setAttribute("aria-pressed", String(page === "general"));
  suggestionsButton.setAttribute("aria-pressed", String(page === "suggestions"));
  deletionReviewButton.setAttribute("aria-pressed", String(page === "deletions"));
  hideFilePreview();
}

async function loadSelectedFolder() {
  if (!selectedFolder) return;
  const request = ++directoryRequest;
  const folder = selectedFolder;
  contentsHeading.textContent = selectedFolder.label;
  folderPath.textContent = selectedFolder.path;
  backButton.hidden = false;
  backButton.textContent = selectedFolder.relativeDirectory === selectedFolder.baseRelativeDirectory
    ? `Back to ${selectedFolder.homeView === "purpose" ? "purpose folders" : "folders"}`
    : "Up one folder";
  browseNotice.hidden = true;
  directoryEntries = [];
  showMessage("Loading files…");
  try {
    directoryEntries = await window.organizer.listFolder(
      folder.rootId,
      folder.relativeDirectory
    );
    if (request !== directoryRequest) return;
    renderDirectoryEntries(directoryEntries);
  } catch (error) {
    if (request !== directoryRequest) return;
    showMessage(`Could not open this folder: ${error.message}`);
  }
}

async function openFolder(folder, homeView) {
  selectedFolder = {
    ...folder,
    baseLabel: folder.label,
    basePath: folder.path,
    baseRelativeDirectory: folder.relativeDirectory,
    homeView
  };
  showPage("contents");
  await loadSelectedFolder();
}

async function openSubfolder(entry) {
  selectedFolder = {
    ...selectedFolder,
    label: entry.name,
    path: entry.path,
    relativeDirectory: entry.relativePath
  };
  hideFilePreview();
  await loadSelectedFolder();
}

function makeTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function appendReviewItems(list, items, reasonClass = "") {
  list.replaceChildren();
  for (const item of items) {
    const row = document.createElement("li");
    row.append(document.createTextNode(item.fileName));
    if (item.reason || item.message) {
      const reason = makeTextElement("span", reasonClass, ` — ${item.reason ?? item.message}`);
      row.append(reason);
    }
    if (item.path) row.append(makeTextElement("code", "", item.path));
    list.append(row);
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setBrowseNotice(message, error = false) {
  const notice = currentPage === "search" ? searchNotice : browseNotice;
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle("preview-error", error);
}

function renderBrowsePreview(preview, entry, panel = filePreviewPanel, { showOpen = true } = {}) {
  panel.replaceChildren(
    makeTextElement("h3", "", preview.fileName || entry.name),
    makeTextElement(
      "p",
      "preview-meta",
      `${formatBytes(preview.sizeBytes)} · ${preview.type} · Modified ${formatModifiedDate(preview.modifiedAt)}`
    ),
    makeTextElement("code", "preview-destination", preview.sourcePath || entry.path)
  );
  if (preview.kind === "image" && preview.dataUrl) {
    const image = document.createElement("img");
    image.className = "preview-image";
    image.alt = `Preview of ${preview.fileName}`;
    image.addEventListener("error", () => {
      panel.append(makeTextElement("p", "preview-error", "The image preview could not be displayed."));
    });
    image.src = preview.dataUrl;
    panel.append(image);
  } else if (preview.kind === "text") {
    if (preview.reason) panel.append(makeTextElement("p", "preview-meta", preview.reason));
    panel.append(makeTextElement("pre", "preview-text", preview.text));
    if (preview.truncated) {
      panel.append(makeTextElement("p", "preview-unavailable", "Preview limited to the first 50 KB."));
    }
  } else if (preview.kind === "error") {
    panel.append(makeTextElement("p", "preview-error", `Preview error: ${preview.error}`));
  } else {
    panel.append(makeTextElement(
      "p",
      "preview-unavailable",
      `Preview unavailable. ${preview.reason ?? ""}`.trim()
    ));
  }

  if (!showOpen) return;
  const openButton = makeTextElement("button", "button button-secondary", "Open in Windows");
  openButton.type = "button";
  openButton.addEventListener("click", () => openFile(entry));
  panel.append(openButton);
}

async function previewFile(entry) {
  const request = ++browsePreviewRequest;
  filePreviewSection.hidden = false;
  filePreviewPanel.replaceChildren(makeTextElement("p", "preview-unavailable", "Preparing preview…"));
  try {
    const preview = await window.organizer.previewFile(entry.rootId, entry.relativePath);
    if (request !== browsePreviewRequest) return;
    renderBrowsePreview(preview, entry);
    filePreviewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    if (request !== browsePreviewRequest) return;
    filePreviewPanel.replaceChildren(
      makeTextElement("h3", "", entry.name),
      makeTextElement("p", "preview-meta", `${formatBytes(entry.sizeBytes)} · ${typeLabel(entry.name)}`),
      makeTextElement("p", "preview-error", `Preview error: ${error.message}`)
    );
    const openButton = makeTextElement("button", "button button-secondary", "Open in Windows");
    openButton.type = "button";
    openButton.addEventListener("click", () => openFile(entry));
    filePreviewPanel.append(openButton);
  }
}

async function openFile(entry) {
  setBrowseNotice(`Opening ${entry.name}…`);
  try {
    await window.organizer.openFile(entry.rootId, entry.relativePath);
    setBrowseNotice(`Opened ${entry.name} in Windows.`);
  } catch (error) {
    setBrowseNotice(`Could not open ${entry.name}: ${error.message}`, true);
  }
}

async function searchFiles(query) {
  const request = ++searchRequest;
  searchResultsCount.textContent = "Searching…";
  searchNotice.hidden = true;
  searchResultsList.replaceChildren();
  try {
    const result = await window.organizer.searchFiles(query);
    if (request !== searchRequest || query !== searchInput.value.trim()) return;
    searchEntries = result.results;
    searchResultsCount.textContent = result.total > searchEntries.length
      ? `Showing ${searchEntries.length} of ${result.total} matching files.`
      : `${result.total} ${result.total === 1 ? "file" : "files"} found.`;
    renderDirectoryEntries(searchEntries, searchResultsList, "No matching files found.");
  } catch (error) {
    if (request !== searchRequest) return;
    searchResultsCount.textContent = "Search could not finish.";
    searchNotice.textContent = `Could not search your files: ${error.message}`;
    searchNotice.hidden = false;
  }
}

function handleSearchInput() {
  clearTimeout(searchTimer);
  const query = searchInput.value.trim();
  if (!query) {
    searchRequest += 1;
    searchEntries = [];
    searchResultsCount.textContent = "";
    searchNotice.hidden = true;
    if (currentPage === "search") showPage(pageBeforeSearch);
    return;
  }
  if (currentPage !== "search") pageBeforeSearch = currentPage;
  showPage("search");
  searchResultsList.replaceChildren(makeTextElement("li", "empty-message", "Searching…"));
  searchTimer = setTimeout(() => searchFiles(query), 180);
}

function renderPreview(preview, panel) {
  panel.replaceChildren();
  const heading = makeTextElement("h4", "", `Preview: ${preview.fileName}`);
  panel.append(heading);
  panel.append(makeTextElement("p", "preview-meta",
    `${preview.fileName} · ${formatBytes(preview.sizeBytes)} · ${preview.type} · Modified ${formatModifiedDate(preview.modifiedAt)}`));
  const locations = document.createElement("div");
  locations.className = "preview-locations";
  locations.append(
    makeTextElement("p", "preview-destination", `Current location: ${preview.sourcePath}`),
    makeTextElement("p", "preview-destination", `Destination: ${preview.destinationPath}`)
  );
  panel.append(locations);

  if (preview.kind === "image" && preview.dataUrl) {
    const image = document.createElement("img");
    image.className = "preview-image";
    image.alt = `Preview of ${preview.fileName}`;
    image.addEventListener("error", () => {
      image.remove();
      panel.append(makeTextElement("p", "preview-error", "Preview error: the image thumbnail could not be displayed."));
    }, { once: true });
    image.src = preview.dataUrl;
    panel.append(image);
  } else if (preview.kind === "text") {
    panel.append(makeTextElement("pre", "preview-text", preview.text));
    if (preview.truncated) panel.append(makeTextElement("p", "preview-unavailable", "Preview limited to the first 50 KB."));
  } else if (preview.kind === "error") {
    panel.append(makeTextElement("p", "preview-error", `Preview error: ${preview.error}`));
  } else {
    panel.append(makeTextElement("p", "preview-unavailable", "Preview unavailable."));
  }
}

function renderMoveSuggestion(suggestion, index) {
  const card = document.createElement("article");
  card.className = "suggestion-card";
  const heading = document.createElement("div");
  heading.className = "suggestion-card-heading";
  heading.append(
    makeTextElement("h3", "", suggestion.fileName),
    makeTextElement("span", "suggestion-type", suggestion.typeLabel)
  );
  card.append(heading, makeTextElement("p", "suggestion-reason", suggestion.reason));

  const paths = document.createElement("div");
  paths.className = "suggestion-paths";
  const locationSummary = makeTextElement("p", "suggestion-location-summary", "");
  const fullPaths = document.createElement("details");
  fullPaths.className = "suggestion-full-paths";
  const fullPathsSummary = makeTextElement("summary", "", "Show full paths");
  const sourcePath = document.createElement("p");
  sourcePath.append(makeTextElement("strong", "", "Current location"));
  sourcePath.append(makeTextElement("code", "", suggestion.sourcePath));
  const destinationLabel = document.createElement("p");
  destinationLabel.append(makeTextElement("strong", "", "Proposed destination"));
  const destinationPath = makeTextElement("code", "", suggestion.destinationPath);
  destinationLabel.append(destinationPath);
  fullPaths.append(fullPathsSummary, sourcePath, destinationLabel);
  paths.append(locationSummary, fullPaths);
  card.append(paths);

  const destinationControls = document.createElement("div");
  destinationControls.className = "destination-controls";
  const rootLabel = makeTextElement("label", "", "Save under");
  const destinationRoot = document.createElement("select");
  destinationRoot.id = `destination-root-${index}`;
  rootLabel.htmlFor = destinationRoot.id;
  for (const folder of folders.filter((item) => item.available)) {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.label;
    destinationRoot.append(option);
  }
  destinationRoot.value = suggestion.destinationRootId;
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = `destination-name-${index}`;
  nameLabel.append(document.createTextNode("Purpose folder name "));
  nameLabel.append(makeTextElement("span", "", "(optional)"));
  const destinationFolderName = document.createElement("input");
  destinationFolderName.id = nameLabel.htmlFor;
  destinationFolderName.maxLength = 80;
  destinationFolderName.autocomplete = "off";
  destinationFolderName.value = suggestion.purposeFolderName || "";
  destinationControls.append(nameLabel, destinationFolderName, rootLabel, destinationRoot);
  card.append(destinationControls);

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "button button-secondary preview-button";
  previewButton.textContent = `Preview ${suggestion.fileName}`;
  card.append(previewButton);

  let previewRequest = 0;
  let reviewedDestinationPath = "";
  const previewPanel = document.createElement("div");
  previewPanel.className = "preview-panel";
  previewPanel.setAttribute("aria-live", "polite");
  previewPanel.hidden = true;
  card.append(previewPanel);

  function destinationForCard() {
    const folder = folders.find((item) => item.id === destinationRoot.value);
    if (!folder) return "an approved folder";
    const separator = folder.path.includes("\\") ? "\\" : "/";
    return [
      folder.path.replace(/[\\/]+$/, ""),
      destinationFolderName.value.trim(),
      suggestion.destinationFileName || suggestion.fileName
    ]
      .filter(Boolean)
      .join(separator);
  }
  function updateLocationSummary() {
    const root = folders.find((item) => item.id === destinationRoot.value);
    const destinationName = destinationFolderName.value.trim();
    locationSummary.textContent = `${suggestion.sourceRootLabel} → ${root?.label ?? "Folder"}${
      destinationName ? ` / ${destinationName}` : ""
    }`;
  }
  function updateDestinationLabel() {
    reviewedDestinationPath = "";
    approveButton.disabled = true;
    destinationPath.textContent = destinationForCard();
    updateLocationSummary();
  }
  updateLocationSummary();

  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.className = "button button-primary";
  approveButton.textContent = "Approve move";
  approveButton.disabled = true;
  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "button button-secondary";
  skipButton.textContent = "Skip for now";
  const operationError = makeTextElement("p", "preview-error", "");
  operationError.hidden = true;
  const actions = document.createElement("div");
  actions.className = "suggestion-actions";
  actions.append(skipButton, approveButton);
  card.append(operationError, actions);

  async function loadPreview() {
    setAppStatus(`Still processing — preparing a preview of ${suggestion.fileName}…`, {
      processing: true
    });
    previewPanel.hidden = false;
    reviewedDestinationPath = "";
    approveButton.disabled = true;
    previewPanel.replaceChildren(makeTextElement("p", "preview-unavailable", "Loading preview…"));
    const requestId = ++previewRequest;
    try {
      const preview = await window.organizer.previewSuggestedFile(
        suggestion.id,
        destinationRoot.value,
        destinationFolderName.value
      );
      if (requestId !== previewRequest) return;
      suggestion.destinationPath = preview.destinationPath;
      suggestion.destinationFileName = preview.destinationPath.split(/[\\/]/).pop();
      destinationPath.textContent = preview.destinationPath;
      reviewedDestinationPath = preview.destinationPath;
      renderPreview(preview, previewPanel);
      approveButton.disabled = false;
      setAppStatus(`Preview ready for ${suggestion.fileName}.`);
    } catch (error) {
      if (requestId !== previewRequest) return;
      previewPanel.replaceChildren(
        makeTextElement("h4", "", "File preview"),
        makeTextElement("p", "preview-meta", `${suggestion.fileName} · ${formatBytes(suggestion.fileSizeBytes)} · ${suggestion.typeLabel}`),
        makeTextElement("p", "preview-destination", `Current location: ${suggestion.sourcePath}`),
        makeTextElement("p", "preview-destination", `Destination: ${destinationForCard()}`),
        makeTextElement("p", "preview-error", `Preview error: ${error.message}`)
      );
      approveButton.disabled = true;
      setAppStatus(`Could not preview ${suggestion.fileName}: ${error.message}`, { error: true });
    }
  }

  previewButton.addEventListener("click", loadPreview);
  destinationControls.addEventListener("input", () => {
    reviewedDestinationPath = "";
    approveButton.disabled = true;
    destinationPath.textContent = destinationForCard();
    updateLocationSummary();
  });
  destinationControls.addEventListener("change", () => {
    updateDestinationLabel();
    if (!previewPanel.hidden) loadPreview();
  });
  skipButton.addEventListener("click", async () => {
    skipButton.disabled = true;
    setAppStatus(`Still processing — updating the move review for ${suggestion.fileName}…`, {
      processing: true
    });
    try {
      await window.organizer.skipMoveSuggestion(suggestion.id);
      moveSuggestions = moveSuggestions.filter((item) => item.id !== suggestion.id);
      moveNotice = `Skipped ${suggestion.fileName} for now. No files were moved.`;
      renderSuggestion();
      setAppStatus(`Done — skipped ${suggestion.fileName} for now.`);
    } catch (error) {
      skipButton.disabled = false;
      operationError.textContent = `We could not skip this suggestion: ${error.message}`;
      operationError.hidden = false;
      setAppStatus(`Could not skip ${suggestion.fileName}: ${error.message}`, { error: true });
    }
  });
  approveButton.addEventListener("click", async () => {
    if (!reviewedDestinationPath) return;
    approveButton.disabled = true;
    operationError.hidden = true;
    setAppStatus(`Still processing — moving ${suggestion.fileName}…`, { processing: true });
    try {
      const result = await window.organizer.approveMoveSuggestion(
        suggestion.id,
        destinationRoot.value,
        destinationFolderName.value,
        reviewedDestinationPath
      );
      if (result.requiresReview) {
        suggestion.destinationPath = result.destinationPath;
        suggestion.destinationFileName = result.destinationPath.split(/[\\/]/).pop();
        destinationPath.textContent = result.destinationPath;
        moveNotice = "The destination name changed. Review the updated preview before approving.";
        await loadPreview();
        suggestionNotice.textContent = moveNotice;
        suggestionNotice.hidden = false;
        setAppStatus(`Destination changed for ${suggestion.fileName}. Review the updated preview.`);
        return;
      }
      moveNotice = `Moved ${result.fileName} to ${result.destinationPath}`;
      await scanFolders({ resetSelection: false });
      showSuggestionPage(true);
      setAppStatus(`Done — moved ${result.fileName}.`);
    } catch (error) {
      approveButton.disabled = false;
      operationError.textContent = `We could not move this file: ${error.message}`;
      operationError.hidden = false;
      setAppStatus(`Could not move ${suggestion.fileName}: ${error.message}`, { error: true });
    }
  });

  return card;
}

function renderAlreadyOrganized() {
  alreadyOrganizedList.replaceChildren();
  for (const folder of alreadyOrganized) {
    const item = document.createElement("li");
    item.append(document.createTextNode(`${folder.folderName} — ${folder.fileCount} ${folder.fileCount === 1 ? "file" : "files"}`));
    item.append(makeTextElement("code", "", folder.path));
    alreadyOrganizedList.append(item);
  }
}

function renderSuggestion() {
  const suggestionCount = moveSuggestions.length;
  suggestionNotice.textContent = moveNotice;
  suggestionNotice.hidden = !moveNotice;
  suggestionProgress.textContent = suggestionCount
    ? `${suggestionCount} ${suggestionCount === 1 ? "move" : "moves"} to review`
    : "All caught up";
  suggestionEmpty.hidden = suggestionCount > 0;
  suggestionEmpty.textContent = "No move suggestions right now. Your files remain where they are.";
  suggestionsButton.textContent = "Organize Files";
  skippedFilesSummary.textContent = `Skipped files (${skippedFiles.length})`;
  skippedFilesDisclosure.hidden = skippedFiles.length === 0;
  appendReviewItems(skippedFilesList, skippedFiles, "skipped-reason");
  alreadyOrganizedSummary.textContent = `Already organized (${alreadyOrganized.length} ${alreadyOrganized.length === 1 ? "folder" : "folders"})`;
  alreadyOrganizedDisclosure.hidden = alreadyOrganized.length === 0;
  renderAlreadyOrganized();
  const pageSize = Number(movePageSize.value);
  const pageRange = renderPagination(moveSuggestions.length, pageSize, movePage, {
    previous: movePagePrevious,
    status: movePageStatus,
    next: movePageNext
  });
  movePage = pageRange.page;
  movePagination.hidden = suggestionCount === 0;
  suggestionGrid.replaceChildren(
    ...moveSuggestions.slice(pageRange.start, pageRange.end).map(renderMoveSuggestion)
  );
}

function renderDeletionCandidate(candidate) {
  const card = document.createElement("article");
  card.className = "deletion-card";

  const heading = document.createElement("div");
  heading.className = "suggestion-card-heading";
  heading.append(makeTextElement("h3", "", candidate.fileName));
  const tags = document.createElement("div");
  tags.className = "deletion-tags";
  for (const tag of candidate.reasonTags) {
    const label = tag === "duplicate"
      ? "Possible duplicate"
      : tag === "old"
        ? "More than one year old"
        : "Possibly unused";
    tags.append(makeTextElement("span", "deletion-tag", label));
  }
  card.append(heading, tags);

  const reasons = document.createElement("ul");
  reasons.className = "deletion-reasons";
  for (const reason of candidate.reasons) {
    reasons.append(makeTextElement("li", "", reason));
  }
  card.append(reasons);

  const details = document.createElement("div");
  details.className = "deletion-details";
  details.append(
    makeTextElement("strong", "", "Current location"),
    makeTextElement("code", "", candidate.filePath),
    makeTextElement(
      "span",
      "",
      `${formatBytes(candidate.sizeBytes)} · Modified ${formatModifiedDate(candidate.modifiedAt)}`
    )
  );
  card.append(details);

  const previewButton = makeTextElement("button", "button button-secondary preview-button", "Preview file");
  previewButton.type = "button";
  const previewPanel = document.createElement("div");
  previewPanel.className = "preview-panel";
  previewPanel.setAttribute("aria-live", "polite");
  previewPanel.hidden = true;
  let previewRequest = 0;
  previewButton.addEventListener("click", async () => {
    if (!previewPanel.hidden) {
      previewPanel.hidden = true;
      previewButton.textContent = "Preview file";
      return;
    }
    previewPanel.hidden = false;
    previewButton.textContent = "Hide preview";
    setAppStatus(`Still processing — preparing a preview of ${candidate.fileName}…`, {
      processing: true
    });
    previewPanel.replaceChildren(makeTextElement("p", "preview-unavailable", "Preparing preview…"));
    const request = ++previewRequest;
    const entry = {
      name: candidate.fileName,
      rootId: candidate.sourceRootId,
      relativePath: candidate.sourceRelativePath,
      path: candidate.filePath,
      sizeBytes: candidate.sizeBytes,
      modifiedAt: candidate.modifiedAt
    };
    try {
      const preview = await window.organizer.previewFile(entry.rootId, entry.relativePath);
      if (request !== previewRequest || previewPanel.hidden) return;
      renderBrowsePreview(preview, entry, previewPanel, { showOpen: false });
      setAppStatus(`Preview ready for ${candidate.fileName}.`);
    } catch (error) {
      if (request !== previewRequest || previewPanel.hidden) return;
      previewPanel.replaceChildren(
        makeTextElement("h3", "", candidate.fileName),
        makeTextElement(
          "p",
          "preview-meta",
          `${formatBytes(candidate.sizeBytes)} · ${typeLabel(candidate.fileName)}`
        ),
        makeTextElement("code", "preview-destination", candidate.filePath),
        makeTextElement("p", "preview-error", `Preview error: ${error.message}`)
      );
      setAppStatus(`Could not preview ${candidate.fileName}: ${error.message}`, { error: true });
    }
  });
  card.append(previewButton, previewPanel);

  const actions = document.createElement("div");
  actions.className = "suggestion-actions";
  const keepButton = makeTextElement("button", "button button-secondary", "Keep");
  keepButton.type = "button";
  const deleteButton = makeTextElement("button", "button button-danger", "Delete");
  deleteButton.type = "button";
  keepButton.addEventListener("click", async () => {
    keepButton.disabled = true;
    deleteButton.disabled = true;
    deletionNotice.hidden = true;
    setAppStatus(`Still processing — keeping ${candidate.fileName} in place…`, {
      processing: true
    });
    try {
      const result = await window.organizer.keepDeletionCandidate(candidate.id);
      deletionCandidates = deletionCandidates.filter((item) => item.id !== candidate.id);
      deletionReviewedCount += 1;
      deletionNotice.textContent = `Kept ${result.fileName}. It remains where it is.`;
      deletionNotice.hidden = false;
      renderDeletionReview();
      setAppStatus(`Done — ${result.fileName} stays where it is.`);
    } catch (error) {
      keepButton.disabled = false;
      deleteButton.disabled = false;
      deletionNotice.textContent = `We could not keep this review item: ${error.message}`;
      deletionNotice.hidden = false;
      setAppStatus(`Could not update the review for ${candidate.fileName}: ${error.message}`, { error: true });
    }
  });
  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `Send "${candidate.fileName}" to the Windows Recycle Bin? You can restore it from there.`
    );
    if (!confirmed) return;
    keepButton.disabled = true;
    deleteButton.disabled = true;
    deletionNotice.hidden = true;
    setAppStatus(`Still processing — sending ${candidate.fileName} to the Recycle Bin…`, {
      processing: true
    });
    try {
      const result = await window.organizer.deleteCandidate(candidate.id);
      deletionCandidates = deletionCandidates.filter((item) => item.id !== candidate.id);
      deletionReviewedCount += 1;
      deletionNotice.textContent = `Sent ${result.fileName} to the Recycle Bin.`;
      deletionNotice.hidden = false;
      renderDeletionReview();
      setAppStatus(`Done — ${result.fileName} was sent to the Recycle Bin.`);
    } catch (error) {
      keepButton.disabled = false;
      deleteButton.disabled = false;
      deletionNotice.textContent = `We could not send this file to the Recycle Bin: ${error.message}`;
      deletionNotice.hidden = false;
      setAppStatus(`Could not send ${candidate.fileName} to the Recycle Bin: ${error.message}`, { error: true });
    }
  });
  actions.append(keepButton, deleteButton);
  card.append(actions);
  return card;
}

function renderDeletionReview() {
  const count = deletionCandidates.length;
  deletionReviewButton.textContent = "Delete Files";
  deletionProgress.textContent = count
    ? `${count} ${count === 1 ? "candidate" : "candidates"} to review`
    : "All caught up";
  deletionEmpty.hidden = count > 0;
  deletionEmpty.textContent = deletionReviewedCount
    ? "No more candidates to review. Files you kept remain where they are."
    : deletionReviewIssues.length
      ? "No candidates are ready to review. Some files could not be checked; see the details below."
      : "Your files are clean.";
  const pageSize = Number(deletionPageSize.value);
  const pageRange = renderPagination(count, pageSize, deletionPage, {
    previous: deletionPagePrevious,
    status: deletionPageStatus,
    next: deletionPageNext
  });
  deletionPage = pageRange.page;
  deletionPagination.hidden = count === 0;
  deletionCandidateContainer.replaceChildren(
    ...deletionCandidates
      .slice(pageRange.start, pageRange.end)
      .map(renderDeletionCandidate)
  );
  deletionIssues.replaceChildren();
  for (const issue of deletionReviewIssues) {
    const item = document.createElement("p");
    item.append(
      makeTextElement("strong", "", issue.fileName),
      makeTextElement("span", "", ` — ${issue.reason}`)
    );
    if (issue.filePath) item.append(makeTextElement("code", "", issue.filePath));
    deletionIssues.append(item);
  }
  deletionIssues.hidden = deletionReviewIssues.length === 0;
}

function showSuggestionPage(open) {
  showPage(open ? "suggestions" : (purposeFolders.length ? "purpose" : "general"));
}

function navigateBack() {
  if (!selectedFolder) return;
  if (selectedFolder.relativeDirectory !== selectedFolder.baseRelativeDirectory) {
    const separator = selectedFolder.relativeDirectory.includes("\\") ? "\\" : "/";
    const relativeParts = selectedFolder.relativeDirectory.split(/[\\/]/);
    relativeParts.pop();
    const relativeDirectory = relativeParts.join(separator);
    const parentPath = selectedFolder.path.replace(/[\\/][^\\/]+$/, "");
    const label = relativeDirectory
      ? relativeDirectory.split(/[\\/]/).pop()
      : selectedFolder.baseLabel;
    selectedFolder = {
      ...selectedFolder,
      label,
      path: relativeDirectory === selectedFolder.baseRelativeDirectory
        ? selectedFolder.basePath
        : parentPath,
      relativeDirectory
    };
    hideFilePreview();
    loadSelectedFolder();
    return;
  }
  const homeView = selectedFolder.homeView;
  selectedFolder = null;
  directoryEntries = [];
  showPage(homeView);
}

async function scanFolders({ resetSelection = true } = {}) {
  clearTimeout(searchTimer);
  searchRequest += 1;
  setAppStatus("Still processing — scanning your folders…", { processing: true });
  deletionNotice.textContent = "";
  deletionNotice.hidden = true;
  if (resetSelection) {
    directoryRequest += 1;
    moveNotice = "";
    selectedFolder = null;
    directoryEntries = [];
    contentsHeading.textContent = "Choose a folder";
    folderPath.textContent = "Your files will appear here.";
    backButton.hidden = true;
  }
  showMessage("Checking your folders…");
  setStatus("Scanning…");
  rescanButton.disabled = true;

  try {
    const result = await window.organizer.scanFolders();
    folders = result.folders;
    purposeFolders = result.purposeFolders;
    moveSuggestions = result.suggestions;
    deletionCandidates = result.deletionCandidates;
    deletionReviewIssues = result.deletionIssues;
    deletionReviewedCount = 0;
    skippedFiles = result.skippedFiles;
    alreadyOrganized = result.alreadyOrganized;
    renderFolders();
    renderPurposeFolders();
    renderAccessIssues();
    renderSuggestion();
    renderDeletionReview();
    purposeFoldersButton.hidden = purposeFolders.length === 0;
    if (resetSelection) {
      if (currentPage === "search" && searchInput.value.trim()) {
        showPage("search");
        handleSearchInput();
      } else if (currentPage === "suggestions" || currentPage === "deletions") {
        showPage(currentPage);
      } else {
        showPage(purposeFolders.length ? "purpose" : "general");
      }
    }
    const issueCount = folders.reduce(
      (count, folder) => count + folder.errors.filter((error) => error.kind !== "file").length,
      0
    );
    setStatus(issueCount
      ? `${issueCount} locations need attention`
      : `${moveSuggestions.length} move suggestions · ${deletionCandidates.length} deletion candidates`);
    setAppStatus(
      issueCount
        ? `Scan complete — ${issueCount} locations need attention.`
        : `Scan complete — ${moveSuggestions.length} moves and ${deletionCandidates.length} deletion candidates ready.`
    );
    if (issueCount) {
      showMessage("Some folders need attention. Their details and paths are listed above.");
    } else {
      showMessage("Choose a folder to see its files.");
    }
    return true;
  } catch (error) {
    setStatus("Scan could not finish");
    showMessage(`We could not scan your folders: ${error.message}`);
    setAppStatus(`We could not scan your folders: ${error.message}`, { error: true });
    moveSuggestions = [];
    deletionCandidates = [];
    deletionReviewIssues = [];
    deletionReviewedCount = 0;
    skippedFiles = [];
    alreadyOrganized = [];
    purposeFolders = [];
    moveNotice = `We could not prepare move suggestions: ${error.message}`;
    renderPurposeFolders();
    purposeFoldersButton.hidden = true;
    renderSuggestion();
    if (resetSelection) showPage("general");
    return false;
  } finally {
    rescanButton.disabled = false;
  }
}

async function addExistingPurposeFolder() {
  addPurposeFolderButton.disabled = true;
  try {
    const result = await window.organizer.addExistingPurposeFolder();
    if (result.cancelled) return;
    if (!await scanFolders()) {
      throw new Error("The folder was added, but the scan could not refresh the purpose-folder list.");
    }
    showPage("purpose");
    setAppStatus(`Added ${result.entry.name} to your purpose folders.`);
  } catch (error) {
    setAppStatus(`Could not add that folder: ${error.message}`, { error: true });
  } finally {
    addPurposeFolderButton.disabled = false;
  }
}

rescanButton.addEventListener("click", scanFolders);
purposeFoldersButton.addEventListener("click", () => showPage("purpose"));
generalFoldersButton.addEventListener("click", () => showPage("general"));
suggestionsButton.addEventListener("click", () => showSuggestionPage(true));
deletionReviewButton.addEventListener("click", () => showPage("deletions"));
addPurposeFolderButton.addEventListener("click", addExistingPurposeFolder);
movePageSize.addEventListener("change", () => {
  movePage = 0;
  renderSuggestion();
});
movePagePrevious.addEventListener("click", () => {
  movePage = Math.max(0, movePage - 1);
  renderSuggestion();
});
movePageNext.addEventListener("click", () => {
  movePage += 1;
  renderSuggestion();
});
deletionPageSize.addEventListener("change", () => {
  deletionPage = 0;
  renderDeletionReview();
});
deletionPagePrevious.addEventListener("click", () => {
  deletionPage = Math.max(0, deletionPage - 1);
  renderDeletionReview();
});
deletionPageNext.addEventListener("click", () => {
  deletionPage += 1;
  renderDeletionReview();
});
searchInput.addEventListener("input", handleSearchInput);
listViewButton.addEventListener("click", () => setLayout("list"));
gridViewButton.addEventListener("click", () => setLayout("grid"));
backButton.addEventListener("click", navigateBack);
closePreviewButton.addEventListener("click", hideFilePreview);

showPage("general");
scanFolders();

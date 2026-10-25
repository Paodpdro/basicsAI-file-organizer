const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { formatModifiedDate } = require("../src/renderer/date-utils");

const rendererSource = fs.readFileSync(
  path.join(__dirname, "../src/renderer/app.js"),
  "utf8"
);

class FakeNode {
  constructor(tagName = "#text", text = "") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = {
      toggle: () => {},
      add: () => {},
      remove: () => {}
    };
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this._textContent = text;
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this._textContent = "";
    this.children = [...nodes];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  async click() {
    if (this.disabled) return;
    await Promise.all((this.listeners.get("click") ?? []).map((listener) =>
      listener({ target: this })
    ));
  }
}

function makeSuggestion(id, fileName) {
  return {
    id,
    fileName,
    typeLabel: "TXT",
    fileSizeBytes: 24,
    reason: "The filename suggests a useful purpose folder.",
    sourcePath: `C:\\Users\\TestUser\\Downloads\\${fileName}`,
    sourceRootId: "downloads",
    sourceRootLabel: "Downloads",
    sourceRelativePath: fileName,
    destinationRootId: "documents",
    destinationPath: `C:\\Users\\TestUser\\Documents\\Research\\${fileName}`,
    purposeFolderName: "Research"
  };
}

function makeDeletionCandidate(id, fileName) {
  return {
    id,
    fileName,
    reasonTags: ["old"],
    reasons: ["Modified more than one year ago."],
    filePath: `C:\\Users\\TestUser\\Downloads\\${fileName}`,
    sizeBytes: 24,
    modifiedAt: "2020-01-01T00:00:00.000Z",
    sourceRootId: "downloads",
    sourceRelativePath: fileName
  };
}

function makeScanResult(suggestions, deletionCandidates) {
  return {
    folders: [
      {
        id: "downloads",
        label: "Downloads",
        path: "C:\\Users\\TestUser\\Downloads",
        fileCount: 4,
        available: true,
        errors: []
      },
      {
        id: "documents",
        label: "Documents",
        path: "C:\\Users\\TestUser\\Documents",
        fileCount: 0,
        available: true,
        errors: []
      }
    ],
    purposeFolders: [
      {
        id: "research",
        name: "Research",
        rootId: "documents",
        path: "C:\\Users\\TestUser\\Documents\\Research",
        relativeDirectory: "Research",
        available: true
      }
    ],
    suggestions,
    deletionCandidates,
    deletionIssues: [],
    skippedFiles: [],
    skippedFolders: [],
    needsPreview: [],
    alreadyOrganized: []
  };
}

function findAll(root, predicate) {
  const matches = [];
  const visit = (node) => {
    if (predicate(node)) matches.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return matches;
}

function findButton(root, label) {
  const button = findAll(root, (node) => node.tagName === "BUTTON" && node.textContent === label)[0];
  assert.ok(button, `Expected button "${label}"`);
  return button;
}

async function startRenderer({ deferMoveRefresh = false } = {}) {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      const id = selector.slice(1);
      if (!elements.has(id)) {
        const element = new FakeNode("div");
        element.id = id;
        if (id.endsWith("page-size")) element.value = "5";
        elements.set(id, element);
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(text) {
      return new FakeNode("#text", String(text));
    }
  };

  const suggestions = [
    makeSuggestion("move-1", "A-very-long-research-file-name-that-should-not-appear-on-the-preview-button.txt"),
    makeSuggestion("move-2", "second-file.txt")
  ];
  const deletionCandidates = [
    makeDeletionCandidate("delete-1", "old-file.txt"),
    makeDeletionCandidate("delete-2", "older-file.txt")
  ];
  const initialResult = makeScanResult(suggestions, deletionCandidates);
  const afterMoveResult = makeScanResult(suggestions.slice(1), deletionCandidates);
  let scanCalls = 0;
  let resolveMoveRefresh;
  let markMoveRefreshStarted;
  const moveRefreshStarted = new Promise((resolve) => {
    markMoveRefreshStarted = resolve;
  });
  const organizer = {
    onScanProgress() {},
    scanFolders() {
      scanCalls += 1;
      if (scanCalls === 1) return Promise.resolve(initialResult);
      if (scanCalls === 2 && deferMoveRefresh) {
        return new Promise((resolve) => {
          resolveMoveRefresh = resolve;
          markMoveRefreshStarted();
        });
      }
      return Promise.resolve(afterMoveResult);
    },
    async previewSuggestedFile(id) {
      const suggestion = suggestions.find((item) => item.id === id);
      return {
        kind: "text",
        fileName: suggestion.fileName,
        sizeBytes: suggestion.fileSizeBytes,
        type: "TXT",
        modifiedAt: "2025-01-01T00:00:00.000Z",
        sourcePath: suggestion.sourcePath,
        destinationPath: suggestion.destinationPath,
        text: "preview text",
        truncated: false
      };
    },
    async approveMoveSuggestion(id) {
      const suggestion = suggestions.find((item) => item.id === id);
      return {
        fileName: suggestion.fileName,
        destinationPath: suggestion.destinationPath,
        requiresReview: false
      };
    },
    async skipMoveSuggestion() {},
    async keepDeletionCandidate(id) {
      const candidate = deletionCandidates.find((item) => item.id === id);
      return { fileName: candidate.fileName };
    },
    async deleteCandidate(id) {
      const candidate = deletionCandidates.find((item) => item.id === id);
      return { fileName: candidate.fileName };
    }
  };
  const window = {
    organizer,
    confirm: () => true
  };

  vm.runInNewContext(rendererSource, {
    document,
    window,
    formatModifiedDate,
    clearTimeout,
    setTimeout,
    console
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(
    elements.get("suggestion-grid").children.length,
    `Initial scan failed: ${elements.get("app-notice").textContent}`
  );
  return {
    elements,
    scanCalls: () => scanCalls,
    moveRefreshStarted,
    finishMoveRefresh: () => resolveMoveRefresh(afterMoveResult)
  };
}

test("move-card preview button uses a short label and toggles the preview", async () => {
  const { elements } = await startRenderer();
  const suggestionGrid = elements.get("suggestion-grid");
  const firstCard = suggestionGrid.children[0];
  const previewButton = findAll(firstCard, (node) =>
    node.tagName === "BUTTON" && node.className.includes("preview-button")
  )[0];
  const previewPanel = firstCard.children.find((node) =>
    node.className === "preview-panel"
  );

  assert.equal(previewButton.textContent, "Preview file");
  assert.equal(previewPanel.hidden, true);
  await previewButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(previewButton.textContent, "Hide preview");
  assert.equal(previewButton.attributes.get("aria-expanded"), "true");
  assert.equal(previewPanel.hidden, false);

  await previewButton.click();
  assert.equal(previewButton.textContent, "Preview file");
  assert.equal(previewButton.attributes.get("aria-expanded"), "false");
  assert.equal(previewPanel.hidden, true);

  await previewButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(previewButton.textContent, "Hide preview");
  assert.equal(previewPanel.hidden, false);
});

test("move and deletion decisions refresh all review counts without a manual rescan", async () => {
  const {
    elements,
    scanCalls,
    moveRefreshStarted,
    finishMoveRefresh
  } = await startRenderer({ deferMoveRefresh: true });
  const suggestionGrid = elements.get("suggestion-grid");
  const firstMoveCard = suggestionGrid.children[0];
  const previewButton = findAll(firstMoveCard, (node) =>
    node.tagName === "BUTTON" && node.className.includes("preview-button")
  )[0];
  await previewButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  const approvePromise = findButton(firstMoveCard, "Approve move").click();
  await moveRefreshStarted;
  assert.equal(elements.get("suggestion-progress").textContent, "1 move to review");
  finishMoveRefresh();
  await approvePromise;

  assert.equal(scanCalls(), 2);
  assert.equal(elements.get("suggestion-progress").textContent, "1 move to review");
  assert.equal(
    elements.get("scan-status").textContent,
    "1 move suggestions · 2 deletion candidates"
  );
  assert.match(elements.get("app-notice").textContent, /1 move suggestions · 2 deletion candidates/);

  for (const pageButtonId of ["general-folders-button", "purpose-folders-button"]) {
    await elements.get(pageButtonId).click();
    assert.equal(elements.get("browser-toolbar").hidden, false);
    assert.equal(
      elements.get("scan-status").textContent,
      "1 move suggestions · 2 deletion candidates"
    );
  }
  await elements.get("suggestions-button").click();
  const remainingMoveCard = suggestionGrid.children[0];
  await findButton(remainingMoveCard, "Skip for now").click();
  assert.equal(scanCalls(), 2);
  assert.equal(elements.get("suggestion-progress").textContent, "All caught up");
  assert.equal(
    elements.get("scan-status").textContent,
    "0 move suggestions · 2 deletion candidates"
  );
  assert.match(elements.get("app-notice").textContent, /0 move suggestions · 2 deletion candidates/);

  await elements.get("deletion-review-button").click();
  const deletionGrid = elements.get("deletion-candidate");
  await findButton(deletionGrid.children[0], "Keep").click();
  assert.equal(scanCalls(), 2);
  assert.equal(elements.get("deletion-progress").textContent, "1 candidate to review");
  assert.equal(
    elements.get("scan-status").textContent,
    "0 move suggestions · 1 deletion candidates"
  );
  assert.match(elements.get("app-notice").textContent, /0 move suggestions · 1 deletion candidates/);

  for (const pageButtonId of ["general-folders-button", "purpose-folders-button"]) {
    await elements.get(pageButtonId).click();
    assert.equal(
      elements.get("scan-status").textContent,
      "0 move suggestions · 1 deletion candidates"
    );
  }

  await elements.get("deletion-review-button").click();
  await findButton(deletionGrid.children[0], "Delete").click();
  assert.equal(scanCalls(), 2);
  assert.equal(elements.get("deletion-progress").textContent, "All caught up");
  assert.equal(
    elements.get("scan-status").textContent,
    "0 move suggestions · 0 deletion candidates"
  );
  assert.match(elements.get("app-notice").textContent, /0 move suggestions · 0 deletion candidates/);
});

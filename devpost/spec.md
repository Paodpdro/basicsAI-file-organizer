---
doc: spec
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Personal File Organizer — Technical Spec

## How This Works, In Plain Language
This is a Windows desktop app made with Electron. Electron opens a normal app window, but the screen itself is built with HTML, CSS, and JavaScript—the tools Paul already knows.

The screen is not allowed to reach into the computer's files directly. A small, limited connection asks the Electron main part to scan or change only the six approved personal folders. That part uses Node.js to inspect real files, create real folders, move accepted files, and send deletion candidates to the Windows Recycle Bin only after confirmation. The screen receives a safe summary and shows it to Paul. This separation helps prevent a mistaken screen action from operating on system folders.

The first version uses clear local rules, not an AI model or an internet service. It can use names, file types, sizes, dates, and locally extracted text from supported text and PDF files to suggest a folder. Paul reviews each suggestion. A purpose-based folder is a real folder under a useful general folder—such as Research under Documents or Qatar Images under Pictures—and the purpose page is an index to these folders wherever they live. Paul can name a folder; the app can suggest a name and a standard parent location.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Paul starts the app in Windows. The Electron main part locates the six standard personal folders and starts a scan.
2. The scanner lists files under those folders, ignoring system/application locations and paths that lead outside the allowed roots. It gathers file properties and extracts text locally from supported files. Nothing is uploaded.
3. The suggestion builder compares the gathered information with known folder names and simple keyword/type rules. It prepares organization suggestions and cautious deletion candidates. The scan does not change any file.
4. The screen shows the purpose-folder index, or the general-folder cards when no purpose folders are registered. Search and browse show files from the current scan.
5. For a move suggestion, Paul sees the file and its source and proposed destination. Accept or Reject opens a confirmation. After confirmation, the main part rechecks the paths, creates the real destination folder if needed, and moves the file. The screen refreshes; the same folder and move are visible in Windows File Explorer. Rejecting skips the suggestion until a later scan.
6. For a deletion candidate, Paul sees its reason tag and path. After confirming Delete, the main part sends the file to the Recycle Bin; Keep leaves it in place. A file is never deleted automatically.
7. Preview requests supported file contents through the limited connection. Open asks Windows to use its usual application. Rescan repeats steps 2–3 and refreshes both suggestion lists.

## Stack
- **Electron** — opens a standalone Windows window and provides the main/preload/renderer separation. Documentation: [Electron documentation](https://www.electronjs.org/docs/latest/), [process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [security](https://www.electronjs.org/docs/latest/tutorial/security).
- **JavaScript, HTML, and CSS** — plain browser technologies for the window, chosen to build on Paul's existing experience rather than add a UI framework.
- **Node.js built-in `fs`, `path`, `os`, and `crypto` modules** — locate allowed folders, inspect files, create folders, move files, and calculate exact-content duplicate hashes. Documentation: [File system](https://nodejs.org/api/fs.html), [Path](https://nodejs.org/api/path.html), [OS](https://nodejs.org/api/os.html), [Crypto](https://nodejs.org/api/crypto.html).
- **PDF.js (`pdfjs-dist`)** — locally extracts PDF text for scan suggestions and renders PDFs in Preview. Documentation: [PDF.js project and examples](https://mozilla.github.io/pdf.js/). Confirm a compatible package version and Electron setup in the first build step.
- **Node.js built-in test runner** — focused tests for rules and safe file operations without adding a test framework. Documentation: [Node.js test runner](https://nodejs.org/api/test.html).
- **npm** — install and run project dependencies. No Express, Mustache, database, AI model, login, API key, or external service.

Use the current supported Node.js LTS and compatible stable Electron/PDF.js releases; pin the selected versions in `package.json` and `package-lock.json` during setup. Verify compatibility in the build rather than guessing versions in this planning document.

## Where It Runs and How Someone Tries It
- **Runtime:** Windows desktop app, launched in its own Electron window. Development files may be edited in WSL, but install, run, and verify the app using the Windows Node.js/npm environment so real Windows folders and File Explorer behavior are tested.
- **Prerequisite:** Supported Node.js LTS installed on Windows.
- **First run:** Open the project directory from Windows PowerShell, run `npm install`, then run `npm start`. This opens the desktop app; no browser address, hosted server, or API key is needed.
- **Workspace note:** Confirm during the first build step how Windows PowerShell reaches this WSL workspace. If Electron or npm cannot run reliably from the WSL network path, use a Windows-side working copy of the project; keep the source changes synchronized.
- **Demo:** Start the app with `npm start`, scan a small set of test files in the six standard folders, review a proposed move, confirm it, and show the new real folder/file in File Explorer. Also demonstrate a deletion candidate being sent to Recycle Bin only after confirmation, a Preview, and the clean empty state where practical.
- **Submission:** A short demo video and public GitHub repository are required. Deployment is optional and not part of this local-only app.

## Look and Feel
- Use a spacious, approachable interface with clear cards, readable labels, and large, easy-to-find actions.
- Use white with blue and yellow/gold accents; reserve red for deletion actions and warnings.
- Keep copy short, descriptive, kind, and non-blaming. Use simple transitions only; no complex animation.
- Make source and destination paths visually distinct and readable. Ensure the app remains usable with keyboard focus and visible focus indicators.
- Implement with plain CSS; the palette and Duolingo-like friendliness do not require a component framework.

## Components

### Electron Main Process
Creates the app window, identifies the standard Windows personal-folder paths, coordinates scanning and file operations, and handles OS actions such as opening files or moving them to Recycle Bin. It validates every requested path against the allowed roots before reading or changing a file.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Preload Bridge
Exposes a small, explicit set of actions to the screen—start/rescan, list folders/files, search, preview, open, and confirm a move or deletion. Use Electron `contextBridge`/IPC with `contextIsolation: true`, `nodeIntegration: false`, and sandboxing where compatible. Do not expose raw `fs`, arbitrary path operations, or unrestricted shell commands to the screen.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Renderer Interface
Displays the purpose-folder index, general-folder cards, Windows extras, folder contents, search, scan progress, move suggestions, deletion review, confirmation dialogs, and friendly empty/error messages. It contains no direct file-system access.
PRD ref: `prd.md > Screens and Layout`, `Look and Feel`, and `States and Boundaries`.

### Standard-Folder Scanner
Finds Documents, Downloads, Desktop, Pictures, Music, and Videos for the current Windows user. Walks their subfolders without following directory links/reparse points outside the allowed roots. Skips inaccessible entries with a visible path/error summary; does not silently count them as scanned. For the Windows-extras page, classify common installer/executable files (including `.exe`, `.msi`, and `.msix`) only when they are found inside these personal roots.
PRD ref: `prd.md > Scanning and organization suggestions` and `Access problems`.

### Local File Analyzer and Suggestion Builder
Collects file name, extension/type, byte size, modified date, and other useful basic properties. Extracts local text from supported plain-text files and PDFs with PDF.js; reads no file contents over a network. Image files use names and file properties only—no OCR in this version. Uses simple, explainable keyword and file-type rules that relate contents/properties to existing purpose-folder names and the six standard parent folders. It can suggest a purpose-folder name and parent when a grouping is apparent; Paul reviews the suggestion before anything is created or moved.

For deletion tags, **duplicate** means matching SHA-256 content hashes, not merely matching names. **Old** means last modified more than one year ago; use a last-opened date only if Windows supplies a trustworthy value, otherwise do not infer it. **Possibly unused** remains a cautious rule-based hint, never proof that a file is safe to remove. Rules are local and transparent; they do not provide AI-level understanding.
PRD ref: `prd.md > Scanning and organization suggestions` and `Deletion review`.

### Purpose-Folder Index
Stores the user's names and the real absolute paths of purpose folders, which may be nested under different general folders. The index is a navigation aid, not a virtual folder: files stay at the corresponding real paths. Paul can register an existing folder from one of the six roots or create a purpose folder with his own name; the app may suggest a name and parent location. Accepting a suggested move can create a missing purpose folder on disk only after confirmation.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, and `Product Decisions`.

### File Operation Handler
Revalidates a confirmed move against the allowed roots, creates the selected real folder when needed, and moves the actual file. A confirmed delete uses Electron's Recycle Bin operation (`shell.trashItem`) rather than permanent unlinking. If the operation fails, preserve the source, report the exact failure clearly, and do not show success.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `States and Boundaries`.

### Search, Preview, and Open
Searches the current scan's file names and paths. Preview displays supported images, text, and PDFs locally; unsupported or unreadable formats show a clear unavailable message with an Open action. Open uses Electron's `shell.openPath` so Windows launches the normal associated program. PDF Preview and text extraction use PDF.js; no previewed content leaves the computer.
PRD ref: `prd.md > Browsing and searching`.

### Local Preferences
Stores the purpose-folder index and small UI preferences locally. Scan results and suggestions are temporary in-memory data and are replaced by Rescan; personal file contents are not saved as an index on disk.
PRD ref: `prd.md > States and Boundaries` and `Product Decisions`.

## Data Model
- **Allowed roots:** Derived from Windows known-folder paths for the current user. These are the six scan roots. Every discovered file path must remain within one of these roots after normalization; do not follow links/reparse points outside them.
- **File record (memory during scan):** `path`, `name`, `extension`, `sizeBytes`, `modifiedAt`, optional reliable `accessedAt`, and optional extracted text used only for the current scan/preview.
- **Move suggestion (memory):** `filePath`, `sourcePath`, `destinationRoot`, `purposeFolderName` or existing folder path, short reason, and status (`pending`, `accepted`, `rejected`). On confirmation, the real filesystem operation runs; then the scan view refreshes.
- **Deletion suggestion (memory):** `filePath`, reason tags, hash only when needed for duplicate checking, and review status. Confirmed deletion sends the file to Recycle Bin.
- **Purpose-folder index (local JSON):** entries of `{ name, path, parentType }`. Update after the user creates or accepts a folder; validate paths at load and use. If a path no longer exists, show it as unavailable and let the user remove or repair the entry.
- **UI preferences (local JSON):** current grid/list choice and last selected page if useful. No account or sync.
- **Persistence:** Save preferences/index under Electron `app.getPath("userData")`. Keep scan records, extracted text, and suggestion queues in memory only. Closing the app discards pending suggestions; a new launch rescans.

## File Structure
```text
project/
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
├── src/
│   ├── main/
│   │   ├── main.js             # Create window; register IPC actions
│   │   ├── scanner.js          # Resolve allowed roots and list safe file records
│   │   ├── analyzer.js         # Extract local text and build explainable suggestions
│   │   ├── file-operations.js  # Validate and perform confirmed moves/trash/open
│   │   └── preferences.js      # Read/write purpose-folder index and UI preferences
│   ├── preload/
│   │   └── preload.js          # Narrow, validated screen-to-main API
│   └── renderer/
│       ├── index.html          # App window shell and page containers
│       ├── styles.css          # Friendly palette, cards, layouts, focus styles
│       ├── app.js              # Navigation, rendering, confirmations, view actions
│       ├── preview.js          # Image/text/PDF preview and unsupported fallback
│       └── assets/             # Local icons only; no remote assets
├── test/
│   ├── analyzer.test.js        # Rule and duplicate classification checks
│   └── file-operations.test.js # Temporary-fixture move/trash validation
├── package.json
├── package-lock.json
└── README.md                   # Windows setup/run and safe demo instructions
```

## External Services and Dependencies
- **No external services.** No online AI, cloud storage, remote API, database, account, or deployment.
- **Electron** — desktop runtime and safe IPC. Docs: [Electron](https://www.electronjs.org/docs/latest/), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [security](https://www.electronjs.org/docs/latest/tutorial/security), [shell API](https://www.electronjs.org/docs/latest/api/shell).
- **PDF.js / `pdfjs-dist`** — local PDF text extraction and rendering. Docs: [PDF.js](https://mozilla.github.io/pdf.js/).
- **Node.js built-ins** — file system/path/platform and cryptographic hash; docs: [fs](https://nodejs.org/api/fs.html), [path](https://nodejs.org/api/path.html), [os](https://nodejs.org/api/os.html), [crypto](https://nodejs.org/api/crypto.html).
- No keys, network calls, service costs, or quotas.

## Important Failure Modes
- **A personal folder is inaccessible or missing** → identify it and show a copyable path; continue with accessible roots and clearly report partial scan results.
- **A file changes or disappears after scan, or a move/trash operation is refused** → recheck immediately before acting; preserve the original, show a clear error, and refresh the affected view only after success.
- **A file is unsupported, corrupt, or cannot be parsed for Preview/text** → show Preview unavailable or a text-extraction warning and offer Open; still use safe metadata for other suggestions. Never claim that unreadable means useless.
- **A path points outside the six allowed roots** → reject the operation and report that the location is outside the scan boundary.

## What Was Simplified and Why
- **Rule-based local suggestions** instead of an AI model — avoids accounts, keys, cost, and uploading sensitive student documents; suggestions are less context-aware and always require review.
- **Six known personal folders** instead of crawling an entire drive — avoids system/application files and keeps the scan bounded; additional personal roots can be added later.
- **Text and PDF content extraction; image metadata only** instead of understanding every file format — keeps dependencies and scan behavior small. Unsupported formats still have Open.
- **Purpose-folder index stored as local JSON** instead of a database or virtual file system — the folders are real paths in File Explorer; JSON only remembers how to find them in the app.
- **Single-user, single-Windows profile** instead of accounts or WSL support — matches the demo boundary and avoids sync/permission complexity.
- **Recycle Bin for confirmed deletion** instead of permanent deletion — the file leaves its original location but can be recovered through Windows.

## Decisions and Open Issues
- **Learner choice:** Build a standalone Windows app, not a browser website; use Electron with plain HTML/CSS/JavaScript. Tradeoff: desktop setup is required, but the app can work with real Windows files.
- **Learner choice:** Develop/edit in WSL but run and test the app in Windows. The workspace path and Windows Node.js access must be verified in the first build step.
- **Learner choice:** Use the six standard folders as initial scan roots and leave adding arbitrary roots for later.
- **Learner choice:** Purpose-based folders are real folders nested under whichever standard parent is useful; the purpose page indexes them across locations. Paul names folders, and the app may suggest names and locations.
- **Learner choice:** Use local file properties and supported text/PDF contents for suggestions; no AI model or content upload in the proof of concept.
- **Learner choice:** Treat identical content hashes as duplicates and files modified more than one year ago as old. Show “possibly unused” only when Windows provides a reliable last-opened date older than one year; otherwise make no usage claim.
- **Derived implementation detail:** Keep raw file access in Electron's main process and expose only specific actions through the preload bridge. Tradeoff: a small IPC boundary to learn, in exchange for safer separation from the visible screen.
- **Useful uncertainty clarified:** A local Electron window can be a standalone app rather than a browser site, and only its main process handles the real file operations; the renderer gets a narrow set of allowed actions. Use the actual first scan and Windows testing to learn what local text/PDF extraction and suggestion rules can identify correctly.
- **Resolved in `prd.md > Requirements Clarified in 4-spec`:** “Old” uses a one-year last-modified threshold; “possibly unused” requires a reliable last-opened date older than one year. Otherwise, show no usage claim.
- **Resolved in `prd.md > Requirements Clarified in 4-spec`:** Preview images, plain text, and PDF in the first version; other formats use the unavailable message and Open fallback. Confirm PDF.js and Electron compatibility early.
- **Open question:** Verify Electron/npm can be run reliably from the Windows-accessible WSL workspace; if not, use a Windows-side working copy.

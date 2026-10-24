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

The first version uses clear local rules, not an AI model or an internet service. It can use names, file types, sizes, dates, and locally extracted text from supported text and PDF files to suggest a folder. Paul reviews one file per move card. A purpose-based folder is a real folder under a useful general folder—such as Research under Documents or Qatar Images under Pictures—and the purpose page is an index to these folders wherever they live. Paul can name a folder; the app can suggest a name and a standard parent location.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Paul starts the app in Windows. The Electron main part locates the six standard personal folders and starts a scan.
2. The scanner lists files under those folders, ignoring system/application locations and paths that lead outside the allowed roots. It gathers file properties and extracts text locally from supported files. Nothing is uploaded.
3. The suggestion builder first identifies files already inside meaningful project/topic folders, then compares remaining files with known folder names and simple keyword/type rules. It prepares individual organization suggestions, an “Already organized” summary, and cautious deletion candidates. The scan does not change any file.
4. The screen shows the purpose-folder index, or the general-folder cards when no purpose folders are registered. Search and browse show files from the current scan.
5. For each move card, Paul sees one file's source path, proposed destination, and review-only preview. The main part resolves a destination-name collision with the first available numbered suffix and shows that exact path before approval. Only clicking Approve moves the file; the main part rechecks paths and collision state, creates the real destination folder if needed, and never overwrites. The screen refreshes, and the move is visible in Windows File Explorer. Skip for now dismisses that suggestion for the current review.
6. For a deletion candidate, Paul sees its reason tag and path. After confirming Delete, the main part sends the file to the Recycle Bin; Keep leaves it in place. A file is never deleted automatically.
7. Move-review previews show a bounded thumbnail for PNG/JPG/GIF/WebP, up to the first 50 KB of TXT/MD/JSON/CSV/JS as plain text, or “Preview unavailable” with file metadata for other types. Preview errors are visible. Open asks Windows to use its usual application. Rescan repeats steps 2–3 and refreshes the suggestions and summaries.

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
- Use a soft yellow page background and rounded cream folder cards. Add large faded gray paper/folder SVGs and smaller gray document, star, image, music, and video SVGs behind content; keep the decoration `aria-hidden`, non-interactive, and low-opacity. The medium-blue header uses white heading/eyebrow text and a deeper-blue underline; white text must meet WCAG AA normal-text contrast. The Rescan button uses sunny yellow, readable medium-blue text, and a darker-yellow bottom edge with clear hover and focus states. Use Fredoka for headings/buttons and Nunito for body text, with `system-ui, sans-serif` fallbacks. Reserve red for deletion actions and warnings.
- Keep copy short, descriptive, kind, and non-blaming. Use simple transitions only; no complex animation.
- Make source and destination paths visually distinct and readable. Ensure the app remains usable with keyboard focus and visible focus indicators.
- Implement with plain CSS; the palette and Duolingo-like friendliness do not require a component framework.

## Components

### Electron Main Process
Creates the app window, identifies the standard Windows personal-folder paths, coordinates scanning and file operations, and handles OS actions such as opening files or moving them to Recycle Bin. It validates every requested path against the allowed roots before reading or changing a file.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Preload Bridge
Exposes a small, explicit set of actions to the screen—start/rescan, list folders/files, search, preview one file, approve/skip one move, open, and confirm a deletion. Use Electron `contextBridge`/IPC with `contextIsolation: true`, `nodeIntegration: false`, and sandboxing where compatible. Do not expose raw `fs`, arbitrary path operations, or unrestricted shell commands to the screen.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Renderer Interface
Displays purpose-folder cards, general-folder cards, navigable folder contents, search results, grid/list controls, local file previews, scan progress, move suggestions, paged 5/10/50-card review grids, deletion previews, confirmation dialogs, and friendly empty/error messages. It contains no direct file-system access.
PRD ref: `prd.md > Screens and Layout`, `Look and Feel`, and `States and Boundaries`.

### Standard-Folder Scanner
Finds Documents, Downloads, Desktop, Pictures, Music, and Videos for the current Windows user. Walks their subfolders without following directory links/reparse points outside the allowed roots. Skips inaccessible entries with a visible path/error summary; does not silently count them as scanned. Directory listings provide each entry's modified time; the renderer formats available dates as “Oct 12, 2026” and displays “Unknown” if a date is absent or invalid. For the Windows-extras page, classify common installer/executable files (including `.exe`, `.msi`, and `.msix`) only when they are found inside these personal roots.
PRD ref: `prd.md > Scanning and organization suggestions` and `Access problems`.

### Local File Analyzer and Suggestion Builder
Collects file name, extension/type, byte size, modified date, and other useful basic properties. Extracts local text from supported plain-text files and PDFs with PDF.js; text extraction is limited to 512 KB for text files and 6 MB/four pages for PDFs. Do not create a separate failed-text-extraction list or warning heading on the home or general-folders screen; that list is out of scope. An extraction failure alone does not make a file a safety skip: continue with safe metadata when possible. Put only files that cannot be safely inspected or handled, such as unreadable or locked files, in the collapsed skipped-files disclosure with a reason. Reads no file contents over a network. Image files use names and file properties only for suggestions—no OCR in this version.

Only analyze and suggest eligible loose files whose parent is directly one of the six standard folders. Files below that level are already organized: do not extract their contents or suggest moving them; summarize each non-empty top-level subfolder and its total file count under “Already organized.” If a standard folder itself contains project markers such as `.git`, `package.json`, an `.ino` sketch, a `.sln` file, or both a `.py` file and `requirements.txt`, protect its direct files too and summarize the standard folder as already organized.

For remaining files, use simple, explainable keyword and file-type rules that relate names, supported local text, and file properties to purpose-folder names and the six standard parent folders. Create one suggestion per file and show it as an individual card; do not group by destination.

### Safe Single-File Preview
The renderer requests a preview for one file's individual move card. The main process revalidates its path under the approved roots. Return a bounded thumbnail for PNG/JPG/GIF/WebP, or at most the first 50 KB of TXT/MD/JSON/CSV/JS as plain text. Other files, including PDF, show “Preview unavailable” with file name, byte size, type, current path, and destination. Never interpret text as HTML or send original image bytes to the renderer; return only the bounded thumbnail. If reading or decoding fails, return a visible error with file metadata. Preview has no move action; only the card's Approve action can move a file.

For deletion tags, **duplicate** means matching SHA-256 content hashes, not merely matching names. **Old** means last modified more than one year ago; use a last-opened date only if Windows supplies a trustworthy value, otherwise do not infer it. The current scanner has no reliable last-opened date, so it emits only duplicate and old tags. **Possibly unused** remains a cautious rule-based hint, never proof that a file is safe to remove. Rules are local and transparent; they do not provide AI-level understanding.
PRD ref: `prd.md > Scanning and organization suggestions` and `Deletion review`.

The deletion-review grid uses the same bounded local preview for each candidate. Preview remains informational; Keep and confirmed Delete are separate actions. Both move suggestions and deletion candidates are paged with 5, 10, or 50 cards per page.

### Purpose-Folder Index
Stores the user's names and the real absolute paths of purpose folders, which may be nested under different general folders. The index is a navigation aid, not a virtual folder: files stay at the corresponding real paths. Paul can register an existing folder anywhere under one of the six roots with a native folder picker. Purpose-folder cards open their indexed paths, then allow normal browsing into child folders. Accepting a suggested move can create a missing purpose folder on disk only after confirmation.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, and `Product Decisions`.

### File Operation Handler
Revalidates one approved file against the allowed roots, creates the selected real folder when needed, and moves the file without overwriting. If the intended name exists, add the first available number before the extension (for example, `report (2).pdf`) and show the exact destination in the preview. Use an exclusive destination create to prevent a race from overwriting a file. If a collision appears after preview, refresh the proposed name and require approval for that changed destination. A confirmed delete uses Electron's Recycle Bin operation (`shell.trashItem`) rather than permanent unlinking. If an operation fails, preserve the source, report the exact failure clearly, and do not show success.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `States and Boundaries`.

### Search, Preview, and Open
Searches the current scan's file names and paths case-insensitively, returning at most 100 matching records at a time. Grid/list controls apply to folder contents and search results. Preview returns only a bounded thumbnail for PNG/JPG/GIF/WebP, the first 50 KB of plain text for TXT/MD/JSON/CSV/JS, or up to the first 50 KB of extracted text from the first four pages of a PDF no larger than 6 MB. PDF.js performs extraction locally; PDFs without selectable text or over the extraction limit show Preview unavailable. Unsupported or unreadable formats show a clear unavailable message with an Open action. Open uses Electron's `shell.openPath` after revalidating the selected file beneath an approved root, so Windows launches the normal associated program. Render all text as text, never HTML; no previewed file contents leave the computer.
PRD ref: `prd.md > Browsing and searching`.

### Local Preferences
Stores the purpose-folder index locally. Grid/list choice lasts for the current app session; the app opens on the purpose-folder page when indexed folders are available and otherwise starts at the general folders. Scan results and suggestions are temporary in-memory data and are replaced by Rescan; personal file contents are not saved as an index on disk.
PRD ref: `prd.md > States and Boundaries` and `Product Decisions`.

## Data Model
- **Allowed roots:** Derived from Windows known-folder paths for the current user. These are the six scan roots. Every discovered file path must remain within one of these roots after normalization; do not follow links/reparse points outside them.
- **File record (memory during scan):** `path`, `name`, `extension`, `sizeBytes`, `modifiedAt`, optional reliable `accessedAt`, and optional extracted text used only for the current scan/preview.
- **Move suggestion (memory):** one file's source root/path and metadata, proposed destination folder/path, reason, and review status. Each file is approved or skipped independently.
- **Already organized summary (memory):** names, paths, and file counts for non-empty top-level subfolders, plus any standard root protected by project markers. These are not move suggestions or skipped files.
- **Search result (memory):** bounded file metadata and a relative path for safe browse/preview/open actions. Search does not index or return file contents.
- **Skipped file (memory):** file name, source path, and reason it cannot be safely handled (for example, unreadable or locked). Files with no matching destination rule and text-extraction failures that still allow safe metadata-based handling are not listed as skipped.
- **Preview result (memory):** safe type, file name, byte size, current path, proposed destination, and either a bounded thumbnail or at most 50 KB of plain-text content. No preview action changes the file.
- **Deletion suggestion (memory):** `filePath`, reason tags, hash only when needed for duplicate checking, and review status. Confirmed deletion sends the file to Recycle Bin.
- **Purpose-folder index (local JSON):** entries of `{ name, path, parentType }`. Update after the user creates or accepts a folder; validate paths at load and use. If a path no longer exists, show it as unavailable and let the user remove or repair the entry.
- **UI state (memory):** current grid/list choice, selected page, and chosen 5/10/50 card count for both review grids during the open session. No account or sync.
- **Persistence:** Save the purpose-folder index under Electron `app.getPath("userData")`. Keep scan records, extracted text, search results, and suggestion queues in memory only. Closing the app discards pending suggestions; a new launch rescans.

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
│   │   ├── main.js              # Create window; register IPC actions
│   │   ├── scanner.js           # Resolve roots and list safe file records
│   │   ├── analyzer.js          # Extract local text and build move suggestions
│   │   ├── deletion-review.js   # Find cautious candidates and handle review decisions
│   │   ├── destination-names.js # Collision-safe filenames
│   │   ├── file-operations.js   # Validate and perform confirmed moves
│   │   ├── file-search.js       # Search current scan metadata
│   │   ├── preview.js           # Safe bounded image/text/PDF previews
│   │   └── purpose-folder-store.js # Read/write purpose-folder index
│   ├── preload/
│   │   └── preload.js          # Narrow, validated screen-to-main API
│   └── renderer/
│       ├── index.html          # App window shell and page containers
│       ├── styles.css          # Friendly palette, cards, layouts, focus styles
│       ├── app.js              # Navigation, rendering, and safe view actions
│       └── date-utils.js       # Safe display formatting for modified dates
├── test/
│   ├── organization.test.js    # Analysis, previews, moves, and purpose folders
│   ├── deletion-review.test.js # Duplicate, age, keep, and confirmed-delete behavior
│   └── scanner.test.js         # Safe scanning, listing, and path checks
├── package.json
├── package-lock.json
└── README.md                   # Windows setup/run and safe demo instructions
```

## External Services and Dependencies
- **No external services.** No online AI, cloud storage, remote API, database, account, or deployment.
- **Electron** — desktop runtime and safe IPC. Docs: [Electron](https://www.electronjs.org/docs/latest/), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [security](https://www.electronjs.org/docs/latest/tutorial/security), [shell API](https://www.electronjs.org/docs/latest/api/shell).
- **PDF.js / `pdfjs-dist`** — extracts PDF text locally for scan suggestions and bounded text previews. Docs: [PDF.js](https://mozilla.github.io/pdf.js/).
- **Node.js built-ins** — file system/path/platform and cryptographic hash; docs: [fs](https://nodejs.org/api/fs.html), [path](https://nodejs.org/api/path.html), [os](https://nodejs.org/api/os.html), [crypto](https://nodejs.org/api/crypto.html).
- No keys, network calls, service costs, or quotas.

## Important Failure Modes
- **A personal folder is inaccessible or missing** → identify it and show a copyable path; continue with accessible roots and clearly report partial scan results.
- **A file changes or disappears after scan, or a move/trash operation is refused** → recheck immediately before acting; preserve the original, show a clear error, and refresh the affected view only after success.
- **A move-review preview is unsupported, corrupt, or unreadable** → show Preview unavailable with file name, size, type, current path, and destination; show a visible error if reading/decoding fails. Offer Open only in the general browsing experience. A text-extraction failure does not create a separate warning list; use safe metadata where possible. A file that cannot be safely handled is listed only in the skipped-files disclosure. Never claim unreadable means useless.
- **A destination name already exists** → propose the first available numbered suffix and show it before approval; never overwrite. If the candidate changes before the move, refresh the preview and require approval for the new path.
- **A path points outside the six allowed roots** → reject the operation and report that the location is outside the scan boundary.
- **A browse, preview, or open target changes or becomes unavailable** → revalidate it beneath its approved root, show the failure, and keep the rest of the scan usable.

## What Was Simplified and Why
- **Rule-based local suggestions** instead of an AI model — avoids accounts, keys, cost, and uploading sensitive student documents; suggestions are less context-aware and always require review.
- **Six known personal folders** instead of crawling an entire drive — avoids system/application files and keeps the scan bounded; additional personal roots can be added later.
- **Text and PDF content extraction; image metadata only** instead of understanding every file format — keeps dependencies and scan behavior small. Unsupported formats still have Open.
- **No separate failed-text-extraction list** — this list is out of scope. Only files the app cannot safely handle appear in the skipped-files disclosure; files with safe metadata may still receive suggestions.
- **Purpose-folder index stored as local JSON** instead of a database or virtual file system — the folders are real paths in File Explorer; JSON only remembers how to find them in the app.
- **Single-user, single-Windows profile** instead of accounts or WSL support — matches the demo boundary and avoids sync/permission complexity.
- **Recycle Bin for confirmed deletion** instead of permanent deletion — the file leaves its original location but can be recovered through Windows.

## Decisions and Open Issues
- **Learner-approved revision:** Replace destination-group suggestions with individual per-file move cards; protect meaningful project/topic folders and summarize them as “Already organized”; reserve the skipped-files disclosure for files the app cannot safely handle; remove the separate failed-extraction list as out of scope; preview the specified images/text with visible errors; show collision suffixes before approval and never overwrite.
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

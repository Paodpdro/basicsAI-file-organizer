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

The first version uses clear local rules, not an AI model or an internet service. The inventory phase reads names, paths, sizes, and dates only. After that inventory, duplicate checking hashes raw bytes only for files with exactly matching sizes; it does not parse file contents. Paul reviews one file per move card. A purpose-based folder is a real folder under a useful general folder—such as Research under Documents or Qatar Images under Pictures—and the purpose page is an index to these folders wherever they live. Paul can name a folder; the app can suggest a name and a standard parent location.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Paul starts the app in Windows. The Electron main part locates the six standard personal folders and starts a scan.
2. The scanner inventories files under those folders, ignoring system/application locations and paths that lead outside the allowed roots. It reads only metadata (name, path, size, and modified date) and runs `stat` calls with a concurrency limit of about 16. It skips known cache folders such as `node_modules`, `.git`, `.cache`, and `.npm` by default. Skipped folders remain reported with paths/reasons and their files count toward standard-folder totals, but the app does not retain individual metadata for those descendants. The screen shows the count scanned so far, and the main process records elapsed time per standard folder.
3. After inventory completes, duplicate review checks only groups with identical byte sizes, compares SHA-256 hashes, and reuses cached hashes when path, size, and modified date are unchanged. This phase reads raw bytes for same-size candidates but never parses them. The suggestion builder protects meaningful project/topic folders and applies name-, extension-, size-, and date-based rules. Content-derived TXT/MD/CSV/LOG/PDF suggestions are removed; unmatched files that may have relied on content are marked “Needs preview” with a reason. The scan prepares individual move suggestions, an “Already organized” summary, skipped-folder/file reasons, and deletion candidates. It changes no files.
4. The screen shows the purpose-folder index, or the general-folder cards when no purpose folders are registered. Search and browse show files from the current scan.
5. For each move card, Paul sees one file's source path, proposed destination, and review-only preview. The main part resolves a destination-name collision with the first available numbered suffix and shows that exact path before approval. Only clicking Approve moves the file; the main part rechecks paths and collision state, creates the real destination folder if needed, and never overwrites. The screen refreshes, and the move is visible in Windows File Explorer. Skip for now dismisses that suggestion for the current review.
6. For a deletion candidate, Paul sees its reason tag and path. After confirming Delete, the main part sends the file to the Recycle Bin; Keep leaves it in place. A file is never deleted automatically.
7. Move-review and browsing previews are loaded only after Paul clicks Preview for a file. They show a bounded thumbnail for PNG/JPG/GIF/WebP, up to the first 50 KB of supported text as plain text, or “Preview unavailable” with file metadata for other types. Preview errors are visible. Open asks Windows to use its usual application. Rescan repeats the inventory and analysis, reports progress, refreshes the suggestions and summaries, and logs elapsed time for each standard folder.

## Stack
- **Electron, not Express** — this project is a standalone Windows desktop app. Electron opens its own window and provides the main/preload/renderer separation needed to safely expose approved local-file operations. Express would serve a website over HTTP in a browser, which is not how this app runs and would add a server layer the POC does not need. Documentation: [Electron documentation](https://www.electronjs.org/docs/latest/), [process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [security](https://www.electronjs.org/docs/latest/tutorial/security).
- **JavaScript, HTML, and CSS** — plain browser technologies for the window, chosen to build on Paul's existing experience rather than add a UI framework.
- **Node.js built-in `fs`, `path`, `os`, and `crypto` modules** — locate allowed folders, inspect file metadata, create folders, move files, and hash same-size duplicate candidates. Documentation: [File system](https://nodejs.org/api/fs.html), [Path](https://nodejs.org/api/path.html), [OS](https://nodejs.org/api/os.html), [Crypto](https://nodejs.org/api/crypto.html).
- **PDF.js (`pdfjs-dist`)** — locally extracts PDF text only when the user explicitly requests a supported preview; it is not used during scans. The app resolves CMaps and standard fonts from the installed package's bundled `cmaps/` and `standard_fonts/` folders; it does not download these assets. PDF.js warning-level diagnostics are suppressed to avoid non-fatal font/CMap noise, while errors remain reportable. Documentation: [PDF.js project and examples](https://mozilla.github.io/pdf.js/).
- **Node.js built-in test runner** — focused tests for rules and safe file operations without adding a test framework. Documentation: [Node.js test runner](https://nodejs.org/api/test.html).
- **npm** — install and run project dependencies. No Express, Mustache, database, AI model, login, API key, or external service.

Use the current supported Node.js LTS and compatible stable Electron/PDF.js releases; pin the selected versions in `package.json` and `package-lock.json` during setup. Verify compatibility in the build rather than guessing versions in this planning document.

## Where It Runs and How Someone Tries It
- **Runtime:** Windows desktop app, launched in its own Electron window via `npm start`; there is no Express server or browser URL. Development files may be edited in WSL, but install, run, and verify the app using the Windows Node.js/npm environment so real Windows folders and File Explorer behavior are tested.
- **Prerequisite:** Supported Node.js LTS installed on Windows.
- **First run:** Open the project directory from Windows PowerShell, run `npm install`, then run `npm start`. This opens the desktop app; no browser address, hosted server, or API key is needed.
- **Project location and run copy:** The source repository for this app is `~/basicsAI`; the active workspace and Git root were verified to resolve to that project. Windows cannot run `npm start` while its working directory is the WSL UNC path (`\\wsl.localhost\...`), because the npm command shell rejects UNC working directories. Keep a Windows-side copy synchronized from `~/basicsAI` and run Electron there; verify it contains the same source changes before testing. This does not make the app an Express/browser app—the runtime remains Electron.
- **Demo:** Start the app with `npm start`, scan a small set of test files in the six standard folders, review a proposed move, confirm it, and show the new real folder/file in File Explorer. Also demonstrate a deletion candidate being sent to Recycle Bin only after confirmation, a Preview, and the clean empty state where practical.
- **Submission:** A short demo video and public GitHub repository are required. Deployment is optional and not part of this local-only app.

## Look and Feel
- Use a spacious, approachable interface with clear cards, readable labels, and large, easy-to-find actions.
- Use a soft yellow page background and rounded cream folder cards. Add large faded gray paper/folder SVGs and smaller gray document, star, image, music, and video SVGs behind content; keep the decoration `aria-hidden`, non-interactive, and low-opacity. The medium-blue header uses white heading/eyebrow text and a deeper-blue underline; white text must meet WCAG AA normal-text contrast. The Rescan button uses sunny yellow, readable medium-blue text, and a darker-yellow bottom edge with clear hover and focus states. Use Fredoka for headings/buttons and Nunito for body text, with `system-ui, sans-serif` fallbacks. Reserve red for deletion actions and warnings.
- Keep copy short, descriptive, kind, and non-blaming. Use simple transitions only; no complex animation.
- Make source and destination paths visually distinct and readable. Ensure the app remains usable with keyboard focus and visible focus indicators.
- Keep move-card location information compact: show a short source-to-destination summary first, with the full source and destination paths available in a disclosure.
- Keep a visible, non-modal status message while scans or file actions are processing, followed by a clear completion or error message.
- Implement with plain CSS; the palette and Duolingo-like friendliness do not require a component framework.

## Components

### Electron Main Process
Creates the app window, identifies the standard Windows personal-folder paths, coordinates scanning and file operations, and handles OS actions such as opening files or moving them to Recycle Bin. It validates every requested path against the allowed roots before reading or changing a file.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Preload Bridge
Exposes a small, explicit set of actions to the screen—start/rescan, receive scan-progress updates, list folders/files, search, preview one file, approve/skip one move, open, and confirm a deletion. Use Electron `contextBridge`/IPC with `contextIsolation: true`, `nodeIntegration: false`, and sandboxing where compatible. Do not expose raw `fs`, arbitrary path operations, or unrestricted shell commands to the screen.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, `Deletion review`, and `Access problems`.

### Renderer Interface
Displays purpose-folder cards, general-folder cards, navigable folder contents, search results, grid/list controls, local file previews, scan progress, move suggestions, paged 5/10/50-card review grids, deletion previews, confirmation dialogs, and friendly empty/error messages. It contains no direct file-system access.
PRD ref: `prd.md > Screens and Layout`, `Look and Feel`, and `States and Boundaries`.

### Standard-Folder Scanner
Finds Documents, Downloads, Desktop, Pictures, Music, and Videos for the current Windows user. Walks their subfolders without following links/reparse points outside allowed roots. The metadata inventory uses a bounded worker pool (about 16 concurrent `stat` operations) and reads each eligible file's name, path, size, and modified date only. It skips metadata collection and analysis inside known caches (including `node_modules`, `.git`, `.cache`, `.npm`, and `.pnpm-store`) by default. It reports each excluded folder and reason, and performs only lightweight directory-entry counting inside excluded trees to preserve folder totals—without `stat` calls or retaining per-file metadata. Direct project-marker names such as `.git` remain available so the analyzer can continue protecting project roots. The scanner reports the number of files inventoried so far and logs elapsed time for each standard root. Inaccessible roots/entries remain visible with their path and error. The renderer formats dates as “Oct 12, 2026” or “Unknown.”
PRD ref: `prd.md > Scanning and organization suggestions` and `Access problems`.

### Local File Analyzer and Suggestion Builder
Consumes metadata records and direct project-marker names only; the inventory stage never opens or parses file contents. Analyze eligible loose files whose parent is directly one of the six standard folders. Files below that level are already organized: summarize each non-empty top-level subfolder and its total file count without analyzing file content. If a standard folder contains project markers such as `.git`, `package.json`, an `.ino` sketch, a `.sln` file, or both a `.py` file and `requirements.txt`, protect its direct files too, even when a marker directory's contents are excluded from inventory.

Apply explainable rules from names, extensions, sizes, and modified dates to suggest useful parent folders and purpose folders. Preserve one suggestion per file, existing “Already organized” decisions, and approval/collision protections. Remove content-derived matches for TXT, MD, CSV, LOG, and PDF. If an eligible loose file has no metadata-based match and could have depended on content, show “Needs preview” with a reason; actual preview bytes are fetched only on an explicit click. Keep unsafe-to-handle files distinct from files that simply need preview.
PRD ref: `prd.md > Scanning and organization suggestions`.

### Duplicate Checker and Hash Cache
Runs after metadata inventory. Group file records by exact byte size and hash only groups containing two or more files. Read each candidate as a byte stream and compare SHA-256 digests; equal names or sizes alone are not duplicate evidence. Store/reuse digests in a local JSON cache under Electron `app.getPath("userData")`, keyed by canonical path, size, and modified timestamp; invalidate a cached digest when any key component changes. Store no file contents. Cache entries persist locally until invalidated or the cache is cleared.
PRD ref: `prd.md > Deletion review`.

### Safe Single-File Preview
The renderer requests a preview only after a user click. For move suggestions, the main process revalidates the file path under the approved roots and returns a bounded thumbnail for PNG/JPG/GIF/WebP, or at most the first 50 KB of TXT/MD/JSON/CSV/JS as plain text. Other move-preview types, including PDF, show “Preview unavailable” with file name, size, type, current path, and destination. For browsing/deletion previews, PDF text may be extracted locally after the explicit Preview action. Never interpret text as HTML or send original image bytes to the renderer; return only a bounded thumbnail. Preview errors remain visible. Preview has no move/delete action; only Approve or confirmed Delete changes a file.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, and `Deletion review`.

### Deletion Rules
“Old” means modified more than one year ago. An exact duplicate must have the same byte size and SHA-256 hash as another file; same name or size alone is not evidence. The app does not have a reliable last-opened date, so it does not show “possibly unused.” Keep and confirmed Delete are separate actions; confirmed deletion uses the Windows Recycle Bin.
PRD ref: `prd.md > Deletion review`.

The deletion-review grid uses the same bounded local preview for each candidate. Preview remains informational; Keep and confirmed Delete are separate actions. Both move suggestions and deletion candidates are paged with 5, 10, or 50 cards per page.

### Purpose-Folder Index
Stores the user's names and the real absolute paths of purpose folders, which may be nested under different general folders. The index is a navigation aid, not a virtual folder: files stay at the corresponding real paths. Paul can register an existing folder anywhere under one of the six roots with a native folder picker. Purpose-folder cards open their indexed paths, then allow normal browsing into child folders. Accepting a suggested move can create a missing purpose folder on disk only after confirmation.
PRD ref: `prd.md > Browsing and searching`, `Scanning and organization suggestions`, and `Product Decisions`.

### File Operation Handler
Revalidates one approved file against the allowed roots, creates the selected real folder when needed, and moves the file without overwriting. If the intended name exists, add the first available number before the extension (for example, `report (2).pdf`) and show the exact destination in the preview. Use an exclusive destination create to prevent a race from overwriting a file. If a collision appears after preview, refresh the proposed name and require approval for that changed destination. A confirmed delete uses Electron's Recycle Bin operation (`shell.trashItem`) rather than permanent unlinking. If an operation fails, preserve the source, report the exact failure clearly, and do not show success.
PRD ref: `prd.md > Scanning and organization suggestions`, `Deletion review`, and `States and Boundaries`.

### Search, Preview, and Open
Searches the current scan's file names and paths case-insensitively, returning at most 100 matching records at a time. Grid/list controls apply to folder contents and search results. Preview returns only a bounded thumbnail for PNG/JPG/GIF/WebP, the first 50 KB of plain text for TXT/MD/JSON/CSV/JS, or up to the first 50 KB of extracted text from the first four pages of a PDF no larger than 6 MB. PDF.js performs extraction locally and only after Preview is clicked; unsupported or unreadable formats show a clear unavailable message with an Open action where available. Open uses Electron's `shell.openPath` after revalidating the selected file beneath an approved root. Render all text as text, never HTML; no previewed file contents leave the computer.
PRD ref: `prd.md > Browsing and searching`.

### Local Preferences
Stores the purpose-folder index locally. Grid/list choice lasts for the current app session; the app opens on the purpose-folder page when indexed folders are available and otherwise starts at the general folders. Scan results and suggestions are temporary in-memory data and are replaced by Rescan. The planned duplicate cache stores only SHA-256 digests and file metadata, never file contents.
PRD ref: `prd.md > States and Boundaries` and `Product Decisions`.

## Data Model
- **Allowed roots:** Derived from Windows known-folder paths for the current user. These are the six scan roots. Every discovered file path must remain within one of these roots after normalization; do not follow links/reparse points outside them.
- **File record (memory during scan):** `path`, `name`, `extension`, `sizeBytes`, and `modifiedAt`. No file contents or extracted text are part of a scan record.
- **Move suggestion (memory):** one file's source root/path and metadata, proposed destination folder/path, reason, and review status. Each file is approved or skipped independently.
- **Already organized summary (memory):** names, paths, and file counts for non-empty top-level subfolders, plus any standard root protected by project markers. These are not move suggestions or skipped files.
- **Search result (memory):** bounded file metadata and a relative path for safe browse/preview/open actions. Search does not index or return file contents.
- **Needs-preview item (memory):** file name, source path, metadata, and reason its destination cannot be inferred from metadata rules; content is loaded only after an explicit Preview click.
- **Skipped folder (memory):** folder name, source path, and reason it was excluded from recursion (for example, a known cache folder). It remains separately reported and included in folder-total accounting.
- **Skipped file (memory):** file name, source path, and reason it cannot be safely handled (for example, unreadable or locked).
- **Scan progress (transient):** current folder and count of file records scanned so far. Per-folder elapsed times are logged by the main process after each root scan.
- **Hash-cache entry (local):** canonical file path, exact byte size, modified timestamp, and SHA-256 digest. Store no file contents; invalidate when any metadata key changes.
- **Preview result (memory):** safe type, file name, byte size, current path, proposed destination, and either a bounded thumbnail or at most 50 KB of plain-text content. No preview action changes the file.
- **Deletion suggestion (memory):** `filePath`, reason tags (old or exact duplicate), and review status. Duplicate tags require equal byte size and equal SHA-256 hashes. Confirmed deletion sends the file to Recycle Bin.
- **Duplicate hash cache (local):** Cache entries hold canonical path, byte size, modified date, and SHA-256 digest only. Reuse the digest only when all metadata still matches; stale entries are invalidated. No file contents are stored.
- **Purpose-folder index (local JSON):** entries of `{ name, path, parentType }`. Update after the user creates or accepts a folder; validate paths at load and use. If a path no longer exists, show it as unavailable and let the user remove or repair the entry.
- **UI state (memory):** current grid/list choice, selected page, and chosen 5/10/50 card count for both review grids during the open session. No account or sync.
- **Persistence:** Save the purpose-folder index under Electron `app.getPath("userData")`. Keep scan records, preview data, search results, and suggestion queues in memory only. A local hash-cache file under `app.getPath("userData")` is proposed so unchanged same-size files do not need to be rehashed after restart; closing the app discards pending suggestions.

## File Structure
This is the target structure for the revised plan, not a claim that every file already exists. The README is a planned addition; Slice 5 updates the scanner, analyzer, main process, preload, and renderer for metadata-first progress and adds the duplicate hash cache.

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
│   │   ├── analyzer.js          # Build metadata-based move suggestions
│   │   ├── duplicate-hash-cache.js # Cache SHA-256 hashes for unchanged files
│   │   ├── deletion-review.js   # Find candidates and handle review decisions
│   │   ├── destination-names.js # Collision-safe filenames
│   │   ├── file-operations.js   # Validate and perform confirmed moves
│   │   ├── file-search.js       # Search current scan metadata
│   │   ├── preview.js           # Safe bounded image/text/PDF previews
│   │   └── purpose-folder-store.js # Read/write purpose-folder index
│   ├── preload/
│   │   └── preload.js           # Narrow, validated screen-to-main API
│   └── renderer/
│       ├── index.html          # App window shell and page containers
│       ├── styles.css          # Friendly palette, cards, layouts, focus styles
│       ├── app.js              # Navigation, rendering, and safe view actions
│       └── date-utils.js       # Safe display formatting for modified dates
├── test/
│   ├── organization.test.js    # Analysis, previews, moves, and purpose folders
│   ├── deletion-review.test.js # Duplicate, age, keep, and confirmed-delete behavior
│   ├── duplicate-hash-cache.test.js # Digest persistence and metadata invalidation
│   └── scanner.test.js         # Safe scanning, listing, and path checks
├── package.json
├── package-lock.json
└── README.md                   # Windows setup/run and safe demo instructions
```

## External Services and Dependencies
- **No external services.** No online AI, cloud storage, remote API, database, account, or deployment.
- **Electron** — desktop runtime and safe IPC. Docs: [Electron](https://www.electronjs.org/docs/latest/), [IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [security](https://www.electronjs.org/docs/latest/tutorial/security), [shell API](https://www.electronjs.org/docs/latest/api/shell).
- **PDF.js / `pdfjs-dist`** — extracts PDF text locally only for an explicitly requested bounded preview, never for scanning or suggestion generation. Docs: [PDF.js](https://mozilla.github.io/pdf.js/).
- **Node.js built-ins** — file system/path/platform and cryptographic hash; docs: [fs](https://nodejs.org/api/fs.html), [path](https://nodejs.org/api/path.html), [os](https://nodejs.org/api/os.html), [crypto](https://nodejs.org/api/crypto.html).
- No keys, network calls, service costs, or quotas.

## Important Failure Modes
- **A personal folder is inaccessible or missing** → identify it and show a copyable path; continue with accessible roots and clearly report partial scan results.
- **A known cache folder is skipped** → report its path and exclusion reason separately, retain it in folder-total accounting, and continue scanning other folders.
- **A scan takes time** → show the current file count and folder in progress; record elapsed time for each standard folder in the main-process log.
- **A metadata read fails or a file changes during scanning** → report the affected file as skipped with its reason and continue where safe.
- **A duplicate hash cache entry no longer matches metadata** → discard that entry and hash the file again only if it belongs to a group with an exact same-size candidate.
- **A user expects an exact-duplicate warning** → explain that equal byte size is only a prefilter; only equal hashes produce duplicate candidates.
- **A file changes or disappears after scan, or a move/trash operation is refused** → recheck immediately before acting; preserve the original, show a clear error, and refresh the affected view only after success.
- **A move-review preview is unsupported, corrupt, or unreadable** → show Preview unavailable with file name, size, type, current path, and destination; show a visible error if reading/decoding fails. Offer Open only in the general browsing experience. A text-extraction failure does not create a separate warning list; use safe metadata where possible. A file that cannot be safely handled is listed only in the skipped-files disclosure. Never claim unreadable means useless.
- **A destination name already exists** → propose the first available numbered suffix and show it before approval; never overwrite. If the candidate changes before the move, refresh the preview and require approval for the new path.
- **A path points outside the six allowed roots** → reject the operation and report that the location is outside the scan boundary.
- **A browse, preview, or open target changes or becomes unavailable** → revalidate it beneath its approved root, show the failure, and keep the rest of the scan usable.
- **PDF.js cannot find a CMap or standard font, or encounters a non-fatal font warning** → use the package's local bundled asset folders and suppress warning-level diagnostic noise; keep errors visible through the existing preview/suggestion error paths.

## What Was Simplified and Why
- **Rule-based local suggestions** instead of an AI model — avoids accounts, keys, cost, and uploading sensitive student documents; suggestions are less context-aware and always require review.
- **Six known personal folders** instead of crawling an entire drive — avoids system/application files and keeps the scan bounded; additional personal roots can be added later.
- **Metadata-first inventory and explicit previews** instead of parsing text/PDF during every scan — improves large-folder responsiveness. A separate same-size duplicate pass reads bytes only for hashing; it does not parse contents. Content-derived text/PDF suggestions are traded for metadata-based suggestions; unmatched items that may need content inspection are labeled “Needs preview.”
- **Known cache-folder exclusions** such as `node_modules` and `.git` — avoid spending scan work inside generated or version-control data; report each excluded folder and reason rather than hiding it.
- **Exact-size duplicate prefilter** before hashing — avoids reading files that cannot be byte-for-byte duplicates because their sizes differ.
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
- **Requested performance revision (document draft; implementation not started):** Use metadata-only inventory with about 16 concurrent `stat` calls; skip known cache folders while reporting their paths/reasons and preserving folder totals; retain existing “Already organized,” metadata-based suggestions, and move approval protections; remove content-derived TXT/MD/CSV/LOG/PDF suggestions and label unmatched files “Needs preview”; load previews only on click; show scanned-file progress and log per-folder duration. Duplicate detection remains a separate exact-size-then-SHA-256 pass with a local metadata-keyed cache.
- **Learner choice:** Exact duplicates require matching byte size and SHA-256; cache hashes while canonical path, size, and modified timestamp remain unchanged. The cache stores metadata and digests only, not contents. Files modified more than one year ago may be labeled old; do not show “possibly unused” because the app lacks a reliable last-opened date.
- **Derived implementation detail:** Keep raw file access in Electron's main process and expose only specific actions through the preload bridge. Tradeoff: a small IPC boundary to learn, in exchange for safer separation from the visible screen.
- **Useful uncertainty clarified:** A local Electron window is a standalone desktop app, not an Express-served website; only its main process handles real file operations while the renderer gets a narrow set of allowed actions. The project being edited is `~/basicsAI`; verify that any Windows-side run copy contains the same source before testing.
- Windows extras page is outstanding POC work, not part of the current build; it is documented in prd.md and scope.md only and will be implemented separately after approval.
- **Resolved in `prd.md > Requirements Clarified in 4-spec`:** “Old” uses a one-year last-modified threshold; “possibly unused” requires a reliable last-opened date older than one year. Otherwise, show no usage claim.
- **Resolved in `prd.md > Requirements Clarified in 4-spec`:** Preview images, plain text, and PDF in the first version; other formats use the unavailable message and Open fallback. Confirm PDF.js and Electron compatibility early.
- **Open build check:** The WSL project path is not a valid working directory for Windows npm. Keep a Windows-side copy synchronized from `~/basicsAI` and confirm it matches the source before running tests or the app.

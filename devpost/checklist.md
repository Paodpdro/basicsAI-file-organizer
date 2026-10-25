---
doc: checklist
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Browse the six real Windows folders in the desktop app**
  Becomes usable: A running Electron app scans Documents, Downloads, Desktop, Pictures, Music, and Videos, shows them as square, rounded cards, and lets Paul open a folder to see its files and last-modified dates. Rescan refreshes the view, and inaccessible folders show a clear path/error.
  Why now: Bootstraps the app while proving the riskiest foundation early: Electron can run on Windows, safely identify the six real folders, and display actual files without changing anything.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `Screens and Layout`, `Browsing and searching`, and `Access problems`
  Spec ref: `spec.md > Stack`, `Where It Runs and How Someone Tries It`, `Electron Main Process`, `Preload Bridge`, `Renderer Interface`, `Standard-Folder Scanner`, `Data Model`, and `File Structure`
  Build: Scaffold Electron with main/preload/renderer separation, safe window settings and IPC; add the six-root scanner with path-boundary checks and clear access errors; show general-folder cards and real file listings with formatted modified dates; add rescan. Include project setup and dependencies in this slice.
  Verify (mechanical): On Windows, run `npm install`, `npm start`, and `node --test`. Verify the app opens; confirm each available root appears, opening a root shows its real files and dates, a missing date displays “Unknown,” a missing/inaccessible root reports its path, and a rescan updates the display. Run the relevant tests and confirm no errors.
  Learner check: Start the app in Windows, open Downloads and another available folder, and compare a few displayed names with File Explorer. Try Rescan and tell me whether the folder cards and file list feel clear.
  Commit: `Add safe Windows folder browsing`

- [x] **2. Review individual purpose-folder moves safely**
  Becomes usable: A scan suggests moves only for eligible loose files directly inside the six standard folders. Files already in subfolders—and direct files in a root containing project markers—are left alone and summarized as “Already organized.” Truly unsafe files appear in a collapsed skipped-files list, and each move card shows its file’s current path, proposed destination, and safe preview before Paul approves that move.
  Why now: Delivers the unique kernel early: purpose-based real folders under useful standard folders, not just a generic file browser. It also tests content extraction and real moves before adding optional features.
  PRD ref: `prd.md > The Core Journey` (step 5), `Screens and Layout`, `Scanning and organization suggestions`, and `Product Decisions`
  Spec ref: `spec.md > The Core Journey Through the System`, `Local File Analyzer and Suggestion Builder`, `Purpose-Folder Index`, `File Operation Handler`, `Local Preferences`, `Data Model`, and `What Was Simplified and Why`
  Build: Analyze only loose files directly inside the six standard folders and create explainable per-file suggestions; leave nested folder contents untouched and summarize each non-empty top-level subfolder as already organized; protect direct files in roots containing project markers; show only unsafe-to-handle files in the collapsed skipped-files disclosure; create the purpose-folder index; allow Paul to adjust each file’s folder name and parent; show a safe per-file preview and visible errors; suffix destination-name collisions without overwriting; approve or skip each file independently.
  Verify (mechanical): Run `node --test`; temporary fixtures verify only root-level loose files receive suggestions, nested folders (including “1.Bun” and “QU”) are summarized and never analyzed for suggestions, project-marked roots are protected, acronym-named PDF/text suggestions do not modify files, files appear as individual suggestions, only unreadable/unsafe files are skipped, no failed-extraction list is produced, per-file skip leaves the file untouched, approval moves one file while preserving contents, collisions use visible numbered suffixes and never overwrite, paths outside allowed roots are rejected, previews obey image/text/unavailable rules and show errors, and purpose folders are recorded in the local index. On Windows, confirm an accepted move and suffix appear in File Explorer.
  Learner check: Put disposable copies of a text/PDF file directly in a scanned folder and related files in existing subfolders such as “1.Bun” or “QU.” Confirm only the loose files receive move cards and each subfolder appears as “Already organized.” Preview and skip one loose file, confirming it remains in place; rescan and approve a different disposable file, then confirm its destination (including any suffix) and purpose folder in File Explorer.
  Commit: `Add reviewed purpose-based file moves`

- [x] **3. Browse, search, preview, and open files**
  Becomes usable: The purpose-based page indexes real folders wherever they live; folder contents can be searched and shown in grid or list view. Supported images, text, and PDFs can be previewed locally; other files offer Open through Windows.
  Why now: Builds on the stable scan and real-folder index, then completes the everyday browsing journey without adding a separate database or virtual file system.
  PRD ref: `prd.md > The Core Journey` (steps 2–4), `Screens and Layout`, `Browsing and searching`, and `States and Boundaries`
  Spec ref: `spec.md > Renderer Interface`, `Purpose-Folder Index`, `Search, Preview, and Open`, `Local Preferences`, `Data Model`, and `Look and Feel`
  Build: Add purpose-folder navigation and persistence, register existing folders from within the six roots, browse nested folders, search the current scan, switch grid/list layouts, preview local images/text/PDF text safely with an unavailable fallback, and Open through Windows file handling.
  Verify (mechanical): Run `node --test`; verify purpose-folder paths are validated, browsing and file opening reject paths outside approved roots, search filters names and paths with a 100-result cap, grid/list views render the same entries, supported image/text/PDF previews are bounded and local, unsupported types show the fallback, and Open reports errors rather than false success.
  Learner check: Register an existing purpose folder, open it and a subfolder, find a test file with search, switch layouts, preview a supported file, and use Open on a file whose type is unsupported for preview. Confirm an out-of-root folder cannot be registered.
  Commit: `Add file search and preview controls`

- [x] **4. Review cautious deletion candidates safely**
  Becomes usable: A scan shows deletion candidates in a paged grid with reasons, paths, and safe previews. Paul can show 5, 10, or 50 candidates per page. Exact-content duplicates and files modified more than one year ago are labeled; “possibly unused” appears only if a reliable last-opened date exists. Confirmed Delete sends the file to Recycle Bin; Keep leaves it in place.
  Why now: Adds the highest-consequence operation after safe scanning, review, and confirmation patterns have been exercised. It completes the cleanup part of the demo with a recoverable delete.
  PRD ref: `prd.md > The Core Journey` (step 6), `Deletion review`, and `States and Boundaries`
  Spec ref: `spec.md > Local File Analyzer and Suggestion Builder`, `File Operation Handler`, `Data Model`, and `Important Failure Modes`
  Build: Add content-hash duplicate detection, the one-year last-modified rule, cautious optional last-opened rule, a 5/10/50-card paged deletion grid with safe per-file previews, Keep/Delete review, confirmation, Recycle Bin operation, and friendly empty state. Add the same 5/10/50 paging control to move suggestions.
  Verify (mechanical): Run `node --test`; temporary fixtures prove exact-content duplicates match while name-only matches do not, the one-year cutoff is applied, Keep changes nothing, and Delete invokes a safely testable trash operation. In the Windows UI, verify both review grids can show 5, 10, and 50 cards per page; deletion previews use bounded safe previews; a confirmed test deletion reaches Recycle Bin; and the no-candidates state is shown.
  Learner check: Set each review page to 5, 10, and 50 items, preview a disposable duplicate or old test file, choose Keep first, then test Delete on a separate disposable file and confirm it is recoverable from Recycle Bin. Tell me if the previews, tags, page controls, and confirmation make the decisions understandable.
  Commit: `Add confirmed deletion review`

- [x] **5. Speed up large folder scans without changing review safeguards**
  Becomes usable: Scanning large personal folders reads metadata without parsing file contents, shows the running file count, skips known cache folders with a visible reason while preserving folder totals, and keeps exact-duplicate review working through cached hashes.
  Why now: The browsing, organization, and deletion journeys already work; this focused performance pass addresses the reported slow scan while protecting the established review and approval behavior.
  PRD ref: `prd.md > The Core Journey` (steps 1 and 7), `Scanning and organization suggestions`, `Deletion review`, and `States and Boundaries`
  Spec ref: `spec.md > Standard-Folder Scanner`, `Local File Analyzer and Suggestion Builder`, `Duplicate Checker and Hash Cache`, `Preload Bridge`, `Renderer Interface`, `Data Model`, `Important Failure Modes`, and `File Structure`
  Build: Use a worker pool capped at about 16 concurrent metadata `stat` operations; do not read or parse content during inventory or suggestion generation. Exclude known cache folders such as `node_modules`, `.git`, `.cache`, `.npm`, and `.pnpm-store`, report each path and reason, and count directory entries beneath exclusions without statting or storing descendant file records. Preserve project-marker protection and metadata-based suggestions; label unmatched items “Needs preview.” Emit scan progress to the UI and log elapsed time per standard root. Cache SHA-256 digests locally by canonical path, size, and modified timestamp for same-size duplicate groups only; invalidate stale entries and store no contents. Keep previews click-triggered and retain all existing move/delete approval protections.
  Verify (mechanical): Run `npm test`. Focused tests verify the metadata worker never exceeds 16 concurrent stats; cache trees are reported, their descendant file counts remain in totals without file records, and ordinary scan results remain correct; progress counts advance and per-root durations are logged; suggestion building does not extract file contents and still preserves project protection/metadata rules; duplicate detection still requires equal size and matching SHA-256, reuses a valid cache entry, and rehashes after path/size/modified-time invalidation.
  Learner check: In Windows, rescan Downloads with a known cache folder and several ordinary test files. Confirm the count advances, the excluded folder and reason are visible, the folder total remains accurate, and ordinary file/move results still make sense. Confirm the app log records elapsed time for each available standard folder; click Preview on one file and verify it loads only then.
  Commit: `Speed up large folder scans`

## Hands-on Checkpoints

- [x] Early usable behavior explored — confirmed folder browsing works, compared the displayed files with Explorer, and refined the palette, card shape, header, button, dates, and background icons through hands-on feedback before organization suggestions were added.
- [x] Final kick-the-tires exploration and feedback completed — Paul tried the full Windows app journey and confirmed it works.

## Final Review

- [x] Use the exact “Preview file” label on move cards, allow hiding and reopening previews, and keep move/deletion counts in sync after decisions; Windows retry confirmed the pages look right.
- [x] Shorten review navigation buttons to “Organize Files” and “Delete Files”; keep counts on the review pages.
- [x] Show a visible “Still processing” status during scans and file actions.
- [x] Show compact source-to-destination locations on move cards with expandable full paths.
- [x] Increase gray background decoration visibility modestly without competing with content.
- [x] Final review complete — feedback resolved and learner confirmed the proof of concept is ready for its demo

## Code Tour and App Map

- [x] Learning activity complete — brief recap connected the scan crash, its test, and the reusable habit of checking real data shapes; learner declined the guided tour
- [x] Optional edit and transfer reflection addressed — not applicable after the learner declined the activity
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Brief evidence-based recap of the equal-timestamp scan crash: `src/main/deletion-review.js > buildDeletionCandidates` used the scan record's actual `path` field; the tied-timestamp fixture in `test/deletion-review.test.js` now exercises the tie-break. The learner declined a guided code tour and said the POC looks good for its demo.
Route and stops: Reference-only route in `devpost/app-map.html`: `src/main/main.js > folders:scan`; `src/main/deletion-review.js > buildDeletionCandidates` and `createDeletionReviewQueue`; `src/renderer/app.js > scanFolders` and `renderDeletionReview`. Not toured live.
Edit outcome: Not applicable — guided activity declined; no edit made.
Reflection: Not offered — the learner declined the activity and moved to demo preparation.
Activity mode: Brief evidence-based recap; guided route declined. App map prepared as a take-home reference.

## Revisions
- Added Slice 5 after the approved scan-performance requirements were incorporated into the planning documents but not the original build checklist; implementation remains unstarted until this revised slice is approved.
- Slice 2 interaction revision — learner approved individual per-file cards instead of grouped destination cards, protection and “Already organized” summary, skipped disclosure limited to files unsafe to handle, removal of the failed-extraction list as out of scope, visible preview errors, and collision suffixes shown before approval with no overwrites. Later loose-root feedback refines the protection rule.
- Superseded Slice 2 interaction revision — an earlier draft called for destination-group cards, grouped file-type counts, and group-level approve/skip. The learner later approved individual per-file cards instead; only that newer behavior is in scope.
- Slice 2 Windows learner feedback — the first check found suggestions inside existing Documents subfolders such as “1.Bun” and “QU.” Paul requested loose-root files only; nested folder contents must be left untouched and summarized as “Already organized.” PRD, spec, implementation, and learner check were updated; the Windows retest confirmed nested files are left alone and loose files remain eligible.
- Slice 1 visual feedback — shifted the palette to blue-dominant with gold accents and sparing white, removed the yellow hover fill, and enlarged folder cards; the learner confirmed the original screen behavior worked and clarified that opening/previewing files belongs to Slice 3.
- Follow-up visual feedback — the blue-heavy screen felt too much and the cards too rectangular; softened the palette with a pale-yellow canvas, white panels/cards, smaller blue accents, and rounder, gently raised cards for a friendlier feel.
- Latest Slice 1 feedback — made folder cards square with rounded corners, bold icons, and a thick bottom edge; gave Rescan a distinct blue with hover/focus states; added readable modified dates and an “Unknown” fallback.
- Latest visual feedback — used WCAG-AA-contrasting blues for white header text and yellow-button text, increased header lettering spacing, and added low-opacity decorative SVGs behind the content.
- Decoration refinement — the learner could not see the colored background icons, so changed them to neutral gray and increased their opacity slightly while keeping them behind content.
- Slice 3 learner check — confirmed the browsing, search, preview, and open work was good and asked to proceed to Slice 4.
- Slice 4 review layout revision — Paul requested safe previews on deletion candidates and 5/10/50-card page sizes for both deletion review and move suggestions. The deletion page changes from one-at-a-time cards to a paged grid; each file still requires its own Keep or confirmed Delete decision.
- Slice 4 Windows learner check — confirmed scanning and both review pages work after the duplicate timestamp fix; preview and the 5/10/50 controls work. Paul tested Delete on an actual old file and confirmed it was recoverable from the Windows Recycle Bin.
- Final-review feedback — Paul asked for shorter review navigation labels without button counts, visible processing status, less overwhelming move-card locations, and slightly more visible background icons. The revised labels are “Organize Files” and “Delete Files”; counts stay on-page, paths can expand, and processing notices remain visible while work is underway.
- Final-review retry — Paul confirmed the shortened buttons, on-page counts, processing message, compact/expandable locations, and adjusted decoration visibility look good.
- Shipping verification fix — PDF.js now loads CMaps and standard fonts from its local package assets and suppresses warning-level diagnostics. Confirmed the source Git root is `~/basicsAI`; Windows cannot launch npm from the WSL UNC working directory, so its app run uses the synchronized Windows-side copy.
- Future AI preference — Paul would like AI-assisted file assessment in a later version. It is deferred beyond this POC until the privacy approach for reading personal file contents is decided.
- Slice 5 Windows feedback — scan progress, skipped-folder handling, timings, and the review pages were confirmed good. Move-card preview buttons now use the short label and toggle, and move/deletion counts refresh after decisions; Paul confirmed the Windows run copy looks right.
- Final kick-the-tires — Paul tried the full scan, organization, browsing, preview/open, and deletion flows in Windows and confirmed they work; no further changes requested.

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

- [ ] **1. Browse the six real Windows folders in the desktop app**
  Becomes usable: A running Electron app scans Documents, Downloads, Desktop, Pictures, Music, and Videos, shows them as square, rounded cards, and lets Paul open a folder to see its files and last-modified dates. Rescan refreshes the view, and inaccessible folders show a clear path/error.
  Why now: Bootstraps the app while proving the riskiest foundation early: Electron can run on Windows, safely identify the six real folders, and display actual files without changing anything.
  PRD ref: `prd.md > The Core Journey` (steps 1–4), `Screens and Layout`, `Browsing and searching`, and `Access problems`
  Spec ref: `spec.md > Stack`, `Where It Runs and How Someone Tries It`, `Electron Main Process`, `Preload Bridge`, `Renderer Interface`, `Standard-Folder Scanner`, `Data Model`, and `File Structure`
  Build: Scaffold Electron with main/preload/renderer separation, safe window settings and IPC; add the six-root scanner with path-boundary checks and clear access errors; show general-folder cards and real file listings with formatted modified dates; add rescan. Include project setup and dependencies in this slice.
  Verify (mechanical): On Windows, run `npm install`, `npm start`, and `node --test`. Verify the app opens; confirm each available root appears, opening a root shows its real files and dates, a missing date displays “Unknown,” a missing/inaccessible root reports its path, and a rescan updates the display. Run the relevant tests and confirm no errors.
  Learner check: Start the app in Windows, open Downloads and another available folder, and compare a few displayed names with File Explorer. Try Rescan and tell me whether the folder cards and file list feel clear.
  Commit: `Add safe Windows folder browsing`

- [ ] **2. Suggest purpose folders and move real files only after confirmation**
  Becomes usable: A scan proposes useful folders and locations from file names, properties, and supported local text/PDF content. Paul can review one move at a time, see its source and destination, confirm or reject, and see accepted files and created folders in File Explorer.
  Why now: Delivers the unique kernel early: purpose-based real folders under useful standard folders, not just a generic file browser. It also tests content extraction and real moves before adding optional features.
  PRD ref: `prd.md > The Core Journey` (step 5), `Screens and Layout`, `Scanning and organization suggestions`, and `Product Decisions`
  Spec ref: `spec.md > The Core Journey Through the System`, `Local File Analyzer and Suggestion Builder`, `Purpose-Folder Index`, `File Operation Handler`, `Local Preferences`, `Data Model`, and `What Was Simplified and Why`
  Build: Add local metadata/text/PDF analysis and explainable destination suggestions; create the purpose-folder index; allow Paul to name a folder and accept suggested folder names/locations; add one-at-a-time source/destination review and confirmation; create real folders and move actual files only after a confirmed accept; skip rejected suggestions until a later scan.
  Verify (mechanical): Run `node --test`; using temporary test folders, verify suggestions do not modify files, rejected suggestions leave files untouched, confirmed moves create the destination and preserve file contents, and paths outside allowed roots are rejected. In Windows, confirm an accepted move appears in File Explorer and the purpose-folder index.
  Learner check: Put copies of a few test files in a scanned folder, run a scan, and inspect the suggested purpose and source/destination paths. Reject one and accept another; confirm the rejected file stays put and the accepted file appears at its new location in File Explorer.
  Commit: `Add reviewed purpose-based file moves`

- [ ] **3. Browse, search, preview, and open files**
  Becomes usable: The purpose-based page indexes real folders wherever they live; folder contents can be searched and shown in grid or list view. Supported images, text, and PDFs can be previewed locally; other files offer Open through Windows.
  Why now: Builds on the stable scan and real-folder index, then completes the everyday browsing journey without adding a separate database or virtual file system.
  PRD ref: `prd.md > The Core Journey` (steps 2–4), `Screens and Layout`, `Browsing and searching`, and `States and Boundaries`
  Spec ref: `spec.md > Renderer Interface`, `Purpose-Folder Index`, `Search, Preview, and Open`, `Local Preferences`, `Data Model`, and `Look and Feel`
  Build: Add purpose-folder navigation and persistence, search over the current scan, grid/list switching, local image/text/PDF preview with an unavailable fallback, and Open through Windows file handling.
  Verify (mechanical): Run `node --test`; verify filtering with known fixture names, grid/list shows the same files, supported preview types render without network access, unsupported types show the fallback, and Open reports errors rather than false success.
  Learner check: Open a purpose folder, find a test file with search, switch layouts, preview a supported file, and use Open on a file whose type is unsupported for preview.
  Commit: `Add file search and preview controls`

- [ ] **4. Review cautious deletion candidates safely**
  Becomes usable: A scan shows one deletion candidate at a time with a reason and path. Exact-content duplicates and files modified more than one year ago are labeled; “possibly unused” appears only if a reliable last-opened date exists. Confirmed Delete sends the file to Recycle Bin; Keep leaves it in place.
  Why now: Adds the highest-consequence operation after safe scanning, review, and confirmation patterns have been exercised. It completes the cleanup part of the demo with a recoverable delete.
  PRD ref: `prd.md > The Core Journey` (step 6), `Deletion review`, and `States and Boundaries`
  Spec ref: `spec.md > Local File Analyzer and Suggestion Builder`, `File Operation Handler`, `Data Model`, and `Important Failure Modes`
  Build: Add content-hash duplicate detection, the one-year last-modified rule, cautious optional last-opened rule, one-at-a-time Keep/Delete review, confirmation, Recycle Bin operation, and friendly empty state.
  Verify (mechanical): Run `node --test`; temporary fixtures prove exact-content duplicates match while name-only matches do not, the one-year cutoff is applied, Keep changes nothing, and Delete invokes a safely testable trash operation. On Windows, confirm a test file moves to Recycle Bin only after confirmation and the no-candidates state is shown.
  Learner check: Review a disposable duplicate or old test file, choose Keep first, then test Delete on a separate disposable file and confirm it is recoverable from Recycle Bin. Tell me if the tags and confirmation make the decision understandable.
  Commit: `Add confirmed deletion review`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after Slice 1, try the Windows folder cards and file list; feedback can shape navigation and clarity before organization suggestions are added.
- [ ] Final kick-the-tires exploration and feedback completed — after all slices, try the full scan, organization, browsing, preview/open, and deletion flows in Windows.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
- Slice 1 visual feedback — shifted the palette to blue-dominant with gold accents and sparing white, removed the yellow hover fill, and enlarged folder cards; the learner confirmed the original screen behavior worked and clarified that opening/previewing files belongs to Slice 3.
- Follow-up visual feedback — the blue-heavy screen felt too much and the cards too rectangular; softened the palette with a pale-yellow canvas, white panels/cards, smaller blue accents, and rounder, gently raised cards for a friendlier feel.
- Latest Slice 1 feedback — made folder cards square with rounded corners, bold icons, and a thick bottom edge; gave Rescan a distinct blue with hover/focus states; added readable modified dates and an “Unknown” fallback.
- Latest visual feedback — used WCAG-AA-contrasting blues for white header text and yellow-button text, increased header lettering spacing, and added low-opacity decorative SVGs behind the content.
- Decoration refinement — the learner could not see the colored background icons, so changed them to neutral gray and increased their opacity slightly while keeping them behind content.

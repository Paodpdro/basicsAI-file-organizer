---
doc: prd
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Personal File Organizer — Product Requirements

A friendly personal file organizer for Paul that moves files and creates folders in the real file system, so the organization is visible both in the app and in File Explorer.
Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.

This draft distinguishes the current app from remaining work and the proposed scan-performance change.

## The Core Journey
1. Paul opens the Windows Electron app. It inventories the six standard personal folders and prepares move suggestions and deletion candidates. It does not scan Windows, Program Files, or other system/application folders.
2. The app opens on the purpose-based folders page when Paul has folders there. If he has not created any yet, it shows the familiar general-folder cards instead.
3. Paul opens a purpose or general folder to browse; he can search the current scan, switch between grid and list layouts, and click Preview or Open on a file. Add existing folder registers a real folder under one of the six approved roots.
4. In organization suggestions, he reviews eligible loose files as individual cards. Files in subfolders or protected project roots remain under “Already organized.” He clicks Preview to inspect a file and destination, then Approve to move it; Skip for now leaves it in place. Nothing moves before approval.
5. In deletion review, he reviews candidates in a paged grid. Candidates are files older than one year or exact-content duplicates among files with the same byte size. He can choose 5, 10, or 50 per page, Preview, Keep a file, or confirm Delete to send it to the Windows Recycle Bin.
6. The planned Windows extras page will list installer/executable files found within the six personal roots. It is in the original scope but is not present in the current app.
7. Rescan refreshes the inventory, move suggestions, deletion candidates, and purpose-folder availability. The planned performance update shows a running file count and records per-folder scan duration.

## Screens and Layout
- **Purpose-based folders:** The home page when at least one such folder exists. It is an index to real folders nested under the most useful general folder—for example, Research under Documents, Minecraft under Desktop, or Qatar Images under Pictures. Paul names folders; the app may suggest useful names and locations.
- **General folders:** A grid of the familiar Documents, Downloads, Desktop, Pictures, Music, and Videos folders. These folders remain present and are not replaced.
- **Folder contents:** Opens when Paul chooses a purpose-based or general folder. Offers grid and list layouts, a way to switch between them, and file actions for Preview and Open.
- **Organization suggestions:** Shows a paged grid of individual move cards, one file per card, with 5, 10, or 50 cards per page. Each card shows its current path, proposed destination, Preview, Approve, and Skip for now actions. There are no grouped destination cards or checkboxes.
- **Deletion review:** Shows a paged grid of possible deletion candidates with reason tags, current locations, and safe per-file previews. Paul can choose to show 5, 10, or 50 cards per page, and each card has Keep and Delete actions.
- **Windows extras (not built yet):** A planned separate page for Windows-related files found in accessible personal folders, such as downloaded installers and `.exe` files; not mixed with personal files or sourced from system/application folders.
- Navigation makes these areas accessible as distinct tabs or pages. Exact labels can be settled in the technical spec.

## Look and Feel
- Friendly and welcoming, with the approachable feel Paul likes in Duolingo, but without complex animation.
- Use a soft yellow page background with subtle, gray paper/folder and file-type SVG decorations behind content, rounded cream folder cards, and a medium-blue header with high-contrast white text and a deeper-blue underline. The Rescan button is sunny yellow with readable blue text. Use Fredoka for headings and buttons and Nunito for body text, with system sans-serif fallbacks. The interface should feel friendly and playful without making blue or yellow overpowering. Red is reserved for deletion-related actions or warnings.
- Buttons feel clear and welcoming. Wording is short, simple, and descriptive, including for older people and people who are not file-system experts.
- Feedback should never sound harsh or blame the user.
- File browsing should feel familiar like Windows Explorer or Google Drive, but simpler and easier to use.

## Features and Behavior

### Browsing and searching
Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.
- Display the familiar general folders as cards and preserve those folders on the computer.
- Provide a distinct index to purpose-based folders. Windows extras remain a required, unbuilt page from the original POC boundary. Purpose-based folders are real folders under their appropriate general location, not app-only groupings; Paul can register existing folders under the six standard roots using Add existing folder.
- Open purpose folders wherever they live under the six standard roots, and browse into their subfolders. Within an opened folder, show each file's name, type, and last-modified date in either grid or list layout. Format dates like “Oct 12, 2026”; show “Unknown” when a date is missing. Paul can change the layout.
- Provide case-insensitive search across accessible personal file names and paths from the current scan, showing up to 100 results at a time.
- For a file, Preview loads only after a click; Open launches it with the usual Windows application. Image, text, and PDF previews are bounded/local; text is rendered as plain text.
- If Preview cannot display a file, say so clearly and offer Open instead. The app does not claim every format is previewable.
- If there are no purpose-based folders yet, show the general-folder cards as the useful starting view.

### Scanning and organization suggestions
Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.
- Scan Documents, Downloads, Desktop, Pictures, Music, and Videos and their subfolders when the app opens. Rescan refreshes results; custom roots are not supported.
- Planned performance behavior: first build a metadata inventory (name, path, size, modified date), with `stat` concurrency near 16. Skip metadata collection and analysis inside known large caches such as `node_modules`, `.git`, and configured cache names; report each skipped folder and reason separately, while preserving standard-folder totals by counting directory entries in skipped trees without statting or retaining per-file metadata.
- Show a progress count during metadata inventory and log elapsed scan time per standard folder.
- Exact duplicate review is a second pass after metadata inventory: compare only files with exactly equal byte sizes, hash their bytes with SHA-256, and reuse cached hashes when source path, size, and modified date are unchanged. This reads raw bytes for matching-size groups but does not parse file contents.
- The current implementation does not yet meet these performance requirements: its scan is serial, reads supported text/PDF content for suggestion rules, and hashes same-size files without a reusable hash cache. Progress count, per-folder timing, cache exclusions, and Windows extras are also not implemented yet.
- A scan prepares both organization suggestions and deletion candidates.
- Suggest moves only for eligible loose files directly inside Documents, Downloads, Desktop, Pictures, Music, or Videos. Do not analyze files inside existing subfolders or suggest moving them; summarize each non-empty top-level subfolder and its file count under “Already organized.”
- Show a collapsed “Skipped files (N)” disclosure for files that cannot be safely handled, with a reason. Report excluded cache folders separately with their paths and reasons. A file with no matching suggestion rule is not reported as a safety skip.
- Show move suggestions as a grid of individual cards, one card per file, with its suggested purpose folder, reason, current path, and proposed destination. Do not group files by destination or show group checkboxes.
- Let Paul select 5, 10, or 50 move suggestions per page; each move remains independently approved or skipped.
- If a standard folder's own top-level contents indicate a project—such as `.git`, `package.json`, an `.ino` sketch, a `.sln` file, or both a `.py` file and `requirements.txt`—show its direct files in “Already organized” instead of suggesting moves. Files within subfolders are always treated as already organized, without reading their contents or changing their folder structure.
- Keep filename-, extension-, size-, and date-based suggestions, “Already organized” markings, and all move approval/collision protections. The planned metadata-first analyzer removes content-derived suggestions from TXT, MD, CSV, LOG, and PDF files. Label unmatched files that may need content inspection “Needs preview” with a reason; load content only after a Preview click.
- A move card loads its preview only after the user clicks Preview. Show file name, size, type, current path, and proposed destination. Use a thumbnail for PNG/JPG/GIF/WebP and up to the first 50 KB of TXT/MD/JSON/CSV/JS as plain text; other formats show Preview unavailable with file metadata. If preview fails, show an explicit error. Preview alone never changes a file.
- Resolve an existing destination-name collision by appending the first available number before the extension, such as `report (2).pdf`. Show that exact destination in the preview before approval. Never overwrite a file; if the proposed name becomes unavailable before approval completes, refresh the proposed name and require approval for the updated destination.
- Suggest useful destinations, including general folders and purpose-based folders. Example: suggest moving student photos, an ID, and grades from Downloads into a student-records folder under Documents; other examples include Webtech 2 or research for a specific subject.
- Let Paul name purpose-based folders, while also allowing the app to suggest folder names and the most useful standard parent location. The purpose-based page links to these real folders wherever they live.
- Each individual card clearly identifies that file's current location and proposed destination in readable paths.
- Only the clicked Approve action authorizes a move. Skip for now dismisses that suggestion for the current review and does not create a permanent rejection preference or a skipped-file entry.
- If an accepted destination folder does not exist, create it in the real file system and move the actual file into it. The folder and move must appear in File Explorer as well as in the app.
- Do not automatically move files without Paul's confirmed acceptance.

### Windows extras
Source: `scope.md > The Original Hackathon Scope (Preserved)` and `The POC Boundary`.
- Keep a separate Windows extras page in the POC boundary. This page is not built in the current app.
- Classify installer/executable-like files (initial examples: `.exe`, `.msi`, `.msix`) found inside the six approved personal roots. Do not scan Windows, Program Files, or application folders to populate it.
- Show matching names, paths, types, and modified dates. Reuse the safe browsing Preview/Open behavior.

### Deletion review
Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.
- Show possible deletion candidates in a paged grid, each with an understandable reason tag, such as **old**, its current location, and a Preview action. Paul can choose 5, 10, or 50 candidates per page.
- Use the safe local preview behavior from browsing: supported images show a thumbnail, supported text shows at most the first 50 KB as plain text, selectable PDF text is extracted locally within the existing limits, and other unsupported types show “Preview unavailable.” No preview changes the file.
- Exact-content duplicates require equal byte size followed by matching SHA-256 hashes; same name or size alone is not enough. Reuse a cached hash only while the file's path, size, and modified date are unchanged.
- “Old” means last modified more than one year ago. The app has no reliable last-opened date, so it does not show “possibly unused.”
- Present candidates as suggestions, not certainty that a file is useless. Paul decides whether to keep or delete each one.
- Ask for confirmation before applying the choice. Keep leaves the file in place; confirmed Delete sends it to the Windows Recycle Bin.
- When there are no candidates, show a friendly message such as “Your files are clean.”
- Virus or malware detection is not part of this version.

### Access problems
Source: `scope.md > The POC Boundary`.
- If the app cannot access a folder, clearly identify the folder and show its path in a form Paul can copy and paste into File Explorer. Do not silently treat the inaccessible folder as scanned.

## States and Boundaries
- **First use, with no purpose-based folders:** Open on the general-folder cards. Paul can still access scanning and the other pages.
- **Normal use:** Open on purpose-based folders when available; scan on app launch and allow Rescan to refresh both suggestion types.
- **No deletion candidates:** Show “Your files are clean” or similarly short, reassuring wording.
- **No organization suggestions:** Show a clear, friendly empty state rather than a blank page. Exact copy can be chosen during build.
- **Preview unavailable:** Explain that Preview is unavailable for that file and offer Open; do not launch it automatically.
- **Folder inaccessible:** Identify the folder and give a copyable path for File Explorer.
- **Move suggestion approved:** Load the preview after a Preview click. Move only that file after Paul clicks Approve; create the destination folder if needed, then reflect the change in the app and File Explorer.
- **Move suggestion skipped:** Skip only that file when Paul clicks Skip for now. It remains in place and may appear again after a later scan.
- **Deletion candidate:** Show multiple cards per page, but no file is deleted until Paul confirms Delete on that candidate.
- **Scan boundary:** The first version scans the six standard personal folders and their subfolders. Windows, Program Files, and other system/application folders are excluded; custom scan locations are deferred.
- **Processing feedback:** Show a visible “Still processing” status while scanning or carrying out a file action, then clearly report its completion or error.
- **Move locations:** Lead with a compact source-to-destination summary on each move card and let Paul expand the full paths when needed.
- **Windows extras:** The page is part of the original POC boundary but is not implemented yet; until built, the app has no extras page or classifier.

## Current Implementation Status
- Implemented: six standard Windows folders; purpose/general-folder navigation; browse, search, Preview/Open, grid/list, Add existing folder, per-file move review, and paged deletion review with Keep/confirmed Recycle Bin delete.
- Implemented duplicate behavior: first group by exact byte size, then hash each candidate and report only exact-content matches. The current code does not reuse hashes across scans.
- Not implemented: Windows extras, metadata-first scan, cache-folder exclusion, bounded parallel stats, count-based scan progress, per-folder scan timing, or reusable hash caching.
- Current scan behavior: scanner stats files sequentially and the suggestion builder extracts supported text/PDF content. The proposed performance revision below removes scan-time text extraction while retaining duplicate detection as a separate same-size hash pass.

## Product Decisions
- Keep Documents, Downloads, Desktop, Pictures, Music, and Videos as familiar general-folder cards; organize files into these or purpose-based folders rather than removing the standard folders.
- Treat the purpose-based page as an index to real folders under the general folders, with Paul naming them and the app able to suggest names and useful parent locations.
- Make purpose-based folders the home page when they exist; fall back to the general-folder cards before any purpose-based folders have been created.
- Separate purpose-based folders and general folders; the original Windows extras page remains required outstanding POC work.
- Scan the six standard personal folders and their subfolders when the app opens; allow Rescan. Each refresh prepares move suggestions and deletion candidates.
- Review individual move cards, one file per card, with current and proposed locations; review deletion candidates one at a time with a reason tag and current location.
- Only an explicit Approve click on a move card authorizes that move. Confirm before keeping or deleting a deletion candidate. Skip for now applies only to that move suggestion and is not reported as an unsafe/skipped file.
- Create a missing destination folder only after approval, resolve filename clashes with a visible numbered suffix, and never overwrite. Changes must be visible in File Explorer and the app; this is not an app-only organization or simulated view.
- Aim for a friendly, Duolingo-like experience with simple animation, approachable colors, concise language, and gentle feedback.
- Keep deletion candidates limited to exact-content duplicates and files older than one year. Exact duplicates require exact byte-size equality followed by a matching hash; a match is never inferred from name or size alone. Reuse cached hashes while path, size, and modified date remain unchanged.
- The app has no reliable last-opened date, so it does not label files “possibly unused.” Virus/malware detection is out of scope.
- If a folder is inaccessible, provide its path so Paul can locate it through File Explorer.

## What We're Building
- A friendly file-browsing experience with purpose-based folders, familiar general-folder cards, and the outstanding Windows-extras page.
- Grid/list layouts, file search, Preview with a clear unavailable fallback, and Open through the computer's usual file handling.
- A proposed metadata-first launch scan and Rescan with concurrency-limited metadata reads, cache-folder summaries, file-count progress, and per-standard-folder timing.
- Individual move cards in a grid, with one file per card, source/destination paths, a safe per-file preview, and explicit Approve/Skip for now actions. Already organized folders are summarized separately; only files the app cannot safely handle appear in the collapsed skipped-files disclosure. Confirmed moves and folder creation modify the real file system and appear in File Explorer.
- Name-, extension-, size-, and date-based suggestions remain. Content-derived suggestions for TXT, MD, CSV, LOG, and PDF are removed; unmatched files that may have relied on content are labeled “Needs preview.” Preview content loads only after a click.
- Paged 5/10/50 deletion grids with duplicate/old reason tags, current path, click-to-load preview, Keep, and confirmed Delete to the Recycle Bin.
- Exact duplicate checking groups by byte size before SHA-256 comparison and reuses an unchanged file's cached hash.
- A rule-based Windows-extras classifier/page, not yet implemented, limited to files under the six approved personal roots.
- Safe handling of inaccessible folders with a visible, copyable folder path.
- Restrict scanning and organizing to the six standard personal folders and their subfolders; leave system/application folders alone. Adding custom scan locations is deferred.

## Deferred From the POC
- A Windows–WSL unified file bridge — explicitly deferred in `scope.md > Later` and `Explicitly Cut`.
- Virus or malware detection — explicitly excluded; deletion suggestions focus on exact duplicates and old files.
- Advanced cleanup heuristics and a full file-manager feature set — beyond the 2–4 hour proof of concept.

## Possible Later Enhancements
- Add a Windows–WSL unified view if the first version proves useful.
- Expand supported file previews and improve cleanup suggestions.
- Add AI-assisted file assessment only after choosing a privacy-preserving model and deciding whether any file contents may leave the computer. This is not part of the current proof of concept.
- Add richer purpose-folder organization and browsing options.

## Non-Goals
- Scan, move, or delete Windows, Program Files, or other system/application files; changing them could break the computer.
- Move or delete files without a confirmed user decision.
- Present a duplicate or old label as proof that a file is safe to delete.
- Detect viruses or malware.
- Build a complete replacement for Windows File Explorer.

## Requirements Clarified in 4-spec
- “Old” means more than one year since last modification; neither an old nor duplicate tag proves that a file is safe to delete. Exact duplicates require equal byte size and matching hashes.
- Preview supports images, plain text, and PDF in the proof of concept; unsupported formats use the unavailable message and Open fallback.
- For move approval, image thumbnails are shown for PNG/JPG/GIF/WebP, TXT/MD/JSON/CSV/JS previews show up to the first 50 KB as plain text, and other formats show an unavailable state with file metadata. Previews load only after an explicit click. A separate failed-extraction files list is out of scope.

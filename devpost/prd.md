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

## The Core Journey
1. Paul opens the app. It scans accessible personal folders and prepares organization suggestions and possible deletion candidates. It does not scan or modify Windows, Program Files, or other system/application folders.
2. The app opens on the purpose-based folders page when Paul has folders there. If he has not created any yet, it shows the familiar general-folder cards instead.
3. Paul opens a purpose-based folder to browse its files, or switches to the general folders, organization suggestions, deletion review, or Windows extras.
4. He can switch between grid and list layouts, search files, and choose Preview or Open for an individual file.
5. In organization suggestions, he reviews one proposed move at a time, including the original location and proposed folder path. He accepts or rejects it; the app asks him to confirm before applying the choice. Accepting a suggestion creates its destination folder in the real file system if needed and moves the actual file there. The change is visible in File Explorer as well as in the app. Rejecting skips that suggestion for now.
6. In deletion review, he sees one candidate at a time with a reason tag and current location. He can keep or delete it, confirming the choice before it takes effect.
7. He can rescan at any time to refresh both organization suggestions and deletion candidates.

## Screens and Layout
- **Purpose-based folders:** The home page when at least one such folder exists. It is an index to real folders nested under the most useful general folder—for example, Research under Documents, Minecraft under Desktop, or Qatar Images under Pictures. Paul names folders; the app may suggest useful names and locations.
- **General folders:** A grid of the familiar Documents, Downloads, Desktop, Pictures, Music, and Videos folders. These folders remain present and are not replaced.
- **Folder contents:** Opens when Paul chooses a purpose-based or general folder. Offers grid and list layouts, a way to switch between them, and file actions for Preview and Open.
- **Organization suggestions:** Shows one proposed file move at a time in an easy-to-read grid/card layout. Shows the file, its current location, and its proposed destination, with Accept and Reject actions at the bottom right.
- **Deletion review:** Shows one possible deletion at a time, its reason tag, and current location, with Keep and Delete actions.
- **Windows extras:** A separate page for Windows-related files found in accessible personal folders, such as downloaded installers and `.exe` files; not mixed with personal files or sourced from system/application folders.
- Navigation makes these areas accessible as distinct tabs or pages. Exact labels can be settled in the technical spec.

## Look and Feel
- Friendly and welcoming, with the approachable feel Paul likes in Duolingo, but without complex animation.
- White, yellow/gold, and blue are the main colors; red is reserved for deletion-related actions or warnings.
- Buttons feel clear and welcoming. Wording is short, simple, and descriptive, including for older people and people who are not file-system experts.
- Feedback should never sound harsh or blame the user.
- File browsing should feel familiar like Windows Explorer or Google Drive, but simpler and easier to use.

## Features and Behavior

### Browsing and searching
Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.
- Display the familiar general folders as cards and preserve those folders on the computer.
- Provide a distinct index to purpose-based folders and another page for Windows-related extras found in accessible personal folders. Purpose-based folders are real folders under their appropriate general location, not app-only groupings.
- Within an opened folder, show files in either grid or list layout. Paul can change the layout.
- Provide search across the accessible personal files this version can see.
- For a file, Preview attempts to show its contents inside the app; Open launches it the usual way on the computer.
- If Preview cannot display a file, say so clearly and offer Open instead. The app does not claim every format is previewable.
- If there are no purpose-based folders yet, show the general-folder cards as the useful starting view.

### Scanning and organization suggestions
Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.
- Scan Documents, Downloads, Desktop, Pictures, Music, and Videos and their subfolders when the app opens. Provide a Rescan action to refresh results later. Windows extras come from these eligible personal folders, not Windows or application/system folders. Adding other scan locations is deferred.
- A scan prepares both organization suggestions and deletion candidates.
- Suggest useful destinations, including general folders and purpose-based folders. Example: suggest moving student photos, an ID, and grades from Downloads into a student-records folder under Documents; other examples include Webtech 2 or research for a specific subject.
- Let Paul name purpose-based folders, while also allowing the app to suggest folder names and the most useful standard parent location. The purpose-based page links to these real folders wherever they live.
- Present proposed moves one at a time. Each suggestion clearly identifies the file, its current location, and its proposed destination in a readable folder path/structure.
- Accept and Reject are visible at the bottom right of the suggestion.
- Ask for confirmation before applying either decision. After confirmation, acceptance moves the file; rejection skips it for now and does not save a permanent rejection preference.
- If an accepted destination folder does not exist, create it in the real file system and move the actual file into it. The folder and move must appear in File Explorer as well as in the app.
- Do not automatically move files without Paul's confirmed acceptance.

### Deletion review
Source: `scope.md > The Core Loop`, `What "Working" Looks Like`, and `The POC Boundary`.
- Show possible deletion candidates one at a time, each with an understandable reason tag, such as **duplicate**, **old**, or **possibly unused**, and its current location.
- Treat identical file contents as duplicates, not matching names alone. “Old” means last modified more than one year ago. Show “possibly unused” only when a reliable last-opened date older than one year is available.
- Present candidates as suggestions, not certainty that a file is useless. Paul decides whether to keep or delete each one.
- Ask for confirmation before applying the choice. Keep leaves the file in place; confirmed Delete removes it.
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
- **Move suggestion accepted:** Confirm first; create the destination folder in the real file system if it does not exist, move the actual file, and reflect the change in both the app and File Explorer.
- **Suggestion rejected:** Confirm first, then skip it for now. It is not a permanent preference and may appear again after a later scan.
- **Deletion candidate:** No file is deleted until Paul confirms Delete.
- **Scan boundary:** The first version scans the six standard personal folders and their subfolders. Windows, Program Files, and other system/application folders are excluded; custom scan locations are deferred.

## Product Decisions
- Keep Documents, Downloads, Desktop, Pictures, Music, and Videos as familiar general-folder cards; organize files into these or purpose-based folders rather than removing the standard folders.
- Treat the purpose-based page as an index to real folders under the general folders, with Paul naming them and the app able to suggest names and useful parent locations.
- Make purpose-based folders the home page when they exist; fall back to the general-folder cards before any purpose-based folders have been created.
- Separate purpose-based folders, general folders, and Windows extras into distinct pages.
- Scan the six standard personal folders and their subfolders when the app opens; allow a manual rescan. Each scan prepares both move suggestions and deletion candidates.
- Review each move or deletion candidate one at a time. Show current and proposed locations for moves, and a reason tag and current location for deletion candidates.
- Confirm before accepting or rejecting a move suggestion and before keeping or deleting a deletion candidate. Rejections skip suggestions only for now.
- Create a missing destination folder in the real file system only after Paul confirms acceptance, then move the actual file there. Changes must be visible in File Explorer and the app; this is not an app-only organization or simulated view.
- Aim for a friendly, Duolingo-like experience with simple animation, approachable colors, concise language, and gentle feedback.
- Limit deletion labels to understandable possibilities such as duplicate, old, and possibly unused. Virus/malware detection is out of scope.
- Use exact-content matches for duplicate tags, a one-year last-modified threshold for old tags, and a reliable last-opened date older than a year for possibly-unused tags.
- If a folder is inaccessible, provide its path so Paul can locate it through File Explorer.

## What We're Building
- A friendly file-browsing experience with purpose-based folders, familiar general-folder cards, and a separate Windows-extras page.
- Grid/list layouts, file search, Preview with a clear unavailable fallback, and Open through the computer's usual file handling.
- Launch-time scan and manual rescan that produce organization suggestions and deletion candidates.
- One-at-a-time move suggestions with source and destination paths, confirmation, accept/reject, and skip-for-now behavior; confirmed moves and folder creation modify the real file system and appear in File Explorer.
- One-at-a-time deletion suggestions with reason tags, current path, confirmation, and a reassuring empty state.
- Safe handling of inaccessible folders with a visible, copyable folder path.
- Restrict scanning and organizing to the six standard personal folders and their subfolders; leave system/application folders alone. Adding custom scan locations is deferred.

## Deferred From the POC
- A Windows–WSL unified file bridge — explicitly deferred in `scope.md > Later` and `Explicitly Cut`.
- Virus or malware detection — explicitly excluded; deletion suggestions focus on possible duplicates, old files, or possibly unused files.
- Advanced cleanup heuristics and a full file-manager feature set — beyond the 2–4 hour proof of concept.

## Possible Later Enhancements
- Add a Windows–WSL unified view if the first version proves useful.
- Expand supported file previews and improve cleanup suggestions.
- Add richer purpose-folder organization and browsing options.

## Non-Goals
- Scan, move, or delete Windows, Program Files, or other system/application files; changing them could break the computer.
- Move or delete files without a confirmed user decision.
- Present a possible duplicate, old, or unused label as proof that a file is safe to delete.
- Detect viruses or malware.
- Build a complete replacement for Windows File Explorer.

## Requirements Clarified in 4-spec
- “Old” means more than one year since last modification. “Possibly unused” is shown only when Windows provides a reliable last-opened date older than one year; neither tag proves that a file is safe to delete.
- Preview supports images, plain text, and PDF in the proof of concept; unsupported formats use the unavailable message and Open fallback.

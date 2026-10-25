---
doc: scope
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Personal File Organizer

A Windows desktop app for browsing familiar personal folders, moving individual files into purpose folders after review, and safely reviewing possible deletions.

## Changes from the Original Hackathon Scope
- Windows/WSL unified access is not part of the app; it scans six Windows-known personal folders only.
- Grouped destination suggestions changed to individual file cards with preview, approve, or skip.
- Deletion review now uses paged candidate cards, Keep, and confirmed deletion to the Recycle Bin.
- Search, grid/list browsing, and Add existing folder are implemented.
- The Windows extras page remains in the original POC boundary but is not built yet; it remains outstanding work.
- A metadata-first performance revision is now planned; the current app still reads supported text/PDF content and hashes same-size files.

## The Current App

### The Unique Kernel
The app keeps Documents, Downloads, Desktop, Pictures, Music, and Videos as familiar places to browse, while indexing real purpose folders such as Research under Documents. It proposes individual moves and possible deletions, but Paul decides what happens to each file.

### Who It's For
Paul, whose personal files are disorganized and especially crowded in Downloads. New downloads accumulate there, so he has to manually move them to familiar folders or subject folders.

### The Core Loop
Open the Windows app and browse the six familiar folders or indexed purpose folders. Search names and paths, switch between grid and list, and preview or open a file. Rescan to refresh the inventory and review individual move suggestions or paged deletion candidates. Preview a move before approving it; keep a candidate or confirm deletion to send it to the Recycle Bin.

### Inspiration & Identity
Friendly and easy on the eyes—not a dense file-manager or system-admin console. The app uses rounded folder cards, playful typography, and simple language.

### Why This Matters to the Learner
Paul wants to make his own disorganized files easier to organize and find, and to get better at turning his coding knowledge into a working project.

### What "Working" Looks Like
The implemented app opens real Windows folders, browses purpose folders, searches and previews files, and shows individual reviewed moves and paged deletion candidates. Approving a move changes the real file system; confirmed deletion sends the file to the Recycle Bin. The Windows extras page is still missing.

### The POC Boundary
- Implemented: scan the six standard Windows folders and their subfolders; show general-folder cards and a purpose-folder index.
- Implemented: browse, search, preview, and open files; switch grid/list layouts; register an existing purpose folder inside an approved root.
- Implemented: suggest per-file moves, preserve “Already organized” folders, preview before approval, and move only after approval.
- Implemented: review files older than one year and exact-content duplicates with paged grids; Keep or confirm Delete to the Recycle Bin.
- Outstanding from the original boundary: a separate Windows extras page for installers and executables found inside the six personal roots. No such page or classifier exists in the current app.
- Not included: Windows, Program Files, arbitrary folders, or WSL paths as scan roots; automatic moves or unconfirmed deletion.

## The Original Hackathon Scope (Preserved)
The starting idea was a file-management tool for Paul's Windows and WSL file trees, focused on removing old/redundant files, suggesting useful folder structures, and applying changes only after acceptance.

The original core loop included:
- Familiar Documents, Downloads, Desktop, Pictures, Music, and Videos.
- Separate pages for purpose-based folders and Windows extras such as installers and `.exe` files.
- Search over personal files, suggestions for useful destinations, and review before moving or deleting.

The original POC boundary included the six familiar folders, purpose folders, a Windows extras page, search, accepted moves, and cautious deletion review. The extras page was never implemented and remains outstanding. The original plan deferred a Windows–WSL bridge, AI-assisted assessment, advanced cleanup, and a complete file-manager replacement. Windows/system/application folders, blind auto-sorting, automatic deletion, and the Teleparty-inspired watch-party extension were explicitly cut.

## Later
- Implement the remaining Windows extras page, or explicitly defer it from the final demo.
- Improve scan responsiveness with a metadata-first inventory and bounded concurrent metadata reads.
- Consider a Windows–WSL view, broader cleanup rules, or AI-assisted assessment only after separate scope and privacy decisions.

## Explicitly Cut
- **System/application folders and arbitrary roots** — scanning and changing those locations is outside the six approved personal folders.
- **Blind auto-sorting and automatic deletion** — each move or deletion remains a user decision.
- **A full Windows ↔ WSL bridge** — outside the current proof of concept.
- **A complete Windows Explorer replacement** — too broad for this project.
- **A Teleparty-style watch-party extension** — inspiration only, not this project.

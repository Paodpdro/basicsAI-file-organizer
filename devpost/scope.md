---
doc: scope
status: approved
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# Personal File Organizer

A personal file organizer that keeps familiar Windows folders easy to browse, sorts files into useful destinations, and separates personal-purpose folders from Windows extras.

## The Unique Kernel
It keeps the familiar folders—Documents, Downloads, Desktop, Pictures, Music, and Videos—as the main way to browse, while also organizing files into purpose-based folders Paul uses, such as coding or research for a specific subject. For example, student photos, ID, and grades found in Downloads could be suggested for a student-records folder under Documents. The organizer proposes where files belong and moves them only after Paul accepts.

## Who It's For
Paul, whose personal files are disorganized and especially crowded in Downloads. New downloads accumulate there, so he has to manually move files to the familiar folders or subject folders where he wants them.

## The Core Loop
Open the organizer to a grid of familiar folders—Documents, Downloads, Desktop, Pictures, Music, and Videos. Switch to a page of purpose-based folders, such as coding or research for a particular subject, or a separate page for Windows extras such as installers and `.exe` files. Search when looking for something specific. Ask it to scan personal files, review suggested destinations and possible deletions, and accept or reject changes before files are moved or deleted.

## Inspiration & Identity
Easy on the eyes and user-friendly—not a dense, technical file-manager or system-admin console. The familiar Windows folders are shown as grid cards; purpose-based folders and Windows extras each have their own page.

## Why This Matters to the Learner
Paul wants to make his own disorganized files easier to organize and find, and to get better at turning his coding knowledge into a working project.

## What "Working" Looks Like
In a short demo, Paul sees grid cards for Documents, Downloads, Desktop, Pictures, Music, and Videos, plus pages for purpose-based folders and Windows extras. The organizer finds files in Downloads, suggests moving student photos, an ID, and grades into a student-records folder under Documents, and suggests useful groups such as Webtech 2 or research for a specific subject. Paul can search for a file, review suggestions, and accept a move. The organizer asks before deleting anything.

## The POC Boundary
- Show Documents, Downloads, Desktop, Pictures, Music, and Videos as the familiar main grid, without removing or replacing those folders.
- Provide a separate page for purpose-based folders such as coding, Webtech 2, or research for a specific subject.
- Provide a separate page for Windows-related extras such as installers and `.exe` files.
- Scan personal files in the folders this version can safely access, including Downloads and other personal locations; do not organize Windows, Program Files, or other system/application folders.
- Search within the personal files this version can see.
- Suggest useful folders and destinations within the familiar or purpose-based organization, then move files only after Paul accepts.
- Flag possible deletions for review and ask before deleting; never delete automatically.
- Keep the experience simple and approachable.

## Later
- Reach Windows files and WSL Ubuntu files as one place, including searching or copying between them.
- More sophisticated cleanup and categorization beyond the proof of concept.
- AI-assisted file assessment after deciding how file contents remain private, such as on-device analysis versus explicitly approved cloud processing.
- A richer library of folder types, templates, and browsing views.

## Explicitly Cut
- **Windows, Program Files, and other system/application folders** — changing these files could break the computer; the organizer preserves the familiar personal folders and focuses on personal files.
- **Blind auto-sorting or automatic deletion** — Paul needs to review and accept suggested changes.
- **A full Windows ↔ WSL bridge** — wanted, but not needed to prove the first version.
- **A complete, polished file manager** — too broad for a 2–4 hour proof of concept.
- **A Teleparty-style watch-party extension** — inspiration only, not part of this project.

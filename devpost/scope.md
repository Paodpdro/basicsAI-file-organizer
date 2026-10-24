---
doc: scope
status: draft
---
<!-- `status` is the progress state every skill reads. Write `draft` when you first save this file,
     and change it to `approved` when the learner clearly approves the displayed plan ("looks good" counts).
     Do not request a second sign-off. Never skip the draft save —
     an unsaved draft dies with the conversation. -->

# File Organizer

A personal tool that suggests where files should live (including use-case folders), applies only what you accept, and helps you find files without walking every folder.

## The Unique Kernel
It does not blindly dump files into Documents / Music / Pictures. It proposes groupings that match a use case (for example, one “English communication research” folder) and where that folder should live, then moves files only after you choose.

## Who It's For
People with disorganized files: students, older people / older generations, and anyone in the same situation — years of stuff piled in Downloads, hunting through folders by hand. The proof of concept is still built around Paul’s machine (third-year software engineering student, Windows + WSL, school/research/media dump), so we can demo a real mess without designing for every kind of user at once.

## The Core Loop
Open the tool, see familiar folder cards (Documents, Desktop, Downloads, and so on) plus a **Windows extras** card for installers, `.exe` files, and similar junk, optionally search, hit Organize, review suggested placements and groupings, accept or reject, and watch accepted moves happen. The tool can also ask whether unused or useless-looking files should be deleted. Windows extras stay out of the “my files” cards — they live on their own card.

## Inspiration & Identity
Easy on the eyes and user-friendly for people who are not file-system experts — including older people and students. Square cards for the usual folders, not a dense file-manager tree. Calm and personal — not a system-admin console. (Teleparty is personal inspiration for simple, friendly UI, not a feature of this product.)

## Why This Matters to the Learner
He already knows DSA and OOP but gets stuck actually building. This project is a real mess on his own machine: high-school-era files, research, and a Downloads folder that never got sorted. He wants something that organizes files properly and makes them easier to locate.

## What "Working" Looks Like
In a short demo: open the app, look at folder cards including a Windows extras card, search and find a file, press Organize, see use-case-aware suggestions (not just file-type buckets), accept some, and those files actually move. Also get asked before deleting unused or junk-looking files.

## The POC Boundary
In now, tightly:
- Organize that **suggests** placements and use-case folders, then **does** the accepted ones
- Ask before deleting unused or somewhat useless files
- Separate Windows extra files from “my” files, shown as their own **Windows extras** card (not mixed into Documents / Downloads)
- A **search** button to find a file without walking folders (within the files this version can see)

The first demo can target a messy area Paul actually cares about (especially Downloads), not a perfect whole-disk product.

## Later
- Reach Windows files and WSL Ubuntu files as one place: search or copy between them without hopping through folders
- Richer “authoritative files” library and more folder cards / tabs
- Smarter junk detection and more use-case templates

## Explicitly Cut
- **Blind auto-sort by file type with no approval** — the kernel is suggest-then-accept, including use-case folders
- **Full Windows ↔ WSL bridge in this proof of concept** — Paul wants it, and it is later, not now (search in this version is not that bridge)
- **A complete file manager** (every tab, every cleanup heuristic, whole-device polish) — too big for 2–4 hours
- **A Teleparty-style watch-party extension** — inspiration only

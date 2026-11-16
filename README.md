# Personal Directory Web Page

A dynamic, shareable personal profile/directory page for Ashrafuzzaman, designed for resume links and GitHub Pages hosting.

## Features
- Cover hero background using `assets/1775470668186.jpg`
- Dynamic, data-driven tabs/sections (editable in admin mode)
- Visitor mode (read-only, shareable link) and Admin mode (`?admin` + passcode)
- Admin can edit tab labels/content, profile text, images/photos, and dynamic lists (Projects, Events, Gallery)
- Scroll-triggered reveal animations (dynamic motion)
- Content saved to browser `localStorage` with **Export/Import JSON** for portability
- Default content loaded from `assets/data.json`

## Structure
- `index.html` — main page
- `assets/style.css` — styles and animations
- `assets/app.js` — rendering, tabs, admin/editor, persistence
- `assets/data.json` — default profile/content data
- `assets/1775470668186.jpg` — cover background image

## Usage
- **Visitor:** open `index.html` (or hosted URL) normally.
- **Admin:** open `index.html?admin`, enter passcode, then edit content. Use **Export JSON** to back up/share updates and **Import JSON** to restore/apply.

## Hosting (GitHub Pages)
1. Push this folder/repo to GitHub.
2. Enable GitHub Pages (branch/folder containing `index.html`).
3. Share the published URL in your resume.

## Status
- **Started:** 2026-11-16
- **Status:** in progress
- **Notes:** Default content seeded from `D:\Resume\AN Resume\Resume of Ashrafuzzaman_updated October 2026.pdf`. Update values/wording in admin as needed.

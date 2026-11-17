# Personal Directory Web Page

A dynamic, shareable personal profile/directory page for Ashrafuzzaman, designed for resume links and GitHub Pages hosting.

## Features
- Cover hero background using `assets/1775470668186.jpg`
- Dynamic, data-driven tabs/sections (editable in admin mode)
- Visitor mode (read-only, shareable link) and Admin mode (`?admin` + passcode)
- Admin can edit tab labels/content, profile text, images/photos, and dynamic lists (Projects, Events, Gallery)
- **Reorder tabs:** in admin mode, drag any tab left/right on the tab bar, or use **+ Tabs → Move left / Move right** in the tab manager (works on touch too)
- **Profile photo & cover upload:** in admin mode click **Change photo** on the hero photo (or *Edit profile/hero*), then **Upload image** — photos are auto-resized (720px for the profile photo, 1600px for the cover) and stored as WebP in `localStorage`
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
- **Uploaded images are per-browser:** uploads (and all admin edits) live in this browser's `localStorage`, so visitors won't see them. To publish a photo for everyone, add the image file to `assets/` in the GitHub repo and either paste its path (`assets/your-photo.jpg`) in the photo picker's URL box or set `profile.photo` in `assets/data.json`. Export JSON after uploading and import it on another device if you want the same photo there.

## Hosting (GitHub Pages)
1. Push this folder/repo to GitHub.
2. Enable GitHub Pages (branch/folder containing `index.html`).
3. Share the published URL in your resume.

## Status
- **Started:** 2026-11-16
- **Status:** in progress
- **Notes:** Default content seeded from `D:\Resume\AN Resume\Resume of Ashrafuzzaman_updated October 2026.pdf`. Update values/wording in admin as needed.

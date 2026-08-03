# Freezer Memo MVP Smoke Test

Run this checklist against the production build before calling the MVP release-ready. Record one evidence row per device/browser in the execution matrix; do not mark a test passed from code inspection alone.

## Preconditions

- Deploy `npm run build` and serve `dist/` from an HTTPS production URL. Record the URL as `DEPLOY_URL`.
- Use a fresh browser profile or private window for first-load and install checks. Allow storage, downloads, and notifications if prompted.
- Prepare Android Chrome and iPhone Safari. Test once in browser mode and once in installed/standalone mode where the platform supports it.
- To reset safely, export a backup if the data matters, close the app, then use browser DevTools `Application > Storage > IndexedDB > freezer-memo > Delete database`. Reload `DEPLOY_URL`; do not clear unrelated site data.
- Prepare one valid v1 item-only JSON backup, one valid v2 backup containing at least one preset, and edited copies with an invalid category key, duplicate item ID, and duplicate preset combination.

## Evidence

Copy this row for each device and execution pass:

| Date | App version / commit | Device + OS | Browser / version | Browser or installed mode | Result | Defect link / notes |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | v1.2 / `<commit>` | `<device>` / `<OS>` | `<browser>` / `<version>` | `<browser or standalone>` | `<pass or fail>` | `<link or notes>` |

Record the exact failing step, visible error text, reproduction data, and screenshot or screen recording for failures.

## First Load And PWA

### First load

1. Open `DEPLOY_URL` in a fresh profile.
2. Wait for the app shell and inventory view to render.
3. Confirm the app title, current-inventory view, add action, language switcher, and no console-visible error are present.

Expected: the app loads over HTTPS, shows the current inventory view, and presents no visible error state.

### Install

1. Open the PWA/install section.
2. On Android Chrome, use the app install prompt or browser menu and confirm installation.
3. On iPhone Safari, use `Share > Add to Home Screen`, then confirm the home-screen icon exists.

Expected: installation completes where supported and the app reports installed/standalone state after launch.

### Installed cold start

1. Close the installed app completely.
2. Launch it from the home screen.
3. Wait for the inventory view to appear.

Expected: the installed app opens without a network request requirement, retains local data, and shows no visible error.

### Offline reload

1. Load the app once while online and wait for the offline-ready indicator.
2. Enable airplane mode or DevTools Network `Offline`.
3. Reload the browser or installed app.

Expected: the shell and existing local inventory load offline; no blank page or uncaught visible error appears.

## Offline Inventory Flows

### Add, search, filter, and sort

1. Keep the device offline and add an item with a category, cut, quantity, and optional note.
2. Save it and reload offline.
3. Search by note, category/cut label, and quantity.
4. Select a category filter, then switch sorting between newest, oldest, and category.

Expected: the item persists after reload; matching results update while typing; filters exclude non-matches; each sort order is deterministic; no visible storage error appears.

### Take out, undo, restore, and edit

1. Tap `Take out` on an active item.
2. Confirm it leaves current inventory and the undo notice is visible.
3. Tap `Undo` before the notice expires.
4. Take the item out again, open history, and tap `Restore`.
5. Edit the item note or quantity and save.

Expected: take-out changes status immediately, undo returns it to active inventory, restore returns it from history, and edits persist after reload while offline.

## English And Polish

1. With saved items present, switch from English to Polish without reloading.
2. Confirm category, cut, quantity, action, history, and backup labels change while saved notes remain unchanged.
3. Search using a Polish translated category/cut label.
4. Switch back to English and repeat with an English label.
5. Reload offline in the selected language.

Expected: both languages render correctly, localized searches find the existing item, notes remain raw user text, and the selected language survives reload.

## Backup And Restore

### Export and v2 import

1. Pin a preset and export a JSON backup.
2. Reset the database, then import that exported file.
3. Confirm the item and preset are present after import and reload.

Expected: export downloads JSON; v2 import restores items and presets; the preset remains usable and persisted offline.

### v1 item-only import

1. Reset the database.
2. Import the prepared v1 item-only backup.
3. Confirm all items are present and the pinned-presets section is empty.
4. Reload offline.

Expected: v1 import succeeds without discarding items and normalizes to zero presets.

### Invalid and duplicate payloads

1. Reset or use disposable data.
2. Import the edited backup with an invalid preset category key.
3. Repeat with duplicate item IDs and duplicate preset combinations.
4. Inspect the visible backup error after each attempt and reload.

Expected: every malformed or duplicate payload is rejected with an error; existing data is not silently overwritten or partially replaced.

## Presets

1. From a recent item, tap the outline heart to pin it.
2. Attempt to pin the same combination again.
3. Use the pinned preset and change its quantity before saving.
4. Reload offline and use the preset again.
5. Tap the filled heart to unpin it, then reload.
6. Export, reset, and import a v2 backup containing a preset.

Expected: one preset is created; duplicate combinations are not added; use prefills the add flow and updates usage; pin/unpin persists after reload; the preset is restored by v2 backup; heart and primary card actions have separate tap targets.

## Larger Inventory

1. Import or create at least 50 mixed items across categories, cuts, quantities, notes, and taken-out history.
2. Type a localized category/cut search query and change it repeatedly.
3. Switch category filters and all sort options.
4. Open history and return to current inventory.

Expected: results visibly update without a page freeze, interaction remains responsive for normal mobile use, ordering remains correct, and no console-visible or in-app error appears.

## Execution Matrix

| Test area | Android Chrome | iPhone Safari |
| --- | --- | --- |
| First load / install | Record result and evidence | Record result and evidence |
| Installed cold start / offline reload | Record result and evidence | Record result and evidence |
| Offline inventory flows | Record result and evidence | Record result and evidence |
| EN/PL and localized search | Record result and evidence | Record result and evidence |
| v1/v2 backup and rejection cases | Record result and evidence | Record result and evidence |
| Presets and persistence | Record result and evidence | Record result and evidence |
| Larger inventory responsiveness | Record result and evidence | Record result and evidence |

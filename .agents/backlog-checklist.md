# Freezer Memo Backlog Checklist

Use this file as the working build checklist. Update status in place as development moves.

Status legend:

- `[ ]` not started
- `[-]` in progress
- `[x]` done
- `[!]` blocked / needs decision

## Current Priorities

- [x] Create repo, MVP spec, and initial project scaffold
- [x] Turn the add-item experience into a real step-by-step mobile flow
- [x] Add edit item details and correction flow
- [x] Add JSON export/import backup
- [ ] Tighten offline/PWA behavior and install UX
- [ ] Prepare MVP for real-device testing

## Product Decisions

- [x] Meat-first MVP scope
- [x] English as default language
- [x] Polish as secondary language from day one
- [x] Default categories include lamb and wild boar
- [ ] Decide whether history is visible by default or hidden behind filter/view
- [ ] Decide whether presets stay auto-generated only or can be pinned manually in MVP

## App Foundation

- [x] Bootstrap React + TypeScript + Vite app
- [x] Add PWA plugin and manifest
- [x] Add IndexedDB persistence with Dexie
- [x] Add initial English/Polish translation setup
- [x] Add starter inventory UI shell
- [ ] Split app into clearer feature modules/components
- [ ] Add app-level empty/loading/error states where needed

## Guided Add Flow

- [x] Replace single-panel form with true step flow
- [x] Step 1: category selection screen
- [x] Step 2: cut/part selection filtered by category
- [x] Step 3: quantity type selection
- [x] Step 4: quantity value + unit entry
- [x] Step 5: optional searchable note
- [x] Add progress indicator and back navigation
- [x] Add save success state with `Add same again`
- [x] Improve one-handed mobile ergonomics for each step

## Inventory and Search

- [x] Show current inventory list
- [x] Add basic text search
- [x] Add take-out / restore action
- [x] Add recent item quick repeat
- [x] Add category filters
- [x] Add sorting controls
- [ ] Add dedicated history view or clearer history mode
- [x] Add item details / edit screen
- [ ] Improve search matching across translated labels

## Data and Storage

- [x] Store items as distinct records
- [x] Store category/cut as stable keys
- [ ] Add schema support for presets/favorites
- [ ] Add migration plan for future schema changes
- [x] Add backup export to JSON
- [x] Add restore from JSON
- [x] Validate import payload and handle bad files safely

## Internationalization

- [x] Wire language switcher
- [x] Translate default categories and cuts
- [x] Keep user notes as raw free text
- [ ] Extract any remaining hardcoded UI copy
- [ ] Verify pluralization/quantity phrasing in English
- [ ] Verify pluralization/quantity phrasing in Polish
- [ ] Test language switching against saved items and search behavior

## PWA and Offline

- [x] Register service worker
- [x] Generate manifest
- [x] Build offline-capable shell
- [ ] Add explicit offline-ready / installed feedback
- [ ] Test offline create/search/take-out on mobile
- [ ] Verify cold-start behavior after first install
- [ ] Add install prompt UX where supported

## UX Polish

- [ ] Refine visual hierarchy for inventory cards
- [ ] Improve search-first home screen layout
- [ ] Add confirmation/undo feedback for take-out action
- [ ] Improve forms for fast thumb use
- [ ] Add subtle motion/transitions without making it annoying
- [ ] Audit contrast, tap targets, and accessibility basics

## QA

- [x] Build passes
- [x] Lint passes
- [ ] Add smoke test plan
- [ ] Test on Android browser
- [ ] Test on iPhone browser
- [ ] Test installability as PWA
- [ ] Test offline after reload
- [ ] Test with larger sample inventory

## Nice-to-Have After MVP

- [ ] Pinned presets / favorites
- [ ] Freezer drawer / compartment field
- [ ] Bulk clear history
- [ ] Age indicators / freezer duration
- [ ] Recipe or usage suggestions
- [ ] Shared household sync

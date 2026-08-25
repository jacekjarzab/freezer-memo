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
- [x] Tighten offline/PWA behavior and install UX
- [x] Prepare MVP for real-device testing

## Product Decisions

- [x] Meat-first MVP scope
- [x] English as default language
- [x] Polish as secondary language from day one
- [x] Default categories include lamb and wild boar
- [x] Decide whether history is visible by default or hidden behind filter/view
- [x] Decide whether presets stay auto-generated only or can be pinned manually in MVP

## App Foundation

- [x] Bootstrap React + TypeScript + Vite app
- [x] Add PWA plugin and manifest
- [x] Add IndexedDB persistence with Dexie
- [x] Add initial English/Polish translation setup
- [x] Add starter inventory UI shell
- [x] Split app into clearer feature modules/components
- [ ] Add app-level empty/loading/error states where needed

## Guided Add Flow

- [x] Replace single-panel form with true step flow
- [x] Step 1: category selection screen with pinned presets and quick repeat
- [x] Step 2: cut/part selection filtered by category
- [x] Step 3: quantity type selection
- [x] Step 4: quantity value + unit entry
- [x] Step 5: freezer selection + optional searchable note
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
- [x] Add dedicated history view or clearer history mode
- [x] Add item details / edit screen
- [x] Improve search matching across translated labels

## Data and Storage

- [x] Store items as distinct records
- [x] Store category/cut as stable keys
- [x] Add schema support for presets/favorites
- [x] Add migration plan for future schema changes
- [x] Add backup export to JSON
- [x] Add restore from JSON
- [x] Validate import payload and handle bad files safely

## Internationalization

- [x] Wire language switcher
- [x] Translate default categories and cuts
- [x] Keep user notes as raw free text
- [x] Extract any remaining hardcoded UI copy
- [x] Verify pluralization/quantity phrasing in English
- [x] Verify pluralization/quantity phrasing in Polish
- [x] Test language switching against saved items and search behavior

## PWA and Offline

- [x] Register service worker
- [x] Generate manifest
- [x] Build offline-capable shell
- [x] Add explicit offline-ready / installed feedback
- [x] Test offline create/search/take-out on mobile
- [x] Verify cold-start behavior after first install
- [x] Add install prompt UX where supported

## UX Polish

- [x] Refine visual hierarchy for inventory cards
- [x] Improve search-first home screen layout
- [x] Add confirmation/undo feedback for take-out action
- [x] Improve forms for fast thumb use
- [x] Add subtle motion/transitions without making it annoying
- [x] Audit contrast, tap targets, and accessibility basics

## QA

- [x] Build passes
- [x] Lint passes
- [x] Add smoke test plan
- [ ] Test on Android browser
- [x] Test on iPhone browser
- [x] Test installability as PWA
- [x] Test offline after reload
- [ ] Test with larger sample inventory

## Nice-to-Have After MVP

- [x] Pinned presets / favorites
- [x] Freezer drawer / compartment field
- [ ] Bulk clear history
- [ ] Age indicators / freezer duration
- [ ] Recipe or usage suggestions
- [-] Shared household sync (inventory-only MVP; magic-link auth, Supabase Free tier, offline outbox sync; hosted schema/RLS integration validated; owner member removal and client recovery boundary implemented; pending App sync orchestration)

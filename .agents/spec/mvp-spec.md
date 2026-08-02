# Freezer Memo MVP Spec

## Product Summary

Freezer Memo is an offline-first PWA that helps a household quickly track what is in the freezer and remove guesswork during cooking, shopping, and meal planning.

The core product promise is simple:

- adding food must be fast enough to use every time
- inventory must be searchable in seconds
- the app must work fully offline on mobile

## Problem

Freezer contents are usually tracked mentally, in chat notes, or not at all. That creates three recurring problems:

- people forget what they already have
- food gets buried and wasted
- adding items to inventory feels too annoying to maintain manually

## Goals

- make adding a freezer item possible in under 10 seconds
- make finding an item possible in under 5 seconds
- support installable mobile PWA usage with offline read and write
- require zero account creation for MVP

## Non-Goals For MVP

- barcode scanning
- OCR from labels
- multi-user sync
- recipes and meal planning
- nutrition tracking
- automatic cloud backup

## Primary Users

- household owner managing groceries and frozen meal prep
- partner or family member checking what is available before shopping or cooking

## Core User Stories

1. As a user, I want to add meat from a guided flow so I do not type the same labels repeatedly.
2. As a user, I want to search current inventory by meat type, cut, or note so I can find items fast.
3. As a user, I want to mark an item as taken out in one tap so the inventory stays accurate.
4. As a user, I want the app to work without internet in the kitchen, garage, or store.
5. As a user, I want quick access to recently added combinations so repeat entry is faster.

## UX Principles

- mobile-first, thumb-friendly layout
- no spreadsheet feel
- guided input over blank forms
- one primary action per screen
- recent choices and presets reduce repetitive entry

## Information Architecture

### Main Screens

1. Home
2. Add Item flow
3. Inventory Search / List
4. Item Details / Edit
5. Settings and Backup

### Screen-Level Responsibilities

- Home: search, summary, recent items, and primary add CTA
- Add Item: guided creation with category, cut, quantity, and optional note
- Inventory List: searchable active stock with filters and quick removal
- Item Details: review metadata, adjust note, and correct mistakes
- Settings and Backup: export, import, and basic app state helpers

### Home Screen

- prominent search field
- primary CTA: `Add item`
- summary chips: total items and category counts
- recent items for quick repeat
- active inventory list preview

## Item Entry Flow

### Step 1: Select category

Initial category list:

- chicken
- beef
- pork
- turkey
- fish
- duck
- other

### Step 2: Select cut / part

Shown as filtered options based on category.

Examples:

- chicken: breast, thigh, wings, drumsticks, whole, ground
- beef: steak, antricot, ribs, roast, ground, other
- pork: ribs, loin, shoulder, neck, bacon, sausage, other

The catalog must be editable later, but hardcoded defaults are acceptable for MVP.

### Step 3: Set quantity

Support multiple quantity modes because freezer behavior is inconsistent in real life:

- weight in g or kg
- packs
- pieces

Examples:

- 500 g
- 1.2 kg
- 2 packs
- 4 pieces

### Step 4: Optional note

Free-text searchable note for things like:

- marinated
- for ramen
- from Lidl
- vacuum packed

### Step 5: Save

After saving:

- show success state
- offer `Add same again`
- return to home or inventory list

## Default Catalog For MVP

### Categories

- chicken
- beef
- pork
- turkey
- fish
- duck
- other

### Suggested Cuts By Category

- chicken: breast, thigh, wings, drumsticks, whole, ground, other
- beef: steak, antricot, ribs, roast, ground, burger, other
- pork: ribs, loin, shoulder, neck, bacon, sausage, ground, other
- turkey: breast, thigh, ground, whole, other
- fish: fillet, steak, whole, smoked, other
- duck: breast, legs, whole, other
- other: custom fallback label if nothing fits

The defaults can be hardcoded locally in MVP and made editable later.

## Inventory Behavior

Each saved item is a distinct inventory entry, not a checkbox inside a grouped total.

This is important because it preserves:

- accurate history
- separate notes per package
- separate quantities per package
- cleaner one-tap removal

### Take Out Flow

From list or detail view, user taps `Take out`.

Behavior:

- item status changes from `in_freezer` to `taken_out`
- item disappears from default active inventory view
- removal timestamp is stored
- optional undo snackbar for a few seconds

## Search Requirements

Search must work across:

- category
- cut
- notes
- quantity text representation

Search behaviors:

- instant filtering while typing
- case-insensitive
- partial matches
- default scope is active inventory only

Useful filters for MVP:

- category
- status: in freezer / taken out
- sort by newest / oldest

## Data Model

### FreezerItem

- `id`
- `status` (`in_freezer` | `taken_out`)
- `category`
- `cut`
- `quantity_type` (`weight` | `packs` | `pieces`)
- `quantity_value`
- `quantity_unit`
- `notes`
- `frozen_at`
- `taken_out_at`
- `created_at`
- `updated_at`

### Preset

- `id`
- `category`
- `cut`
- `default_quantity_type`
- `default_quantity_value`
- `default_quantity_unit`
- `label`
- `last_used_at`
- `use_count`

## Data Rules

- `status` defaults to `in_freezer`
- `notes` is optional
- `taken_out_at` is `null` until the item is removed
- `updated_at` changes on create, edit, take out, and restore
- preset `label` can be auto-generated from category, cut, and quantity

## Core Flows

### Add Item

1. User taps `Add item`
2. User selects category
3. User selects cut
4. User enters quantity
5. User optionally adds note
6. User saves
7. App stores the item locally and shows repeat options

### Take Out Item

1. User finds the item from home search or inventory list
2. User taps `Take out`
3. App updates status immediately
4. Item leaves active inventory view
5. Undo remains available briefly

### Repeat Recent Item

1. User taps a recent or preset chip
2. App opens a prefilled save flow
3. User tweaks quantity if needed
4. User saves in one or two taps

## Suggested MVP Tech Stack

- React
- TypeScript
- Vite
- `vite-plugin-pwa`
- IndexedDB via Dexie
- lightweight CSS system or Tailwind if implementation speed matters

## Offline Requirements

- app shell available offline after first load
- add, edit, search, and take-out actions work fully offline
- data stored locally in IndexedDB
- no backend required for MVP

## PWA Requirements

- installable on Android and iPhone-supported browsers where possible
- app manifest with name, icons, theme color, and standalone mode
- service worker caches shell assets
- clear offline-ready state after first successful install/cache

## Backup Requirements

MVP should include manual backup safeguards:

- export all data to JSON
- import data from JSON

This keeps the app useful without building auth or sync too early.

## Functional Requirements

### Required for MVP

- create freezer item via guided flow
- view active inventory list
- search inventory
- filter by category
- mark item as taken out
- view recent items and quickly add same combination again
- offline support
- installable PWA behavior
- JSON export and import
- edit note after creation
- view taken-out items through a history filter or dedicated view

### Nice to Have if Time Allows

- favorites or pinned presets
- freezer drawer/location field
- bulk delete for taken-out history
- low-stock reminders for favorite items

## Success Metrics

- user can add an item in fewer than 5 taps
- at least 80 percent of entries can be created without typing notes
- search results appear in under 100 ms on normal mobile datasets
- app remains fully usable with no network connection

## Risks

- too many required fields will kill adoption
- forcing only weight-based quantity will not match real household behavior
- over-grouping inventory may make removal and notes awkward
- delayed PWA/offline setup can create architecture rework later

## Open Product Decisions

- whether to support non-meat freezer items in MVP or keep the scope meat-first
- whether history should be visible by default or hidden under a separate view
- whether presets are auto-generated from recent usage only or can also be manually pinned

## Acceptance Criteria

### Add Item

- user can create a new item from category selection to saved state without network access
- quantity entry supports weight, packs, and pieces
- note field is optional and searchable after save

### Search and Inventory

- search returns matching active items by category, cut, or note
- list updates while typing without explicit submit
- take-out action is available directly from the list

### Offline and Storage

- previously loaded app shell opens without internet
- created items persist after app restart
- exported JSON can be imported into a clean install and restore all items

## Recommended Build Order

1. bootstrap Vite React TypeScript app
2. add PWA manifest and service worker
3. create IndexedDB schema with Dexie
4. build add-item step flow
5. build inventory list and search
6. add take-out action and history state
7. add recent items / quick repeat
8. add export / import

## v1.1 / v2 Roadmap

- pinned favorites and manually managed presets
- freezer drawer or compartment location
- expiry age indicators
- barcode scan or label OCR
- multi-device household sync
- shopping suggestions from repeated take-outs

## MVP Definition of Done

- app installs as a PWA
- app works offline after first load
- a user can add, search, and remove freezer items on mobile
- inventory survives reloads via local storage layer
- export/import backup works

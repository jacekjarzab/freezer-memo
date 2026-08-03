# Changelog

## v1.3 - 2026-08-03

- Added freezer selection for inventory items with `Home`, `Basement`, and `Away` options in the guided add flow.
- Added freezer location editing and a location badge on inventory cards.
- Added IndexedDB schema v3 and backup import normalization so older items without a freezer location default to `Home`.

## v1.2 - 2026-08-03

- Added pinned presets for frequently repeated freezer entries, including pin, unpin, and one-tap use flows.
- Added IndexedDB schema v2 and versioned JSON backups; v1 item-only backups remain importable.
- Added validation that prevents duplicate or invalid imported presets.
- Added take-out undo feedback and clearer local-storage error handling.
- Added regression coverage for inventory search, backups, and presets.
- Split the UI into focused add, inventory, edit, and backup components for safer maintenance.

## v1.1 - 2026-08-03

- Tightened the add flow layout for mobile.
- Made inventory cards denser and easier to scan.
- Added category meat icons.
- Removed the freezer status pill from inventory cards.
- Moved the quantity badge into the title row.
- Kept inventory actions compact and inline.

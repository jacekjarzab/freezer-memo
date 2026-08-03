# Changelog

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

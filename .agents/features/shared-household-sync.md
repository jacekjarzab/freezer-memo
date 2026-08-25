# Shared Household Sync

## Goal

Allow a family to use the same freezer inventory from multiple mobile PWAs while preserving the app's current offline-first behavior and local-only mode.

## Confirmed MVP Decisions

- Backend: Supabase Free tier as the single hosted backend.
- Authentication: persistent magic-link sign-in.
- Membership: one household per account; owner-created invite links with expiry and revocation; owners can remove other members but cannot remove themselves.
- Shared data: freezer inventory only. Presets remain device-local for this release.
- Sync model: IndexedDB remains the local cache and durable offline outbox.
- Conflict policy: server-issued revisions with deterministic last-write-wins per item; retain deletion tombstones.
- Rollout: opt-in "Shared household" entry point; existing local-only users keep their data until migration is explicitly confirmed.
- Out of scope: multiple household switching, granular roles, audit history, per-field conflict resolution, guaranteed background sync, and admin tooling.

## Implementation Checklist

- [x] Record the MVP decisions and sync semantics in an ADR.
- [x] Add a Supabase migration for profiles, households, household_members, household_invites, freezer_items, and idempotent inventory mutations.
- [x] Add Row Level Security so reads and writes require active household membership; never ship service-role credentials to the PWA.
- [x] Add a `src/lib/sync/` domain boundary for auth, remote storage, connectivity, mutation queue, and conflict resolution.
- [x] Extend the Dexie schema with household identity, sync metadata, deleted-at tombstones, server version, last-synced time, and a durable outbox.
- [ ] Preserve local-first writes and route item create, edit, take-out, restore, and delete operations through repository commands that append idempotent outbox mutations.
- [ ] Implement pull by server cursor, idempotent push with mutation UUIDs, retry handling, and realtime or foreground refresh after remote changes.
- [x] Build create-household, sign-in, invite copy/revoke, invite acceptance, owner member removal, and account recovery UI.
- [x] Add English and Polish translations for implemented household and account-recovery flows.
- [ ] Handle expired or revoked invites, duplicate joins, offline invite acceptance, lost membership, invalid migration state, rejected writes, tombstone retention, and export/retry recovery.
- [x] Test Dexie migrations and outbox ordering/idempotency/conflicts and Supabase RLS/RPC boundaries, including owner removal and post-removal access denial.
- [ ] Test two-device offline/reconnect scenarios after App-level orchestration exists.
- [ ] Roll out behind the opt-in entry point, monitor sync failures and rejected mutations, retain JSON export as recovery, and run `npm run test`, `npm run lint`, and `npm run build` before release.

## Acceptance Gates

- Two invited phones see added, edited, and taken-out inventory within the realtime or refresh window.
- Offline changes survive reload and reconcile after reconnect without duplicate records or data loss.
- A household member cannot read or write another household through direct backend requests.
- A removed household member immediately loses hosted read/write access while retaining their local inventory.
- Existing local-only users retain their inventory until they explicitly opt into household migration.

## Delivery Estimate

- Online-only sharing: 5-8 engineering days.
- Recommended offline-first inventory-only MVP: 8-12 engineering days.
- Full recovery, roles, audit trail, and conflict UI: 3-5 weeks.

## Risks

The main risk is concurrent offline edits, especially take-out versus edit. The MVP uses append-safe item records, server revisions, and last-write-wins; a full merge or audit model should wait for observed usage.

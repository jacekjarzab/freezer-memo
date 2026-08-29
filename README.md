# freezer-memo

Offline-first PWA for tracking what's in the freezer with fast, low-friction inventory entry.

## Current Scaffold

- React + TypeScript + Vite
- installable PWA via `vite-plugin-pwa`
- local persistence with IndexedDB through Dexie
- English and Polish UI from day one
- starter guided add flow, searchable inventory, quick repeat, and take-out / restore actions

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Optional shared household mode

Shared mode uses the browser Supabase client with the public anon key only. Configure these Vite variables before building:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never put a Supabase service-role key in `.env`, browser code, or deployed static assets. Apply all migrations in `supabase/migrations/` to the project before enabling shared mode. Inventory writes remain local-first; after explicit migration, mutations are queued in the durable outbox and synchronized during foreground, focus, or reconnect refreshes. Presets remain device-local.

## Remaining Shared Sync Work

- validate two-device offline/reconnect behavior on real devices
- finish recovery handling for invite, membership, migration, rejected-write, and tombstone edge cases
- complete production rollout, monitoring, and release smoke validation

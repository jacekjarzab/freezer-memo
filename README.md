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

Never put a Supabase service-role key in `.env`, browser code, or deployed static assets. Apply `supabase/migrations/20260819040000_shared_household_sync.sql` to the project before enabling shared mode. Local-only inventory writes remain local until an explicit migration and atomic outbox workflow are implemented.

## Next Build Steps

- split the guided add flow into step screens/cards optimized for one-handed mobile use
- add edit item details and JSON export/import
- improve search and filtering for larger freezer inventories

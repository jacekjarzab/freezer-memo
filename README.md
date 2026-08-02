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

## Next Build Steps

- split the guided add flow into step screens/cards optimized for one-handed mobile use
- add edit item details and JSON export/import
- improve search and filtering for larger freezer inventories

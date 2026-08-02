# AGENTS.md

- Single Vite app. The runtime entry is `src/main.tsx`, which loads `src/lib/i18n.ts` before rendering `src/App.tsx`.
- The app is local-first only: IndexedDB/Dexie state lives in `src/lib/db.ts`; JSON backup import/export lives in `src/lib/backup.ts`; there is no backend in this repo.
- Catalog keys are defined in `src/data/catalog.ts`. UI labels and searchable catalog text come from `src/lib/i18n.ts`, so keep `en` and `pl` translations in sync when changing categories, cuts, or user-facing copy.
- `npm run build` is the real verification step (`tsc -b && vite build`). `npm run lint` runs `oxlint`. There is no separate test script.
- PWA behavior comes from `vite.config.ts` via `vite-plugin-pwa`; build output goes to `dist/`.
- Production deploy is GitHub Actions on push to `main`: Node 22, `npm ci`, `npm run build`, then FTP deploy of `dist/` from `.github/workflows/deploy-production.yaml`.
- Keep `.agents/backlog-checklist.md` updated when scope or status changes.

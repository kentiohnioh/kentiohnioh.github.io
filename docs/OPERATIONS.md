# Operations & Publishing Guide

## Local Development
- Public site preview: `npm start` (or `ng serve`)
- Admin studio (local only): `npm run start:admin` (or `ng serve --configuration admin`)

## Build & Validation
- Public production build: `npm run build`
- Admin local build: `npm run build:admin`
- Production bundle verification: `node scripts/verify-bundle.mjs`
- Catalog schema check: `node scripts/validate-catalog.mjs`

## Security & Secrets
- No tokens (Hugging Face write tokens, GitHub PAT) are ever saved to disk, `.env`, `localStorage`, or `IndexedDB`.
- Tokens exist in memory only during active publishing sessions and are wiped on browser tab unload.

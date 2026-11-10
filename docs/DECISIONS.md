# Architectural & Technical Decisions Log

This document records key decisions, deviations, and rationale per Rule 13 of the Project Constitution.

## 2026-11-10: Framework & Zoneless Setup
- **Decision**: Adopt Angular 21.2.13 with native `provideZonelessChangeDetection()`.
- **Rationale**: Zoneless is fully stable in Angular 21. Eliminates `zone.js` runtime overhead, reduces initial bundle size, and simplifies async reactivity with signals.

## 2026-11-10: Build Configuration Isolation for Admin
- **Decision**: Segregate public production build from admin studio at compile time using Angular application builder configuration (`environment.adminEnabled = false`) and separate route configurations (`app.routes.ts` vs `app.routes.admin.ts`).
- **Rationale**: Satisfies Rule 8 ("Admin is never shipped"). Even with lazy routes, dynamic imports can be detected and bundled into split chunks if referenced in the same routing graph. Distinct route sets guarantee that `@mediapipe`, WASM encoders, and publisher logic are 100% physically absent from public `dist/`.

## 2026-11-10: Zero-Dependency Schema Validation
- **Decision**: Hand-crafted functional TypeScript schema validators for catalog models and migrations.
- **Rationale**: Keeps the public runtime bundle ultra-lean (under the 180 KB gzip budget) without introducing heavy external validation dependencies, while offering custom error telemetry and privacy guarantees (e.g. automatic GPS coordinate masking when set to 'hidden').

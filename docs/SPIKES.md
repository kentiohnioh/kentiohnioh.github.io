# Spikes & Experimental Verification

Records small spikes and API verifications per Rule 1.

## 2026-11-10: Angular 21 Zoneless Provider
- **Verification**: Verified `@angular/core` exports `provideZonelessChangeDetection`.
- **Command**: `ng new ... --zoneless` generated `app.config.ts` with `provideZonelessChangeDetection()`.
- **Result**: Success. Zoneless is now active across all components.

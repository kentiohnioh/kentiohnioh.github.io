# Contributing & Architectural Standards

Thank you for contributing to Theng Nioh's personal photography portfolio. To maintain the highest standards of code quality, performance, and accessibility, all contributions must adhere to the following principles.

---

## 1. Non-Negotiable Standards

1. **Verify, Do Not Recall**:
   - Before using any third-party or Angular API, verify its signature against official documentation or type definitions.
   - Run `ng version` and check versions before updating dependencies.
2. **No Placeholders**:
   - No `TODO`, no empty stubs, no `implement later`, and no mock data presented as real. Every feature must work end-to-end or be hidden behind a clearly documented feature flag.
3. **Small, Single-Purpose Files**:
   - Target under 400 lines per file.
   - Separate pure mathematical algorithms into framework-free TypeScript files (`src/app/core/utils/`) so they can be unit-tested without framework overhead.
   - GLSL shaders reside in separate `.glsl` files.
4. **Modern Angular Only**:
   - Standalone components only.
   - Zoneless change detection (`provideZonelessChangeDetection()`).
   - Signals for all reactive state (`signal`, `computed`, `effect`, `linkedSignal`).
   - `ChangeDetectionStrategy.OnPush` on all components.
   - Built-in control flow (`@if`, `@for`, `@switch`).
   - `inject()` function for dependency injection.
   - Strict TypeScript: no `any`, no non-null assertions without explanatory comments.
5. **Privacy by Default**:
   - Photo processing happens entirely in the visitor's browser.
   - Zero analytics or third-party tracking scripts.
   - Tokens (Hugging Face, GitHub) live in memory only and are never saved to localStorage, IndexedDB, or Git.

---

## 2. Definition of Done (DoD)

Before submitting any Pull Request:
1. `npm test` passes 100% of unit tests with zero failures.
2. `npm run build` succeeds with zero unjustified warnings.
3. `npm run build:admin` succeeds cleanly.
4. `npm run verify:bundle` passes (verifies zero admin leakage in public dist).
5. `npm run validate:catalog` passes schema validation.
6. `npm run scan:secrets` passes with zero leaked keys or tokens.
7. Any scope deviation or architectural rationale is recorded in `docs/DECISIONS.md`.

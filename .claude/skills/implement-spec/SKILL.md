---
name: implement-spec
description: Audit the codebase against README.md and spec.md, identify gaps or discrepancies, and implement missing features or fix inconsistencies. Use when the spec describes something that the code doesn't implement yet.
user-invocable: true
---

Audit the current codebase against `README.md` and `SPEC.md` to find gaps, then implement what's missing or fix what's inconsistent.

## Steps

### Phase 1: Audit

1. Read `README.md` and `SPEC.md` thoroughly. Extract every concrete claim:
   - Features listed
   - API endpoints and their behavior
   - UI panels, pages, and their functionality
   - Configuration options and environment variables
   - Authentication methods
   - Security guarantees
   - Error handling behavior
   - i18n coverage

2. For each claim, verify it against the actual code:
   - `src/server/routes/` — do all documented API endpoints exist and behave as described?
   - `src/server/adapters/` — do adapters implement all documented methods?
   - `src/server/config.ts` — are all documented env vars supported?
   - `src/server/auth/` — do auth methods match documentation?
   - `src/client/App.tsx` — do all documented routes/panels exist?
   - `src/client/components/` — do UI components match documented behavior?
   - `src/client/lib/api.ts` — does the client API match documented endpoints?
   - `src/client/i18n/en.json` and `zh.json` — are all documented features translated?
   - `.env.example` — does it list all documented variables?

3. Produce a gap report listing:
   - **Missing**: documented but not implemented
   - **Inconsistent**: implemented differently than documented
   - **Undocumented**: implemented but not in docs (note these but do NOT remove them)

### Phase 2: Implement

4. For each **Missing** item, implement it in the codebase following existing patterns and conventions.

5. For each **Inconsistent** item, fix the code to match the spec. If the spec is clearly wrong (e.g., references a non-existent API), fix the spec instead and note the change.

6. After implementation:
   - Run `npx tsc -b tsconfig.app.json --noEmit` to verify type-checking passes
   - Run `npx vitest run` to verify unit tests pass
   - Fix any test failures caused by the changes
   - Add new tests for newly implemented features where appropriate

7. Present a summary of all changes made.

### Scope control

- If $ARGUMENTS is provided, only audit and implement the specified area (e.g., "API endpoints", "admin panel", "i18n", "auth").
- Do NOT refactor or improve code beyond what's needed to match the spec.
- Do NOT add features not described in the spec.
- Do NOT modify README.md or SPEC.md unless they contain a clear factual error about the API or platform (e.g., wrong endpoint path).

$ARGUMENTS

---
name: update-docs
description: Update README.md and spec.md to reflect the current state of the codebase. Use when code has changed and documentation needs to be brought up to date.
user-invocable: true
---

Update `README.md` and `spec.md` (aka `SPEC.md`) to accurately reflect the current codebase. Do NOT rewrite from scratch — preserve the existing structure and only update sections that are out of date.

## Steps

1. Read the current `README.md` and `SPEC.md` files.
2. Examine the codebase to identify what has changed:
   - Check `src/server/routes/` for API endpoints
   - Check `src/server/adapters/types.ts` for the adapter interface
   - Check `src/server/config.ts` for configuration options
   - Check `src/client/App.tsx` for routes/panels
   - Check `src/client/components/` for UI components
   - Check `src/client/lib/api.ts` for client API methods
   - Check `src/client/i18n/en.json` for feature labels
   - Check `.env.example` for environment variables
   - Check `src/server/auth/azure-credential.ts` for auth methods
   - Check the project file structure for new/removed files
3. Update **only the sections** in README.md and SPEC.md that are inaccurate or incomplete:
   - Features list
   - Configuration / environment variables table
   - API routes / endpoints
   - UI panels / pages
   - File structure tree
   - Authentication methods
   - Security considerations
   - Development phases (mark new work as complete)
   - Tech stack (if changed)
   - API reference tables (Azure and OpenAI endpoint paths)
4. Do NOT add new sections unless a major new feature area was introduced.
5. Do NOT remove sections — update them or mark features as removed/deprecated if applicable.
6. Keep the same markdown style and formatting conventions already used in each file.
7. After updating, verify there are no stale references to removed features or incorrect endpoint paths.

$ARGUMENTS

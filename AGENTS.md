# Repository Guidelines

## Project Structure & Module Organization
- Next.js 14 App Router with strict TypeScript lives in `src/app/[locale]`; mirror pages for `it` and `en`.
- Feature areas reside in `src/features`; shared UI sits in `src/components` and `src/components/ui` (shadcn).
- Shared logic is grouped in `src/libs`, `src/utils`, and `src/models`; migrations live in `/migrations`.
- Localized copy belongs in `src/locales/{it,en}.json`; keep tests in `tests` or co-located `*.test.ts[x]`.
- Prima di scrivere codice, consulta sempre la documentazione aggiornata in `docs` per pattern, checklist e note di sicurezza.

## Build, Test, and Development Commands
- `npm run dev` starts the app (requires `.env.local` from the README template).
- `npm run lint`, `npm run format:check`, and `npm run typecheck` must pass before sharing work.
- `npm test` runs Vitest/RTL; `npm run test:e2e` executes Playwright; `npm run build` is the release gate.
- Database helpers: `npm run db:generate`, `npm run db:migrate`, and `npm run seed:admin` (set env overrides per run).

## Coding Style & Naming Conventions
- Use the repo ESLint/Prettier settings; avoid disabling rules without discussion.
- Prefer server components; add `"use client"` only when interactivity demands it.
- Tailwind utilities first, existing shadcn variants second, bespoke CSS last.
- Naming: components `PascalCase.tsx`, hooks `useName.ts`, utilities `kebab-case.ts`.
- Always load UI strings through `next-intl`; add keys to both `it` and `en`.

## Testing Guidelines
- Cover new logic with deterministic Vitest cases; mock network, time, and storage as needed.
- Extend Playwright specs when flows span navigation, RBAC, or locale switching.
- Update snapshots or locale assertions for both languages.
- Run `npm test && npm run test:e2e && npm run build` locally before requesting review.

## Commit & Pull Request Guidelines
- Write imperative, scope-prefixed commits (e.g., `auth: refresh session role`).
- PRs should list problem, solution, and impacts on i18n, RBAC, schema, or privacy.
- Provide verification steps and screenshots for UI work; keep diffs focused.
- Double-check that no secrets, production URLs, or personal data are committed.

## Security & Configuration Tips
- Diary content stays encrypted client-side; never ship server decryption.
- Enforce role checks for `user`, `professional`, and `admin` on new routes/actions.
- Keep secrets in environment variables and document new settings in the README.
- Ask for review early if a change touches authentication, privacy, or external vendors.

# Project Agents.md Guide for OpenAI Codex

This **Agents.md** file provides clear guidance for **OpenAI Codex** and other AI agents working on this repository.
Codex **must read this file and the README** before proposing any change.

---

## 0) Repository Intent

- Full-stack web app (Next.js 14 App Router + TypeScript strict, Tailwind, shadcn/ui).
- Authentication: NextAuth (Auth.js) + Drizzle ORM + Postgres (Neon).
- i18n: `next-intl` with locale-aware routes (`/it`, `/en`).
- RBAC: `user`, `professional`, `admin`.
- Journal/Diary with optional **client-side E2EE**; **shared notes are NOT E2EE**.
- Emphasis on **privacy**, **small atomic PRs**, **tests**, and **no vendor lock-in**.

If Codex is unsure, open an Issue/PR draft with questions instead of guessing.

---

## 1) Project Structure for OpenAI Codex Navigation

Codex should treat these folders as primary:

```
/src
  /app/[locale]/...      # Next.js App Router (i18n-aware pages & routes)
  /components            # Shared UI
  /components/ui         # shadcn/ui wrappers
  /features              # blog, diary, vocabulary, tests, services, admin, pro
  /libs                  # auth, db, i18n, sentry, logger, rate-limit
  /locales               # i18n message catalogs (it.json, en.json)
  /models                # Drizzle schema & relations
  /styles                # Tailwind globals
  /templates             # email & UI templates
  /utils                 # helpers & types
/migrations              # Drizzle migrations
/public                  # static assets
/tests                   # unit, integration, e2e
```

Do **not** modify `/public` binaries or auto-generated files in PRs unless explicitly requested.

---

## 2) Coding Conventions for OpenAI Codex

### General
- **TypeScript only** for new code. Keep `strict` types passing.
- Keep components **small & focused**. Prefer functional components and hooks.
- Adhere to existing **ESLint/Prettier** rules and **import aliases** `@/*`.
- Use **Tailwind** utilities; use raw CSS only if necessary (co-located).

### Next.js App Router
- Use **server components** by default; switch to client components only when needed (`"use client"`).
- Data-fetching: use server actions/route handlers; avoid client-side secrets.

### shadcn/ui
- Wrap components in `/components/ui`; keep **consistent variants** and **dark:** classes.

### Naming & Files
- Components: `PascalCase.tsx`
- Hooks: `useX.ts`
- Utilities: `kebab-case.ts`
- Tests: `*.test.ts` / `*.test.tsx` adjacent or under `/tests`.

---

## 3) Internationalization (i18n) Rules

**Never hardcode UI strings.** Codex must:
- Add/modify strings via message catalogs in `/src/locales/{it,en}.json`.
- Reference messages with the existing i18n helpers (e.g., `useTranslations()`).
- When adding a key, provide entries for **all supported locales** (`it`, `en`) with sensible placeholders.
- Preserve existing **route grouping by locale** under `app/[locale]/...`.
- Update snapshots/e2e tests that assert localized text.

PRs containing new UI text without i18n keys will be rejected.

---

## 4) Security & Privacy Rules

- **Do not process E2EE content on the server.** E2EE notes decrypt only client-side; shared notes are explicitly de-E2EE’d before upload.
- **RBAC guardrails**:
  - `professional` can only read **resources shared with them**.
  - `admin` manages roles and content; must not bypass E2EE or see private keys.
- **No secrets in code, logs, or fixtures.** Use environment variables documented in README.
- Sanitize user input with existing Zod schemas where applicable.
- Add **audit logging** for professional access paths already instrumented; never log sensitive text.

---

## 5) Testing Requirements for OpenAI Codex

Codex must keep all checks green:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test           # unit + RTL
npm run test:e2e   # Playwright (when applicable)
npm run build
```

- Add/adjust tests for new behavior (unit and, when UI changes, e2e).
- Keep tests deterministic and independent from network calls (mock where needed).

---

## 6) Pull Request Guidelines for OpenAI Codex

Each PR must be **small and single-purpose**:

**Title**
```
<scope>: <imperative summary>
```

**Description must include**
1. **Problem → Solution** (1–3 sentences).
2. **Impact**: i18n, SEO, security, schema/migrations.
3. **How to test**: exact steps/commands.
4. **Screenshots** for UI changes.
5. **Checklist** (below) pasted and ticked.

**Do not** bundle unrelated refactors with feature/bugfix PRs.

---

## 7) Pre-Flight Checklist (Codex must tick before committing)

- [ ] I read **README.md** and this **AGENTS.md**; I’m not violating project rules.
- [ ] No **hardcoded UI strings**; i18n keys updated **for all locales**.
- [ ] Lint/format/typecheck/tests all **pass locally**.
- [ ] No secrets, tokens, or private URLs in code, tests, or commit messages.
- [ ] RBAC respected; routes/handlers/gates added where necessary.
- [ ] Migrations provided (if schema changed) with clear **rollback notes**.
- [ ] Docs updated (README/feature docs/changelog snippets), including any new env vars.

---

## 8) Programmatic Checks for OpenAI Codex

Codex must run these before creating a PR:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

CI will block merge if any of the above fails.

---

## 9) Task Workflow for Codex

1. **Reconnaissance**
   - Read: `README.md`, `AGENTS.md`, `CONTRIBUTING.md` (if present), configs in root.
   - Produce a short **Plan** (5–10 bullets) listing files to touch and risks.

2. **Implement in small steps**
   - Granular commits with brief rationale in the message.
   - If touching DB: add **Drizzle migration** and update types.

3. **Verify**
   - Run all **pre-flight commands**.
   - Update tests and locales.

4. **Open PR**
   - Fill the PR template and include the **Checklist** ticked.

---

## 10) Common Pitfalls Codex Must Avoid

- Adding strings directly into components (breaks i18n).
- Introducing server-side reads of E2EE content.
- Skipping RBAC checks on routes or loaders.
- Refactoring unrelated files within a feature PR.
- Changing Tailwind/shadcn patterns without updating docs and affected components.
- Forgetting to update **both** `it` and `en` catalogs.
- Breaking the repo’s “four-backtick outer block” convention in long Markdown docs with nested code fences.

---

## 11) Example Scenarios (What Codex Should Do)

### A) New UI copy on a page
- Add i18n keys to `/src/locales/{it,en}.json`.
- Use `useTranslations()` in the component.
- Add/update tests asserting translated text.
- Run pre-flight commands; open PR with screenshots.

### B) Add “Professional” area navigation link (role-gated)
- Add secure server-side gate (middleware/loader).
- Conditionally render the nav item for `professional`.
- Add e2e test (non-professional should not see/access).
- Keep texts localized.

### C) Implement “Word of the Day” cron consumer (if not present)
- Use existing job/cron utilities; avoid new vendors.
- Upsert deterministic pick; i18n when rendering.
- Add unit tests; document env usage if any.

---

## 12) When Codex Must Ask Before Proceeding

- Adding a new external dependency or paid service.
- Changing authentication/session or database schema shape across core tables.
- Altering security-sensitive routes, CSP, or cookie policies.
- Removing or bypassing i18n, E2EE, or RBAC safeguards.

Open a **Draft PR** labeled “Proposal” with rationale and alternatives.

---

## 13) References for Codex

- **README.md** (project overview, env, scripts)
- **This AGENTS.md** (rules for agents)
- CI configuration (`.github/workflows/*`) and lint/format configs
- Security notes (CSP, rate-limit, logging) in README
- i18n catalogs (`/src/locales/*.json`)

---

## 14) Contact / Ownership

- Code owners/reviewers listed in `.github/CODEOWNERS` (if present).
- For security concerns, follow the process in `SECURITY.md` (if present).

---

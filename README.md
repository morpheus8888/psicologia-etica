# Psicologia Etica — Full-Stack SaaS Boilerplate (Next.js + Tailwind + shadcn/ui)

> Un boilerplate production-ready pensato per un’app editoriale/clinica con:
> - **Diario/Journaling** (opzione E2EE lato client; editor “Scribbly” adattato allo stack)
> - **Vocabolario Psicologico** (con “Parola del Giorno”)
> - **Blog**
> - **Test lunghi** (salvataggio e ripresa)
> - **Catalogo Servizi**
> - **Pannello Admin** (CRUD e gestione utenti/ruoli)

Costruito su **Next.js + Tailwind + shadcn/ui** e impostato per evitare lock-in: **Auth.js (NextAuth)**, **Drizzle ORM**, **Postgres (Neon via Vercel Storage)**. Si parte gratis su Vercel e si scala senza rework.

---

## Sommario

- [Caratteristiche principali](#caratteristiche-principali)
- [Differenze chiave rispetto all’upstream](#differenze-chiave-rispetto-allupstream)
- [Architettura](#architettura)
- [Moduli & Pagine](#moduli--pagine)
- [RBAC & Ruoli](#rbac--ruoli)
- [Internationalization (next-intl)](#internationalization-next-intl)
- [Prerequisiti](#prerequisiti)
- [Environment Variables](#environment-variables)
- [Getting Started (local)](#getting-started-local)
- [Database & Migrazioni (Drizzle)](#database--migrazioni-drizzle)
- [Autenticazione (NextAuth)](#autenticazione-nextauth)
- [Dark Mode](#dark-mode)
- [Sicurezza & Privacy](#sicurezza--privacy)
- [Testing](#testing)
- [Build & Deploy (Vercel)](#build--deploy-vercel)
- [Osservabilità & Monitoraggio](#osservabilità--monitoraggio)
- [PWA (post-MVP)](#pwa-post-mvp)
- [Script NPM](#script-npm)
- [Personalizzazione rapida](#personalizzazione-rapida)
- [Note sul template di origine](#note-sul-template-di-origine)
- [Licenza](#licenza)

---

## Caratteristiche principali

- **Next.js 14 (App Router) + TypeScript (strict)**
- **Tailwind CSS + shadcn/ui** (wrapper dei componenti in `src/components/ui/*`)
- **Dark Mode** con `next-themes` e preferenza persistita
- **Auth**: NextAuth (Auth.js) con adapter Drizzle
  - MVP: credenziali; estendibile a OAuth/Passkeys/Magic Link
  - **RBAC**: `user` / `professional` / `admin`
- **Database**: Postgres (**Neon**); **Drizzle ORM**
- **i18n**: `next-intl` con routing localizzato (`/it`, `/en`)
- **Email transazionali**: Resend + react-email (verify, reset password, notifiche)
- **Newsletter**: Substack (embed + ingestion RSS)
- **SEO**: metadata, Open Graph, sitemap, robots
- **Testing**: Vitest + React Testing Library (unit), Playwright (integration/E2E)
- **Osservabilità**: Sentry (Spotlight in dev; DSN prod)
- **Tooling**: ESLint, Prettier, Husky, lint-staged, Commitlint, Commitizen
- **Extras**: Storybook (UI), `@next/bundle-analyzer`, Drizzle Studio
- **Sicurezza**: CSP, rate-limit opzionale (Upstash)
- **CI/CD**: GitHub Actions pronto per test/lint/build
- **Logging**: logger pluggable; integrazione **Better Stack** opzionale
- **Monitoring as Code**: **Checkly** opzionale
- **Alias import**: `@/*`
- **PWA**: Serwist (da abilitare post-MVP; cache solo risorse pubbliche)

---

## Differenze chiave rispetto all’upstream

Questo fork/modello rimuove o sostituisce parti dell’upstream per aderire allo use case clinico/editoriale:

- **Clerk → NextAuth (Auth.js)** con adapter Drizzle.
- **Niente multi-tenancy/teams** nell’MVP (potrà rientrare in roadmap).
- **DB**: **Neon (Postgres)** via Vercel Storage (con Drizzle ORM).
- **Dominio clinico**: Diario con **E2EE opzionale** lato client e **condivisione selettiva** con **professionisti** (le note condivise non sono E2EE).
- **Stripe/Abbonamenti**: predisposti come integrazione futura, **non** richiesti nell’MVP.
- **“Pro table”, sponsor e banner** dell’upstream: esclusi per mantenere il focus sul prodotto.

---

## Architettura

- App Router sotto `src/app/[locale]/…` per routing locale-consapevole
- Feature verticali in `src/features/*` (blog, diary, vocabulary, tests, services, admin, pro)
- Librerie in `src/libs/*` (auth, db, i18n, sentry, logger, rate-limit)
- Modelli/Schema in `src/models/*` (Drizzle)
- UI condivisa in `src/components/*` + `src/components/ui/*` (shadcn/ui wrappers)
- Templates in `src/templates/*` (email/UI)
- Utilità in `src/utils/*`

```text
.
├─ src/
│  ├─ app/                # App Router (i18n-aware)
│  ├─ components/         # Shared UI + shadcn wrappers
│  ├─ features/           # blog, diary, vocabulary, tests, services, admin, pro
│  ├─ libs/               # auth, db, i18n, sentry, logger, rate-limit
│  ├─ locales/            # it.json, en.json
│  ├─ models/             # Drizzle schema + relations
│  ├─ styles/             # Tailwind globals
│  ├─ templates/          # email + UI templates
│  └─ utils/              # helpers e tipi
├─ migrations/            # Drizzle migrations
├─ public/                # Static assets
├─ tests/                 # unit, integration, E2E
└─ README.md
```

---

## Moduli & Pagine

### Home Pubblica
- Header: Blog, Vocabolario, Test, Servizi, (Search opz.), Login/Avatar
- Sezioni:
  - **Blog**: ultimi 3–6 post + “View all”
  - **Vocabolario**: “Parola del Giorno”, Browse, Search
  - **Test**: avvio/ripresa test
  - **Servizi**: card con CTA

### Auth (NextAuth + Drizzle)
- Provider **credentials** (MVP), estendibile a OAuth/Passkeys/Magic Link
- **RBAC**: `user` / `professional` / `admin` (menu e pagine sensibili condizionate dal ruolo)
- Sessione server-side; cookie sicuri; **CSRF** secondo default Auth.js

### Area Utente (autenticata)
- **Diario/Journaling**
  - Editor tipo Scribbly integrato con NextAuth + Drizzle + Postgres
  - **E2EE opzionale (client-side)** per note private
  - Vista calendario + lista
  - **Condivisione selettiva con professionisti**: l’utente sceglie cosa condividere e con chi
    - Le note **condivise** non sono E2EE (decrittate client-side prima dell’invio)
    - L’utente può **revocare** in qualunque momento la condivisione

- **Profilo**
- **Test**: elenco con stati “In corso/Completati”

### Area Professionista (ruolo: professional)
- **Inbox Condivisioni**: elenco note/diari ricevuti in condivisione dai clienti
- **Dettaglio cliente**: pannello lettura note condivise, storico, eventuali tag/commenti (non invasivi)
- **Roadmap**: messaggistica sicura, appuntamenti, prescrizioni di esercizi/compiti

### Admin Panel (ruolo: admin)
- **Gestione Utenti**
  - Promozione/democrazia ruoli: `user` ⇄ `professional`
  - Blocco/sblocco account (soft lock)
- **Blog**: create/edit/publish (title, slug, tags, excerpt, cover)
- **Vocabolario**: CRUD (lemma, shortDef, longDef, etymology, tags[])
- **Parola del Giorno**: selezione manuale o fallback automatico

### Blog
- List: `/[locale]/blog`
- Detail: `/[locale]/blog/[slug]`
- Tag + search (client/server in base al carico)
- Teaser in Home

### Vocabolario Psicologico
- Contenuti come MDX tipizzati (`content/vocab/*.mdx`)
- Schema contenuti (lemma, shortDef, longDef, etymology, tags[])
- **Ricerca client-side** con MiniSearch (ok fino a qualche migliaio di voci)
- Pagine:
  - List: `/[locale]/vocabulary` con A–Z, tag filter, search
  - Detail: `/[locale]/vocabulary/[slug]`
- **Parola del Giorno**:
  - Se impostata da admin, usa quella
  - Altrimenti selezione deterministica o **Vercel Cron** che persiste la scelta nel DB

### Test
- Form lunghi con **save/resume**
- **Zod** per validazione + **React Hook Form**
- **Roadmap**: export PDF e/o invio email di sintesi

### Servizi
- Card marketing con descrizioni + CTA (booking/contatto)
- **Futuro**: Stripe subscriptions (non necessario per l’MVP)

---

## RBAC & Ruoli

**Ruoli disponibili**
- `user`: utente standard (crea diario, test, profilo)
- `professional`: professionista abilitato a **vedere i contenuti condivisi** dai clienti e ad accedere alla **Pro Area**
- `admin`: gestione sistema e contenuti, **assegna/revoca ruolo** `professional`

**Assegnazione ruolo “professional”**
- Dall’**Admin Panel → Gestione Utenti** l’admin può promuovere un account `user` a `professional` (e viceversa).
- L’azione aggiorna il campo `role` dell’utente nel DB (Drizzle).

**Controllo accessi**
- **Server-side**: middleware/handlers di protezione route (es. `requireRole('professional')` per la Pro Area)
- **Client-side**: gating UI (voci di menu/pagine rese visibili in base al ruolo)
- **Diario condiviso**:
  - Il professionista **legge** solo ciò che gli è stato condiviso
  - Ogni accesso è **audit-logged** (utente, risorsa, timestamp) senza salvare testo sensibile nei log

---

## Internationalization (next-intl)

- Routing localizzato: `/{locale}/*` (es. `/it/*`, `/en/*`)
- `DEFAULT_LOCALE` e lista supportata in env
- Cataloghi messaggi: `src/locales/it.json`, `src/locales/en.json`
- (Opzionale) **Crowdin** in CI per sync automatizzato

---

## Prerequisiti

- **Node.js 20+**
- **npm** (o `pnpm`/`bun` se preferiti; script forniti per npm)
- Un progetto **Vercel** collegato a GitHub (consigliato)
- Account **Neon** per Postgres (via Vercel Storage)

---

## Environment Variables

### Auth (NextAuth)
```env
# Dev
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<local_secret>

# Prod (Vercel → Project → Environment Variables)
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<strong_random_value>
```

### Database (Neon via Vercel Storage)
```env
# Dev
DATABASE_URL=postgres://...dev

# Prod (branch main su Neon)
DATABASE_URL=postgres://...main

# Preview (branch PR su Neon)
DATABASE_URL=postgres://...preview
```

### i18n (consigliato)
```env
DEFAULT_LOCALE=it
SUPPORTED_LOCALES=it,en
```

### Email (Resend)
```env
RESEND_API_KEY=<key>
EMAIL_FROM="Psicologia Etica <no-reply@yourdomain.com>"
```

### Newsletter (Substack)
```env
SUBSTACK_SIGNUP_URL=https://<name>.substack.com
SUBSTACK_RSS_URL=https://<name>.substack.com/feed
```

### Rate-limit (opzionale, Upstash)
```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Osservabilità/Monitoraggio (opzionali)
```env
# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=production

# Better Stack (Logtail)
LOGTAIL_SOURCE_TOKEN=

# Checkly
CHECKLY_API_KEY=
CHECKLY_ACCOUNT_ID=

# Codecov (se usi coverage in CI)
CODECOV_TOKEN=
```

---

## Getting Started (local)

```bash
npm install
cp .env .env.local || true
printf '\nNEXTAUTH_URL=http://localhost:3000\nNEXTAUTH_SECRET=dev_super_secret\nDEFAULT_LOCALE=it\nSUPPORTED_LOCALES=it,en\n' >> .env.local
npm run dev
# open http://localhost:3000
```

Suggerimenti:
- importa lo **schema Drizzle** prima di entrare in `db:studio`
- usa **alias `@/*`** per import puliti

---

## Database & Migrazioni (Drizzle)

- Crea DB **Neon** da Vercel → **Storage → Connect Database → Neon**
- Usa branch separati su Neon: `main` (prod), `dev` (local), `preview` (PR)
- Punta `DATABASE_URL` al branch corretto per ambiente

**Comandi**
```bash
npm run db:generate   # genera migrations da schema
npm run db:migrate    # applica migrations su DATABASE_URL
npm run db:studio     # apre Drizzle Studio (se configurato)
```

**Schema (indicazioni chiave)**
- Tabella `users` con campo `role` enum: `'user' | 'professional' | 'admin'`
- Tabelle diario: `notes` + eventuale `notes_shares` (`note_id`, `shared_with_user_id`, timestamps)
- Audit table minimale: `audit_access` (user_id, resource_type, resource_id, ts)

> Per progetti già avviati con solo `user/admin`, creare una migration che:
> 1) estenda l’enum `role` aggiungendo `professional`
> 2) introduca `notes_shares` (se non esiste)
> 3) aggiunga le policy di accesso a livello di query nelle repo Drizzle

---

## Autenticazione (NextAuth)

- Provider **credentials** in MVP
- Pronto per estensioni **OAuth / Passkeys / Magic Link**
- **Sessione** server-side; cookie `Secure`, `HttpOnly`, `SameSite` secondo defaults Auth.js
- **Email flows** (verify/reset): Resend + react-email

> **RBAC**
>
> - Ruoli: `user`, `professional`, `admin`
> - Protezione route lato **server** con middleware/handlers e gating lato **client**
> - Admin può promuovere/demansionare utenti a `professional` dall’Admin Panel

---

## Dark Mode

- Gestita con `next-themes`
- Strategy:
  - `class` in `tailwind.config.ts`
  - `useTheme()` dove serve
  - Persistenza preferenza (localStorage)
  - Toggle nella header
- Tutti i componenti supportano le varianti `dark:` di Tailwind

---

## Sicurezza & Privacy

- **CSP**: partire in **Report-Only**, poi enforce; whitelisting minimo (Vercel, Resend, Substack, Sentry, Better Stack…)
- **Rate-limit**: login e mutazioni “write” (Upstash, opz.)
- **Log/analytics**: non salvare contenuti sensibili
- **E2EE Diario**:
  - La **passphrase** è **solo** dell’utente; se persa, i contenuti E2EE sono **irrecuperabili**
  - Comunicarlo chiaramente in UI/Docs
- **Condivisioni Diario → Professionisti**:
  - La nota viene **decrittata client-side** e inviata al server **solo** per la porzione condivisa
  - Accessi professionista **audit-logged** (senza testo in chiaro nei log)
  - **Revoca**: rimuove permesso e futura visibilità; i log di accesso restano per tracciabilità

---

## Testing

**Unit (Vitest + React Testing Library)**
```bash
npm run test
```

**Integration/E2E (Playwright)**
```bash
npx playwright install   # prima volta
npm run test:e2e
```

**Test consigliati per RBAC/Condivisioni**
- Accesso a /pro consentito solo a `professional`
- Admin può promuovere/demansionare
- Professionista **vede** solo note condivise (policy su query/handlers)
- Revoca condivisione → 403 sui successivi accessi

Opzionali:
- **Codecov** per coverage report in CI
- **Percy** per visual testing

---

## Build & Deploy (Vercel)

**Build locale (simula prod)**
```bash
npm run build
npm run start
```

**Vercel**
- Connetti repo GitHub → Import su Vercel
- Imposta env per ambiente:
  - **Production**: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
    (+ `RESEND_*`, `SENTRY_*`, `UPSTASH_*`, `LOGTAIL_*`, `CHECKLY_*` se usati)
  - **Preview**: `DATABASE_URL`, `NEXTAUTH_SECRET` (+ opzionali)
- Ogni PR crea una Preview; merge su `main` → deploy in Production
- **GitHub Actions**: workflow per lint/test/build pronto all’uso

---

## Osservabilità & Monitoraggio

- **Sentry**: Spotlight in dev; DSN in prod per error monitoring
- **Better Stack (Logtail)**: centralizzazione log (opzionale)
- **Checkly**: “Monitoring as Code” di API/flows UI (opzionale)
- **Sentry + Source Maps** abilitabili in build prod

---

## PWA (post-MVP)

- **Serwist** (`@serwist/next`) con manifest e icone
- Cache **solo** risposte pubbliche/non autenticate
- Evitare cache di pagine protette
- Install prompt + offline fallback (opzionale)

---

## Script NPM

```bash
# Dev & Build
npm run dev
npm run build
npm run start

# Quality
npm run lint
npm run format

# DB
npm run db:generate
npm run db:migrate
npm run db:studio

# Test
npm run test
npm run test:e2e

# Commit (Conventional Commits + Commitizen)
npm run commit
```

---

## Personalizzazione rapida

- Cerca `FIXME:` e `TODO:` nel codice per i punti da toccare (metadati, branding, links)
- Aggiorna `src/app/[locale]/layout.tsx` per **SEO defaults** (titolo, descrizione, Open Graph)
- Configura `src/libs/sentry/*`, `src/libs/logger/*`, `src/libs/i18n/*`
- Crea `src/features/pro/*` per la Pro Area (dashboard, inbox condivisioni, dettaglio)

---

## Note sul template di origine

- Upstream usa Clerk, multi-tenancy/teams, tabella “Free vs Pro”, sponsor, e consiglia Prisma Postgres: **qui** abbiamo sostituito/omesso quanto non coerente con l’MVP clinico/editoriale
- Manteniamo lo spirito **DX-first**: TypeScript strict, test (unit/integration/E2E), lint/format, alias `@/*`, pipeline CI pulita

---

## Licenza

MIT © 2024–presente

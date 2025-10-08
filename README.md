# Psicologia Etica

Piattaforma full-stack per supportare psicologi e professionisti della salute mentale con contenuti divulgativi, strumenti clinici e aree riservate. L'applicazione copre Blog, Vocabolario condiviso, Test, Servizi e spazi dedicati a ruoli `admin` e `professional`, con un diario/registro pensato per la privacy degli utenti.

## ✅ Stack & Obiettivi
- Next.js 14 (App Router) con React 18 e TypeScript in modalità `strict`
- Tailwind CSS + shadcn/ui per componenti accessibili e theming coerente
- `next-intl` per localizzazione server/client without vendor lock-in
- NextAuth con Drizzle ORM su Neon Postgres (credenzializzazione con bcrypt)
- Test coverage con Vitest + Playwright
- Focus su privacy, RBAC, audit trail e PR piccole e atomiche

## 🌍 Internationalization (next-intl)
- Lingue supportate: `it` (default, **senza prefisso**) e `en` (prefisso `/en`)
- Configurazione: `localePrefix: 'as-needed'`
- Switch lingua (componente esistente in header):
  - Preserva il percorso corrente
  - Passando a **it** rimuove il prefisso (`/en/...` → `/...`)
  - Passando a **en** aggiunge il prefisso (`/...` → `/en/...`)
- Variabili d'ambiente correlate:

```env
DEFAULT_LOCALE=it
SUPPORTED_LOCALES=it,en
```

- Esempi rotte: `/blog` (IT), `/en/blog` (EN)

## 🔐 Autenticazione & RBAC (NextAuth v4 + Drizzle)
- Strategy: **`jwt`** (compatibile con middleware Edge)
- Provider: **Credentials** (email + password hash con bcrypt)
- Ruoli: `user`, `professional`, `admin`
- Guardie RBAC applicate lato middleware e nelle route handlers
  - `/admin` → solo `admin`
  - `/pro` → `professional` + `admin`
- I callback JWT propagano `id` e `role` nel token e nella sessione (`session.user.role` è sempre valorizzato)
- Server components / azioni: `const session = await getServerSession(authOptions);`
- API auth (App Router) esporta `GET`/`POST` da `NextAuth(authOptions)` con runtime Node (snippet sotto)

## 🧩 Middleware Pattern (Edge)
- Middleware unico che combina `next-intl` e `withAuth` (Edge runtime)
- **Divieti assoluti**:
  - ❌ Query al DB o accesso al layer Drizzle nel middleware
  - ❌ Import dinamici/condizionali di NextAuth nel middleware
  - ❌ `export const runtime = 'nodejs'` (il middleware resta Edge)
- Snippet ufficiale utilizzato nel repo:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import createIntlMiddleware from 'next-intl/middleware';

const intl = createIntlMiddleware({
  locales: ['it', 'en'],
  defaultLocale: 'it',
  localePrefix: 'as-needed',
});

function isAdminPath(pathname: string) {
  return /^(?:\/(?:it|en)\/admin(?:\/|$)|\/admin(?:\/|$))/.test(pathname);
}

function isProPath(pathname: string) {
  return /^(?:\/(?:it|en)\/pro(?:\/|$)|\/pro(?:\/|$))/.test(pathname);
}

export default withAuth(
  async (req: NextRequest) => {
    const res = intl(req);
    const token = await getToken({ req, raw: false });
    const role = (token as any)?.role as string | undefined;
    const { pathname } = req.nextUrl;

    if (isAdminPath(pathname) && role !== 'admin') {
      return NextResponse.redirect(new URL('/sign-in', req.nextUrl));
    }
    if (isProPath(pathname) && role !== 'professional' && role !== 'admin') {
      return NextResponse.redirect(new URL('/sign-in', req.nextUrl));
    }

    return res ?? NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

API auth route (runtime Node, export sincroni):

```ts
import NextAuth from '@/libs/auth/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export { NextAuth as GET, NextAuth as POST };
```

## 🧪 Seed amministratore
- Script dedicato: `npm run seed:admin`
- Richiede variabili d'ambiente (non committare segreti):

```bash
SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="changeme" npm run seed:admin
```

- L'utente viene creato (o lasciato invariato) con `role: 'admin'`

## 🛠️ Variabili d’Ambiente (minime)

```env
NEXTAUTH_URL=http://localhost:3000            # produzione: https://<dominio>
NEXTAUTH_SECRET=<forte_random>
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
AUTH_TRUST_HOST=true
DEFAULT_LOCALE=it
SUPPORTED_LOCALES=it,en
```

- Usa il template `.env.example` come base: copia il file in `.env.local` e compila i valori necessari (crea `.env.production.local` per i deploy).

## 🗃️ Database & Migrazioni
- Generazione schema: `npm run db:generate`
- Applicazione migrazioni: `npm run db:migrate`
- Nessuna connection string deve apparire nel codice: usare env (Vercel env, GitHub Secrets, ecc.)
- Pipeline suggerita: migrazione in Preview su Vercel, deploy Production tramite GitHub Actions

## 🧹 Pulizia template
- Il boilerplate originale includeva pagine marketing/pricing: sono state rimosse dal menu principale
- Il focus del layout resta su Blog, Vocabolario, Test, Servizi e accesso all'area autenticata (Login/Avatar)

## 🧭 Rotte base (i18n-aware)
- `/` (IT) · `/en` (EN) → Home
- `/blog`, `/blog/[slug]` · `/en/blog`, `/en/blog/[slug]`
- `/vocabulary`, `/vocabulary/[slug]` · `/en/vocabulary`, `/en/vocabulary/[slug]`
- `/tests` · `/en/tests`
- `/services` · `/en/services`
- `/admin` · `/en/admin`
- `/pro` · `/en/pro`
- `/sign-in` · `/en/sign-in`
- Regola di routing: non definire `segment/page.tsx` e `segment[[...slug]]/page.tsx` allo stesso livello; se servono sottopagine insieme alla pagina base, usare `segment/[...slug]/page.tsx` annidato.
- La navbar principale (incluso account/avatar) deve restare visibile e coerente su ogni pagina pubblica: ogni nuova route deve quindi incorporare `Navbar` o adottare un layout che la includa.

## 🧰 Check di qualità (PR/CI)
Prima di aprire una PR assicurarsi che tutti i check locali siano verdi:

```bash
npm run lint
npm run check-types
npm test
npm run build
```

## 🩺 Troubleshooting
- **500 `MIDDLEWARE_INVOCATION_FAILED`**: verificare `DATABASE_URL`, `NEXTAUTH_SECRET` e che il middleware corrisponda allo snippet sopra senza query al DB
- **Percorsi con `/it`**: la lingua default non ha prefisso; controllare `localePrefix` e i test
- **Login fallito**: assicurarsi di aver eseguito il seed admin o creato un utente con password bcrypt

## Setup locale

```bash
npm install
npm run dev
```

Sequenza suggerita:
1. Provisionare un database Neon e popolare `DATABASE_URL`
2. `npm run db:migrate`
3. (Opzionale) `npm run seed:admin`
4. Avviare il dev server con `npm run dev`

## Struttura del progetto

```
src/
  app/[locale]/(unauth)     # rotte pubbliche (blog, vocabulary, tests, services)
  app/[locale]/(auth)       # rotte autenticate (dashboard, admin, pro)
  components/               # UI condivisa (header, logo, locale switcher, ...)
  features/                 # directory di dominio (blog, diary, vocabulary, tests, services, admin)
  libs/                     # helper per auth, db, i18n, logging
  locales/                  # dizionari it/en
  models/                   # schema Drizzle
  styles/                   # Tailwind e CSS globali
  utils/                    # helpers e tipi condivisi
```

## Deployment
- Target primario: Vercel (Next.js) + Neon (Postgres)
- Configurare sempre `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `AUTH_TRUST_HOST=true`
- Eseguire `npm run db:migrate` nella pipeline di deploy

## Roadmap
- Diario con cifratura end-to-end opzionale (client-side)
- Pubblicazione blog avanzata (workflow editoriale e traduzioni)
- Automazione dei test clinici con autosave ed export
- Catalogo servizi con booking e hand-off professionale
- Centro notifiche privacy-first (email e in-app)

## Licenza
MIT © 2024–present

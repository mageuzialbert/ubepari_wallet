# Ubepari Wallet — Implementation Plan

**Last updated:** 2026-04-21
**Prototype deadline:** ~2026-04-25 (4 days)
**Current stage:** UI prototype, pre-integration. No git commits yet — entire `src/` tree is untracked.
**Key decision locked:** Bilingual **English + Swahili** with a locale toggle.

This document is the single source of truth for next-agent actions. Each phase lists pre-requisites, tasks, deliverables, and acceptance criteria. Do phases in order unless explicitly marked parallel-safe.

---

## Guiding constraints (read before every phase)

- **Next.js 16 has breaking changes vs. training data.** Consult `node_modules/next/dist/docs/` before writing routing, metadata, or middleware code. See `AGENTS.md`.
- **Currency is TZS**, integers only. Use `formatTzs()` / `formatTzsCompact()` from `@/lib/currency`.
- **Phone format:** `255XXXXXXXXX` (12 digits, no `+`) for Evmark.
- **Credit math** lives in `@/lib/credit.ts` — 20% deposit, term fees 0/5/8/12% for 3/6/9/12 months, monthly rounded up to nearest 1,000 TZS. Do not duplicate this logic.
- **Aesthetic:** Apple-inspired, near-black dark surfaces, OKLCH neutrals, `rounded-full` pills, `tracking-tight` semibold headings. No RGB/gamer accents.
- **Evmark & proposal docs:** `docs/evmark_doc/` and `docs/Ubepari_PC_Proposal.pdf`. Read before writing payment code.

---

## Phase 0 — Alignment & baseline (~2 hours) — **START HERE**

Nothing is committed. Before any code changes, lock decisions and create a baseline commit.

### Pre-requisites
- None.

### Tasks
1. **Lock locale decisions** (ask user if not confirmed):
   - Default locale: `en` or `sw`?
   - URL shape: `/sw/store` (recommended) vs. query param.
   - Persist choice via cookie (`NEXT_LOCALE`).
2. **Lock Swahili glossary** — see `Appendix A` below. User must confirm the 15 anchor terms before translation starts. These terms appear across many screens; changing them mid-translation is costly.
3. **Verify Next 16 i18n compatibility:**
   - Read `node_modules/next/dist/docs/` for any native i18n support in Next 16.
   - Check `next-intl` compatibility with Next 16. If incompatible, fall back to a ~50-line custom dictionary provider.
4. **Baseline commit:** `git add` and commit the current prototype as-is on `master` before restructuring. Commit message: `chore: initial prototype baseline before i18n restructure`.

### Deliverables
- Locked locale config decision (written into this file under "Locked decisions" section).
- Locked glossary (Appendix A signed off).
- Chosen i18n library (next-intl OR custom).
- One commit on `master`.

### Acceptance criteria
- `git log` shows at least one commit.
- This file updated with user-confirmed decisions.

---

## Phase 1 — i18n infrastructure (half day) — **blocks all UI work**

### Pre-requisites
- Phase 0 complete. Library choice locked: **Next 16 native dictionary pattern, no extra deps.**

### Tasks
1. **Restructure routing:** move every directory under `src/app/*` into `src/app/[locale]/*`. Affected: `store/`, `wallet/`, `signin/`, `signup/`, `kyc/`, `orders/`, `recommend/`, `support/`, `page.tsx`, `layout.tsx`.
2. **Create `src/app/[locale]/dictionaries.ts`** following the Next 16 docs pattern:
   ```ts
   import 'server-only'
   const dictionaries = {
     en: () => import('@/messages/en.json').then(m => m.default),
     sw: () => import('@/messages/sw.json').then(m => m.default),
   }
   export type Locale = keyof typeof dictionaries
   export const locales = ['en', 'sw'] as const
   export const defaultLocale: Locale = 'en'
   export const hasLocale = (l: string): l is Locale => l in dictionaries
   export const getDictionary = (l: Locale) => dictionaries[l]()
   ```
3. **`proxy.ts`** at repo root (Next 16 renamed `middleware.ts` → `proxy.ts`):
   - Detect locale: cookie `NEXT_LOCALE` → `Accept-Language` → `defaultLocale`.
   - Redirect unlocalized paths to `/[locale]{pathname}`.
   - `matcher: ['/((?!_next|api|.*\\..*).*)']` — skip internals, API routes, static files.
4. **`app/[locale]/layout.tsx`:**
   - Async component: `const { locale } = await params` — **params is a Promise in Next 16**.
   - Dynamic `<html lang={locale}>`.
   - `generateStaticParams` returning `[{ locale: 'en' }, { locale: 'sw' }]`.
   - 404 on unknown locale via `hasLocale()`.
5. **Update `lib/currency.ts`:** accept optional locale arg. Keep TZS code; number formatter locale switches `en-TZ` → `sw-TZ`. Verify `Intl.NumberFormat("sw-TZ", { style: 'currency', currency: 'TZS' })` output — test in a node REPL, fall back to `en-TZ` if Swahili locale isn't installed on the runtime.
6. **Date formatting:** thin helper `formatDate(date, locale)` using `Intl.DateTimeFormat(locale === 'sw' ? 'sw-TZ' : 'en-GB', ...)`. Replace all `toLocaleDateString("en-GB", ...)` call sites in `wallet/page.tsx` and `orders/page.tsx`.
7. **`LocaleToggle` component** in `src/components/locale-toggle.tsx`. Pill button beside `theme-toggle.tsx` in `site-header.tsx`. Toggles EN ↔ SW, writes cookie `NEXT_LOCALE`, `router.replace` to same path under new locale.

### Notes (Next 16 gotchas)
- `params` is a Promise — always `await` before destructuring.
- `middleware.ts` is deprecated → use `proxy.ts`.
- Root layout must be under `app/[locale]/layout.tsx` — remove `app/layout.tsx`.
- `generateMetadata` also receives async params.

### Deliverables
- Working routes `/en/*` and `/sw/*`, both currently render English copy.
- Locale toggle in header that survives navigation.
- No visible regressions in light/dark theme or layout.

### Acceptance criteria
- `npm run dev` boots, `/` redirects to `/en` (or `/sw` if default), both prefixes load every page.
- Cookie `NEXT_LOCALE` set on toggle; survives refresh.
- `<html lang>` reflects active locale.
- Commit: `feat(i18n): locale routing and provider scaffolding`.

### Files that will change
- `src/app/**/*` (all files relocated under `[locale]`)
- New: `src/i18n/config.ts`, `src/i18n/request.ts`, `middleware.ts`, `src/components/locale-toggle.tsx`, `messages/en.json` (empty scaffold), `messages/sw.json` (empty scaffold)
- Modified: `src/lib/currency.ts`, `src/components/site-header.tsx`, `next.config.ts` (next-intl plugin if needed)

---

## Phase 2 — String extraction + English dictionary (1 day)

### Pre-requisites
- Phase 1 merged.

### Tasks
1. **Create message namespaces** in `messages/en.json`, nested by feature:
   ```
   common, nav, footer, hero, store, product, wallet, orders,
   signin, signup, kyc, recommend, support, credit, topup, meta
   ```
2. **Mechanical extraction pass** — for each file in the inventory (see Appendix B), replace every inline English string with `t("namespace.key")` and add the key to `en.json`.
3. **Page metadata:** convert every `export const metadata` to `export async function generateMetadata({ params })` using `getTranslations()`.
4. **Locale-aware product data:** refactor `lib/products.ts` from flat strings to:
   ```ts
   type LocalizedProduct = {
     ...,
     name: { en: string; sw: string },
     tagline: { en: string; sw: string },
     description: { en: string; sw: string },
   }
   ```
   Add a `resolveProduct(product, locale)` helper. Do NOT translate yet — duplicate EN into SW fields as placeholders.
5. **`lib/nav.ts`:** replace label strings with i18n keys; resolve at render time via `t()`.
6. **`lib/mock-wallet.ts`:** transaction note templates → i18n keys with `{orderId}` / `{provider}` params. ICU syntax.
7. **Pluralization audit:** find hardcoded plurals (`months remaining`, `models match`) and convert to ICU plural syntax.

### Deliverables
- Every visible string in the app renders via `t()` with zero inline English copy in `.tsx` files (except alt text and a11y strings, which also should move).
- `messages/en.json` fully populated (~400–500 keys).
- `messages/sw.json` is a key-identical clone of `en.json` with English placeholder values (for Phase 3 to fill).

### Acceptance criteria
- `grep -r '>[A-Z][a-z]' src/app src/components` returns no user-visible English (manual spot-check).
- Every page renders identically in EN mode before/after extraction.
- Commit: `feat(i18n): extract all strings into en.json`.

### Files that will change
- Every `.tsx` file in `src/app/[locale]/**` and `src/components/**`
- `messages/en.json`, `messages/sw.json`
- `src/lib/products.ts`, `src/lib/nav.ts`, `src/lib/mock-wallet.ts`

---

## Phase 3 — Swahili translation (1 day)

### Pre-requisites
- Phases 1 & 2 complete. Glossary locked (Appendix A).

### Tasks
1. **Fill `messages/sw.json`** using the locked glossary. Do not translate literally — rewrite marketing lines (hero, landing sections) in natural, confident Swahili consistent with Apple-ish tone: short, warm, no heavy jargon.
2. **Translate product copy** in `lib/products.ts` (the `.sw` fields added in Phase 2). 12 products × 3 fields each.
3. **Translate mock wallet strings** in `lib/mock-wallet.ts` note templates.
4. **Native-speaker review** of ~20 highest-impact strings: hero, primary CTAs, credit calculator rows, top-up dialog, KYC instructions, support FAQ. User (beipoah@gmail.com) or designated reviewer must sign off before Phase 5.
5. **Overflow audit while translating:** Swahili strings are typically 15–30% longer. Flag any string likely to break a button, table header, or card layout — mark with a `TODO:overflow` comment in the JSON or open a sibling `overflow.md` note.

### Deliverables
- `messages/sw.json` fully translated, parity with `en.json`.
- Product SW copy in `lib/products.ts`.
- List of overflow risks for Phase 5.

### Acceptance criteria
- Every page walked in `/sw` mode shows Swahili copy end-to-end.
- No English leakage except legal boilerplate intentionally kept in English (note which).
- Commit: `feat(i18n): swahili translations`.

---

## Phase 4 — Demo-critical integrations (1–1.5 days)

The deadline is tight. Decide what is **real** vs. **mocked** for the demo. Default recommendation for a stakeholder prototype:

| Capability | Demo strategy |
|---|---|
| Auth (signin/signup/OTP) | **Mock.** Fake OTP `000000` always succeeds. Session in cookie. |
| KYC submission | **Mock.** Accept upload client-side, show "under review" state. |
| Product catalog | **Static** from `lib/products.ts`. No DB yet. |
| Credit calculator | **Real.** Already functional via `lib/credit.ts`. |
| Wallet balance / activity | **Mock** from `lib/mock-wallet.ts`. |
| Deposit payment (Evmark push USSD) | **Real if time permits** — single happy-path flow: initiate deposit, poll for confirmation, show success. Otherwise mock with 3-second "awaiting confirmation" spinner. |
| Top-up (mobile money / card) | **Mock confirmation.** Dialog already exists in `src/components/wallet/top-up-dialog.tsx`. |
| AI Advisor (`/recommend`) | **Mock.** Hardcoded 3-second delay → returns one preset match. |

### Tasks (in priority order)
1. **Mock auth session:** minimal cookie-based session, `useSession()` hook. No Supabase yet.
2. **Deposit happy-path (if Evmark in scope):**
   - Read `docs/evmark_doc/` first.
   - Implement `/api/payments/deposit/initiate` — builds Evmark hash, pushes USSD to customer phone (`255XXXXXXXXX`).
   - Implement `/api/payments/webhook` — verifies Evmark callback, transitions order state.
   - UI: product page → "Reserve with deposit" → phone prompt → push-USSD wait screen → success.
3. **Mock order creation** on deposit success — appends to local mock orders store.
4. **QA smoke test of demo flow:** Landing → Store → Product → Credit calculator → Deposit → Orders → Wallet.

### Deliverables
- One end-to-end working "buy a PC" flow, in both locales.
- Clear code comments at every mock boundary: `// MOCK: replace with Supabase in post-prototype`.

### Acceptance criteria
- A stakeholder can complete the golden path in < 2 minutes, in either language, with no blocking errors.
- Commit: `feat(demo): end-to-end hire-purchase flow`.

---

## Phase 5 — QA, polish, deploy (half day)

### Pre-requisites
- Phase 3 + Phase 4 complete.

### Tasks
1. **Bilingual page-walk QA:** every page, every interactive state, both locales. Check:
   - Layout/overflow (buttons, card headers, table columns).
   - Formatters: TZS, dates, numbers render correctly per locale.
   - Toggle persists across nav and refresh.
   - `<html lang>` correct.
   - Browser tab title (metadata) translates.
2. **Theme QA:** dark default renders correctly; light mode sanity-check.
3. **SEO:**
   - `hreflang` alternates in root layout metadata.
   - Open Graph tags reflect locale.
4. **Lighthouse/perf sanity** — no blocking network calls on route change; messages files < 50 KB each.
5. **Deploy to Vercel.** Confirm production build works. Env vars for Evmark (sandbox) if Phase 4 went real.
6. **Final commit + push + PR** to `main` if using PR flow, else tag `v0.1.0-prototype`.

### Deliverables
- Live URL the user can share with stakeholders.
- Demo script (short — 5 bullet points) in this file under "Demo script".

### Acceptance criteria
- Deployed URL loads cleanly in both locales on mobile + desktop.
- No console errors on the golden path.

---

## Locked decisions

_Updated 2026-04-21 based on user answers._

- **Default locale:** **`en`** (English) — confirmed 2026-04-21.
- **URL shape:** `/en/*` and `/sw/*` — path segment routing.
- **i18n library:** **none — use Next 16's native dictionary pattern.** Verified 2026-04-21 in `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`. Zero-dep, uses `app/[locale]/dictionaries.ts` with `getDictionary()` + `hasLocale()` type guard. No `next-intl` install needed.
- **Evmark in prototype?** **YES** — user has shared working sandbox/live creds and reference PHP implementation (see `config&credentials.txt`, gitignored).
- **SMS OTP in prototype?** **YES** — `messaging-service.co.tz` creds available; use it for real phone verification.
- **Auth in prototype?** Real phone+OTP via SMS gateway; session in cookie. No Supabase yet for the prototype — a lightweight in-memory or JSON-file session store is fine.
- **Glossary overrides confirmed by user:**
  - "Wallet" — keep English in both locales (not "Pochi")
  - "Hire-purchase" — translate as "**Lipa kidogo kidogo**" (friendlier, marketing-led)
  - "KYC" — keep English in both locales (not "Uthibitisho")
  - "AI Advisor" → "**AI Tech Tips**" (both locales)

### Evmark account decision

- **Evmark username:** **`ipab`** — user confirmed deliberate use of iPAB International's account for this prototype. Payload `api_source` stays `"iPAB"` and `user` stays `"ipab"`. Do not invent a separate Ubepari account.

### AI provider decision

- **OpenAI first, Claude adapter-ready.** User provided an `OPENAI_API_KEY` (project-scoped, `sk-proj-...`) and `OPENAI_ORGANIZATION`. Wire the `/recommend` (AI Tech Tips) page to OpenAI via a server-only route `/api/ai/recommend`. Put the LLM call behind a `askLlm(prompt, opts)` adapter in `src/lib/ai/` so swapping to Claude later is a one-file change. **Never import the key into a client component.**

### Google Maps decision

- **Deferred — not in the prototype.** Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is in `.env.local.example` for future use. Confirmed by user 2026-04-21: skip maps entirely for the prototype; revisit post-deadline for KYC address picker or shop location display.

---

## Appendix C — Evmark & SMS integration notes (from sample code)

The user shared working PHP in `config&credentials.txt` (gitignored). Core patterns to port to Next.js 16 server routes:

### SMS gateway — `messaging-service.co.tz`
- `GET https://messaging-service.co.tz/link/sms/v1/text/single`
- Query params: `username`, `password`, `from` (sender ID), `to`, `text`
- Ubepari creds: username `ubeparipc`, password `ubeparipc2026`, sender ID `Ubepari Pc`
- **Server-side only.** Never call from a client component — secrets in query string.
- Credentials must live in `.env.local` as `SMS_USERNAME`, `SMS_PASSWORD`, `SMS_SENDER_ID`.

### Evmark mobile-money push — `https://vodaapi.evmak.com/prd/`
- `POST` JSON body:
  - `api_source`: "iPAB" in sample (likely "Ubepari" for us — confirm)
  - `api_to`: operator name (M-Pesa, Tigo, Airtel, Halotel)
  - `amount`: integer
  - `product`: plan/package label
  - `callback`: absolute URL to our webhook route
  - `hash`: `md5(user + '|' + DD-MM-YYYY)` — rotates daily
  - `user`: Evmark account username
  - `mobileNo`: `255XXXXXXXXX` (12 digits, no `+`)
  - `reference`: unique per transaction; sample uses `[4 random alnum] + "X" + [phone without 255]`
  - `callbackStatus`: "Success"
- Response 200 = request accepted. Customer gets USSD prompt on phone.
- Store transaction in our DB with `status = pending` before dispatch.

### Evmark mobile-money callback
- Verify `callbackData.Hash === md5(user + '|' + DD-MM-YYYY)`.
- Correlate via `callbackData.ThirdPartyReference` → our stored `reference`.
- Success when `callbackData.ResultType === "Completed"`; capture `callbackData.TransID`.
- Respond `{ Status: "Success" }` with HTTP 200 on handled callbacks (or Evmark will retry).

### Evmark card payment — `https://api.evmak.com/card/test/api/` (prod URL TBC)
- POST JSON: `referenceNumber`, `amount` (2-decimal string), `currency`, `payTo`, `transactionDetails`, `firstName`, `lastName`, `email`, `phoneNo`, `address`, `countryCode: "TZ"`, `postalCode`, `apiUser`, `callbackUrl`, `hash`.
- Response 200 with `data.paymentUrl` → redirect customer to Evmark-hosted card page.

### Evmark card callback
- `data.status` is `ACCEPT` / `PENDING` / `FAILED` / other.
- `data.referenceNumber` correlates to our transaction.
- `data.paymentTime`, `data.currency` also recorded.
- Idempotency: check transaction status before mutating (prevent duplicate-callback side-effects).

### Port notes (PHP → Next.js 16 TS)
- The PHP sample disables TLS verification (`'verify' => false`). **Do not port.** Use default fetch TLS verification.
- Store transactions in Supabase (post-prototype) or an in-memory `Map` keyed by reference for the demo.
- Dev webhook URL: use `ngrok http 3000` or Vercel preview deploy URL — localhost won't receive Evmark callbacks.

---

## Appendix A — Swahili glossary (lock before Phase 3)

These terms appear across many screens. Confirm before translating body copy.

| English | Swahili | Notes |
|---|---|---|
| Wallet | Pochi | Core product noun. |
| Hire-purchase | Ununuzi kwa awamu | Or "Lipa kidogo kidogo" for marketing copy. |
| Deposit (20%) | Malipo ya awali | |
| Installment | Awamu | |
| Monthly payment | Malipo ya mwezi | |
| Service fee | Ada ya huduma | |
| Sign in | Ingia | |
| Sign up / Create account | Jisajili / Fungua akaunti | |
| KYC / Verification | Uthibitisho | |
| Top up | Ongeza pesa | |
| Order | Oda | Loan word, widely used. |
| Store | Duka | |
| Support | Msaada | |
| AI Advisor | Mshauri wa AI | |
| Same-day pickup | Chukua leo hii | |

---

## Appendix B — String inventory (for Phase 2)

Source: codebase scan 2026-04-21. Estimated **400–500 unique strings**.

**Pages** (under `src/app/[locale]/` after Phase 1):
- `page.tsx` — composition only, no direct copy
- `store/page.tsx` — heading, filter results feedback, empty state
- `store/[slug]/page.tsx` — spec labels, CTAs, "You might also like"
- `wallet/page.tsx` — heavy: balance labels, progress, activity, actions
- `signin/page.tsx` / `signup/page.tsx` — form labels, hints, legal links
- `orders/page.tsx` — installment labels, schedule, principal/paid/monthly
- `recommend/page.tsx` — form, example prompts, result copy
- `kyc/page.tsx` — verification instructions, field labels, process steps
- `support/page.tsx` — heavy: 3 channels + 4 FAQ Q&A pairs

**Landing components** (`src/components/landing/`):
- `hero.tsx` — badge, heading, subheading, CTAs, featured product
- `featured-pcs.tsx` — section heading, shop link
- `how-it-works.tsx` — 3 step titles + bodies
- `ai-cta.tsx` — badge, heading, body, button, chat example
- `trust-strip.tsx` — 4 trust items

**Shared components** (`src/components/`):
- `site-header.tsx` — nav + auth CTAs + a11y
- `site-footer.tsx` — 4 column headers, 12 links, legal
- `product/product-card.tsx` — badges, price labels
- `product/filter-rail.tsx` — 3 group titles, 18 pill labels, clear button
- `product/credit-calculator.tsx` — 5 row labels, 2 buttons, fine print
- `wallet/top-up-dialog.tsx` — dialog copy, provider labels, success states

**Lib** (requires locale-aware refactor, not just translation):
- `lib/nav.ts` — 5 nav labels
- `lib/products.ts` — 12 products × (name + tagline + description) ≈ 60+ strings
- `lib/mock-wallet.ts` — transaction note templates, provider names
- `lib/currency.ts` — logic only, but takes optional locale
- `lib/credit.ts` — logic only, no strings

**Locale-sensitive formatting to revisit:**
- `formatTzs()` / `formatTzsCompact()` — uses `Intl.NumberFormat("en-TZ", ...)` today; parameterize locale.
- Date formatting in `wallet/page.tsx` and `orders/page.tsx` — uses `toLocaleDateString("en-GB", ...)`; replace with locale-aware formatter.

---

## Demo script (fill at end of Phase 5)

*Leave empty until prototype is live.*

1.
2.
3.
4.
5.

---

## Post-prototype backlog (after Apr 25)

Not in scope for the prototype deadline. Written down so nothing is lost.

- **Supabase integration:** real auth (phone OTP), users table, orders table, KYC documents storage, RLS policies.
- **Evmark full integration:** card issuance for virtual-card top-ups, reconciliation job, retry logic for failed USSD pushes.
- **Real AI Advisor:** Claude-first, OpenAI fallback. Prompt caching enabled per `skills/claude-api`. Tool use to query `lib/products.ts`.
- **Admin surface:** order review, KYC approval queue, inventory.
- **Observability:** Sentry, structured logs, Evmark webhook audit trail.
- **Legal:** hire-purchase T&Cs, privacy policy, data retention.

---

## Next agent: where to start

1. Read this file top-to-bottom.
2. Read `CLAUDE.md` and `AGENTS.md`.
3. Begin Phase 0. Ask the user the questions under "Locked decisions" before writing any code.
4. After each phase, update this file: check off tasks, fill in decisions, add a short note on what went differently than planned.

# Ubepari Wallet — Implementation Plan

**Last updated:** 2026-04-21
**Prototype deadline:** ~2026-04-25
**Current stage:** Bilingual prototype. Phases 0–3 done. **Phase 4 (Evmark + SMS OTP) is next.**

---

## Snapshot — what's built

Bilingual EN/SW wallet + hire-purchase prototype, Next.js 16 App Router, dark Apple-ish UI.

**Commit trail on `master`:**

| SHA | What |
|---|---|
| `0d6176d` | Initial prototype baseline |
| `cb04c3a` | Locale routing + dictionary scaffolding |
| `62b4449` | Locale toggle in site header |
| `c9be528` | Dictionary provider + shared chrome translated |
| `c3b319a` | Signin, signup, KYC pages translated |
| `6a4a1e4` | Store, product detail, filters, credit calc translated |
| `de759a5` | Wallet, orders, top-up dialog translated |
| `a1fe755` | Support, AI Tech Tips, localized product catalog |
| `76c3acb` | Swahili copy review — grammar, class agreement, natural phrasing |

**Every user-visible string** resolves through `src/messages/{en,sw}.json` or `src/lib/products.ts`. No inline English copy remains in `.tsx` files.

---

## Architecture (i18n)

- **Routes:** `src/app/[locale]/*` — every page under `/en/*` or `/sw/*`.
- **Locale detection:** `src/proxy.ts` redirects unlocalized paths using cookie `NEXT_LOCALE` → `Accept-Language` → `defaultLocale` (`en`).
- **Server components:** call `getDictionary(locale)` from `src/app/[locale]/dictionaries.ts`.
- **Client components:** call `useDictionary()` / `useLocale()` from `@/i18n/provider`. The provider wraps every page in the root layout.
- **Types:** `Dictionary` derived via `typeof` from `messages/en.json` in `@/i18n/types`. Hooks return strongly-typed `dict.namespace.key`.
- **Interpolation:** chained `.replace("{token}", value)`. No ICU lib yet; add only when needed for plural agreement beyond the single/plural pair in `store.*`.
- **Locale toggle:** `src/components/locale-toggle.tsx` — pill button in header, writes cookie + `router.replace()` to swap locale segment.
- **Currency:** `formatTzs(amount, locale)` in `src/lib/currency.ts`. Uses `en-TZ` / `sw-TZ` `Intl.NumberFormat`. Currency code always TZS.
- **Dates:** `formatDate(date, locale, options)` in `src/lib/datetime.ts`. `en-GB` / `sw-TZ`.
- **Product data:** `lib/products.ts` — `RawProduct` has `{en, sw}` for name/tagline/description; consumers call `getProducts(locale)` / `getProduct(slug, locale)` / `getFeaturedProducts(locale)` which return flat `Product`.

---

## Locked decisions

- **Default locale:** `en`
- **URL shape:** `/en/*`, `/sw/*` (path segment)
- **i18n library:** none — Next 16 native dictionary pattern
- **Evmark:** real, account `user='ipab'`, `api_source='iPAB'` (iPAB International's shared account, deliberate)
- **SMS OTP:** real, via `messaging-service.co.tz` (creds in `.env.local.example`, username `ubeparipc`)
- **Auth:** phone+OTP via SMS gateway, session in cookie. No Supabase in prototype.
- **AI:** OpenAI first (`sk-proj-...`), behind `askLlm()` adapter so Claude swap is one-file later.
- **Google Maps:** deferred. Key is in `.env.local.example` for later.
- **Glossary (both locales unless noted):**
  - **Wallet** — keep English
  - **KYC** — keep English
  - **AI Tech Tips** — both locales (renamed from "AI Advisor")
  - **Hire-purchase** → **Lipa kidogo kidogo** (Swahili, marketing-led)

---

## Stack & conventions

- Next.js **16.2.4**, React 19, Tailwind v4, shadcn/ui, motion, next-themes.
- **Breaking changes vs. training data** — see `AGENTS.md`. Read `node_modules/next/dist/docs/` before writing routing / metadata / middleware.
  - `middleware.ts` → **`proxy.ts`** (renamed)
  - `params` in pages/layouts is a Promise — always `await`
- Phone format **`255XXXXXXXXX`** (12 digits, no `+`) for Evmark.
- Credit math in `src/lib/credit.ts` — do not duplicate.
- Apple aesthetic: near-black surfaces, `rounded-full` pills, `tracking-tight` semibold. No RGB/gamer accents.
- Dependencies added for i18n: `@formatjs/intl-localematcher`, `negotiator`, `@types/negotiator`.

---

## Phase 3 — Swahili copy review (next up, ~1 day)

**Goal:** make every Swahili string read natural. My draft translations used the locked glossary but some lines feel literal.

### Scope
- `src/messages/sw.json` — all namespaces
- `src/lib/products.ts` — 12 products × `{tagline.sw, description.sw}` fields

### Priority spots for a native speaker's eye
Ordered by visual impact:

1. **Hero** (`hero.*`) — headings, subheading, CTAs. Needs to feel as confident as the English.
2. **Landing marketing** (`howItWorks.*`, `aiCta.*`, `trustStrip.*`) — especially `aiCta.body` and chat mock.
3. **Credit calculator** (`credit.*`) — row labels, reserve button, disclaimer.
4. **Top-up dialog** (`topup.*`) — short flow, many users will see it.
5. **Support FAQs** (`support.faqs`) — 4 Q&A pairs, each load-bearing for trust.
6. **Product taglines** (`lib/products.ts`) — 12 one-liners; some are quite idiomatic.
7. **KYC** (`kyc.*`) — process steps + form labels.
8. **Wallet activity notes** (`wallet.activityNotes`) — "Awamu · UBE-00412" etc.

### Deliverable
- Reviewed `sw.json` + `products.ts` with any phrasing changes.
- Flag any strings that broke layout (buttons clipped, card headers wrapping) — Swahili often runs ~20% longer. Common risk spots: credit calc rows, filter pills, store result line, nav labels.

### Workflow for next agent
1. Read `MEMORY.md` + this file top-to-bottom. No other prep needed.
2. Run `npm run dev`; walk `/sw/` on every page.
3. When you change a string in `sw.json`, the whole site hot-reloads — open the relevant page to verify fit.
4. Do NOT change key names or en.json values — only sw.json values and `products.ts` `.sw` fields.
5. Commit: `feat(i18n): swahili copy review`

---

## Phase 4 — Evmark + SMS OTP (after Phase 3, ~1.5 days)

Infrastructure scaffolded. Integration is net-new.

### Demo strategy

| Capability | Real vs. mock |
|---|---|
| Phone OTP | **Real** via SMS gateway |
| KYC submission | **Mock** — accept upload client-side, show "under review" |
| Product catalog | **Static** — `lib/products.ts` |
| Credit calculator | **Real** — already works via `lib/credit.ts` |
| Wallet balance / activity | **Mock** — `lib/mock-wallet.ts` |
| Deposit via Evmark USSD push | **Real** — happy path, single flow |
| Wallet top-up | **Mock confirmation** — UI is done, wire a stub |
| AI Tech Tips (`/recommend`) | **Mock** — OpenAI call optional, static match fine for demo |

### Evmark integration notes

`POST https://vodaapi.evmak.com/prd/` with:
- `hash = md5(EVMARK_USER + "|" + DD-MM-YYYY)` (rotates daily)
- Full payload schema + callback verification in `docs/evmark_doc/`
- Port notes: do **not** disable TLS verification as the PHP sample does
- Dev webhook needs ngrok or a preview deploy (localhost unreachable from Evmark)
- Reference format: 4 random alnum + `X` + phone (without `255`)

### SMS OTP
`GET https://messaging-service.co.tz/link/sms/v1/text/single` with username/password/from/to/text query params. **Server-only** — never expose creds to client.

### Mocked auth session
Minimal cookie-based session, `useSession()` hook. Issue on successful OTP verify. No Supabase.

---

## Phase 5 — QA + deploy (half day)

- Walk every page in both locales, both themes
- Check overflow (Swahili ~20% longer)
- SEO: `hreflang` alternates in metadata, OG tags per locale
- Vercel deploy with env vars set
- Demo script written into this file before handoff

---

## Known issues (not blocking)

- **`next-themes@0.4.6` script-tag warning** under React 19 — cosmetic, theme works. Revisit when upstream ships React 19 fix.

---

## Post-prototype backlog

- Supabase: real auth, users, orders, KYC docs, RLS
- Evmark card flow + reconciliation
- Real AI Tech Tips via Claude/OpenAI adapter, tool use over `products.ts`
- Admin surface: KYC approval queue, order review, inventory
- Observability: Sentry, webhook audit trail
- Google Maps (shop pickup, KYC address)
- Legal: T&Cs, privacy policy, hire-purchase agreement
- ICU plural library if/when needed

---

## Credentials (local only, never commit)

Live values in `config&credentials.txt` (gitignored) and `.env.local` (gitignored). Placeholders in `.env.local.example`. Covers:
- SMS gateway (Ubepari account)
- Evmark MNO + card URLs (using `ipab` account)
- OpenAI project key + org
- Google Maps key (deferred use)

**Security TODOs (user to do):**
- GCP Console: restrict Maps API key by HTTP referrer
- OpenAI dashboard: set monthly spending cap on the project

---

## Next agent: start here

1. Read `CLAUDE.md`, `AGENTS.md`, and this file.
2. Read `MEMORY.md` for the user's working preferences + project context.
3. **Begin Phase 3.** The Phase 3 section above is self-contained with scope, priorities, deliverable, and workflow.
4. Update the "Snapshot — what's built" section with the Phase 3 commit when done.

# Ubepari Wallet — Implementation Plan

**Last updated:** 2026-04-22
**Launch target:** ~2026-04-25
**Current stage:** Phases 0–6 done. **Phase 7 (Vercel deploy + smoke tests + security checklist) is next.**

---

## Snapshot — what's built

Bilingual EN/SW hire-purchase wallet on Next.js 16 App Router, Supabase (auth + data + KYC storage), Evmark MNO push (deposit/topup/installment), OpenAI recommendations. All user-visible copy routes through `src/messages/{en,sw}.json` or `{en,sw}` fields in `src/lib/products.ts`.

**Commit trail on `master`** (most recent first):

| SHA | What |
|---|---|
| `d0c6ac6` | Rate limits, pending-push guard, structured events |
| `c81a05b` | SEO — hreflang, sitemap, robots, OG |
| `fe37389` | OpenAI-backed `/recommend` |
| `bd40730` | Wallet topup + installment payments, real data reads |
| `4eca43a` | Evmark deposit + callback + reserve dialog |
| `882f3b7` | KYC status-aware page + specific errors |
| `f644ee8` | KYC submit → Storage + table |
| `29e1c91` | SMS OTP + custom JWT Supabase session |
| `42892f9` | Supabase schema + RLS + storage bucket + client helpers |
| `76c3acb` | Swahili copy review |
| `a1fe755`..`c3b319a` | Bilingual translation rollout |
| `cb04c3a`..`62b4449` | Locale routing + provider |
| `0d6176d` | Baseline UI + credit calc |

(Earlier i18n commits condensed; `git log --oneline` for the full list.)

---

## Architecture (i18n)

- **Routes:** `src/app/[locale]/*` — `/en/*` or `/sw/*`.
- **Locale detection:** `src/proxy.ts` redirects unlocalized paths (`middleware.ts` is renamed in Next 16).
- **Server components:** `getDictionary(locale)` from `src/app/[locale]/dictionaries.ts`.
- **Client components:** `useDictionary()` / `useLocale()` from `@/i18n/provider`.
- **Types:** `Dictionary = typeof en` in `@/i18n/types`.
- **Interpolation:** chained `.replace("{token}", value)`. No ICU lib.
- **Currency:** `formatTzs(amount, locale)` in `src/lib/currency.ts`, TZS only.
- **Dates:** `formatDate(date, locale, options)` in `src/lib/datetime.ts`.
- **Products:** `lib/products.ts` — `RawProduct` has `{en,sw}` for name/tagline/description; consumers call `getProducts(locale)` / `getProduct(slug, locale)` / `getFeaturedProducts(locale)`.

---

## Architecture (data)

Supabase postgres + Storage + Auth. RLS on every table; every write goes through the service-role client in a route handler.

### Tables

- **`profiles`** — 1:1 with `auth.users`. phone (unique `255XXXXXXXXX`), names, email, credit_limit_tzs, credit_points, kyc_status, is_admin.
- **`kyc_submissions`** — nida, legal names, id_doc_path (Storage), workplace, status, review fields.
- **`orders`** — product_slug, plan_months, cash/deposit/financed/service_fee/total/monthly (all TZS integers), status (pending|active|completed|cancelled), reference (UBE-style), timestamps.
- **`order_installments`** — order_id, sequence, due_date, amount_tzs, paid_at, payment_id.
- **`payments`** — user_id, order_id?, kind (deposit|installment|topup|refund), amount, provider (mpesa|tigopesa|airtelmoney|card), evmark_ref (MNO TransID), evmark_reference_id (our ThirdPartyReference), status, raw_callback, settled_at.
- **`wallet_entries`** — kind (credit|debit), amount, payment_id, note_key (matches `wallet.activityNotes.*`), note_params jsonb. Balance = Σcredits − Σdebits.
- **`otp_challenges`** — phone, bcrypt code_hash, expires_at, attempts. Service-role only.

Migration lives at `supabase/migrations/0001_init.sql`. Re-apply via SQL editor if you spin up a new project.

### Storage

- **Bucket `kyc-documents`** private. Paths are `{user_id}/id.{ext}`. User can read/insert in own folder; service-role has full access.

### Auth adapter

SMS OTP via `messaging-service.co.tz` → server verifies, `admin.createUser({phone, phone_confirm: true})` on new phones → mints HS256 JWT signed with `SUPABASE_JWT_SECRET` (aud=`authenticated`, sub=user.id, phone, email) → httpOnly `ubepari-session` cookie (7-day). Server Supabase client attaches it as `Authorization: Bearer <jwt>`; RLS reads `auth.uid()` from the JWT. Supabase's own phone/email providers are **disabled** in the dashboard — we own the flow.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/otp/{send,verify}` | POST | SMS OTP → Supabase session |
| `/api/auth/{me,signout}` | GET/POST | Session introspection / logout |
| `/api/kyc/submit` | POST | Multipart: validate NIDA, upload doc, insert row, flip `profiles.kyc_status` |
| `/api/orders` | POST | KYC-gated deposit push; creates order + installments + payment row |
| `/api/orders/[id]` | GET | RLS-scoped order + deposit status (for polling) |
| `/api/wallet/topup` | POST | Top-up push |
| `/api/wallet/pay-installment` | POST | Installment push (verifies ownership + unpaid) |
| `/api/payments/[id]` | GET | RLS-scoped payment status (for polling) |
| `/api/payments/mno/callback` | POST | Evmark callback → settles payment + writes wallet entries |
| `/api/recommend` | POST | OpenAI `gpt-4o-mini` advisor; returns `{productSlug, rationale}` |
| `/api/dev/simulate-callback` | POST | **dev-only**; fakes Evmark callback so localhost can resolve pushes |

### Reliability

- **Rate limits:** OTP send = 1/min per phone (via `otp_challenges`) + 5/hour per IP (`src/lib/rate-limit.ts` in-memory window).
- **Pending-push guard:** `hasPendingPush(userId)` in `src/lib/payments.ts` — returns 429 `pending_push` if any `payments.status='pending'` <120 s old for the caller. Wired into orders/topup/pay-installment.
- **Events:** `logEvent(name, data)` in `src/lib/events.ts` emits one JSON line to stdout. Pipes cleanly into Sentry/Axiom/Logtail later. Instrumented: `otp.sent`, `otp.sms_failed`, `otp.verified`, `kyc.submitted`, `order.created`, `payment.pushed`, `payment.push_failed`, `payment.settled`.
- **Callback idempotency:** already-settled payments are re-acked without reprocessing; `evmark_reference_id` is UNIQUE.

---

## Locked decisions

- **Default locale:** `en`. URL shape: `/en/*`, `/sw/*`.
- **i18n library:** none — Next 16 native dictionary pattern.
- **Supabase:** Project ref `zlvcpaiyjshsjglqicvy`, region **eu-west-1 (Ireland)**. Built-in phone and email providers **disabled**.
- **Auth:** phone+OTP via SMS gateway → custom JWT → Supabase session.
- **Product catalog:** stays static in `lib/products.ts` for launch.
- **KYC review:** manual via Supabase dashboard at launch.
- **Evmark:** live, `user='ipab'`, `api_source='iPAB'` (shared iPAB International account, deliberate).
- **AI Tech Tips:** real OpenAI `gpt-4o-mini` behind `askLlm()` adapter (`src/lib/llm.ts`).
- **Deploy:** Vercel. Production domain **`ubeparipc.tech`**.
- **Glossary:** Wallet / KYC / AI Tech Tips kept English. "Hire-purchase" → "Lipa kidogo kidogo".

---

## Stack & conventions

- Next.js **16.2.4**, React 19, Tailwind v4, shadcn/ui, motion, next-themes.
- Supabase client: `@supabase/supabase-js` v2 only (we dropped `@supabase/ssr` — our session cookie is a plain httpOnly JWT, the server client attaches it via `Authorization` header).
- **Next 16 breaking changes** — see `AGENTS.md`. `middleware.ts` → `proxy.ts`; `params` is a `Promise` (always `await`).
- Phone format **`255XXXXXXXXX`** (12 digits) everywhere.
- Credit math in `src/lib/credit.ts` — don't duplicate.
- **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SMS_PASSWORD`, `OPENAI_API_KEY`, every `EVMARK_*`) must never reach the browser. Only `NEXT_PUBLIC_*` is client-safe.
- Apple aesthetic: near-black surfaces, `rounded-full` pills, `tracking-tight` semibold. No RGB/gamer accents.

---

## Phase 7 — Launch (~0.5 day)

1. **Vercel project.** Import `mageuzialbert/ubepari_wallet`, set env vars for **Production** + **Preview** (everything in `.env.local` except `NEXT_PUBLIC_SITE_URL` / callback URLs — those use prod values below):
   - `NEXT_PUBLIC_SITE_URL=https://ubeparipc.tech`
   - `EVMARK_MNO_CALLBACK_URL=https://ubeparipc.tech/api/payments/mno/callback`
   - `EVMARK_CARD_CALLBACK_URL=https://ubeparipc.tech/api/payments/card/callback`
   - All Supabase, SMS, OpenAI, Evmark, Maps keys from `.env.local`.
2. **DNS.** Point `ubeparipc.tech` (apex + `www`) at Vercel per their dashboard instructions.
3. **Evmark allowlist.** If Evmark requires callback URL allowlisting, share `https://ubeparipc.tech/api/payments/mno/callback` with them.
4. **Smoke tests** (both locales, both themes):
   - `/signup` → OTP → `/kyc` → submit → "Under review" card
   - Flip `profiles.kyc_status` to `approved` in Supabase dashboard
   - `/store/<slug>` → Reserve with deposit — **real** callback should arrive this time; order flips `pending → active`, wallet activity shows the deposit credit + debit.
   - Wallet top-up happy path.
   - "Pay now" on an active order's next installment.
   - `/recommend` with a real prompt.
5. **Security checklist.**
   - GCP Console → Maps API key → restrict by HTTP referrer to `*.ubeparipc.tech`.
   - OpenAI dashboard → project → monthly spending cap.
   - Post-build: `grep -r SUPABASE_SERVICE_ROLE_KEY .next/static || echo clean` — must print `clean`.
   - Supabase → with anon key, try to `select` from `otp_challenges` — must return empty / RLS block.
6. **Runbook.** Append a short "how to approve a KYC", "how to refund", "how to reconcile a stuck payment via `/api/dev/simulate-callback`" appendix to this file.

### Commit boundary
- `chore(deploy): vercel + prod env wiring`
- `docs: launch runbook`

---

## Known issues (not blocking)

- **`next-themes@0.4.6`** script-tag warning under React 19 — cosmetic. Revisit when upstream ships the fix.
- **Callback tested only via `/api/dev/simulate-callback`** in local dev; real Evmark callback path first exercises on the Vercel deploy.

---

## Post-launch backlog

- Admin surface: KYC approval queue, order review, inventory edits, refunds.
- Products table in Supabase + CMS-like admin (retire static catalog).
- Evmark card flow (Visa/Mastercard) + reconciliation.
- Sentry/Axiom/Logtail wired to `logEvent()`.
- Google Maps: showroom pickup + KYC address autocomplete.
- Legal pages (Terms, Privacy, Hire-Purchase Agreement — footer links 404 today).
- ICU plural lib if copy grows beyond single/plural.
- Referral program (footer link is a stub).
- Distributed rate limits (Upstash) if traffic grows beyond single-region Vercel.
- `supabase gen types` → replace the hand-rolled `src/lib/supabase/types.ts` with generated types.

---

## Credentials

Live values in `.env.local` (gitignored). Placeholders in `.env.local.example`. Covers SMS gateway, Evmark, OpenAI, Google Maps, and Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).

**Never-commit list:** `.env.local`, anything matching `.env*` other than `.env.local.example` (which stays placeholder-only).

---

## Next agent: start here

1. Read `CLAUDE.md`, `AGENTS.md`, and this file.
2. Read `MEMORY.md` for the user's working preferences + project context.
3. Confirm `.env.local` has Supabase + SMS + Evmark + OpenAI filled.
4. **Begin Phase 7.** User will handle dashboards (Vercel, DNS, GCP, OpenAI); you handle `ubeparipc.tech`-specific config changes in the repo and write the runbook appendix.
5. Update the snapshot table with each commit SHA as Phase 7 lands.

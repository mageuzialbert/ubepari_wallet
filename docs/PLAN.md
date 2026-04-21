# Ubepari Wallet — Implementation Plan

**Last updated:** 2026-04-21
**Launch target:** ~2026-04-25
**Current stage:** Going live. Phases 0–6 done: UI, copy, Supabase, auth, KYC, Evmark deposit/topup/installment with real data reads, OpenAI recommendations, SEO, rate limits + observability. **Phase 7 (Vercel deploy + smoke tests + security checklist) is next.**

---

## Snapshot — what's built

Bilingual EN/SW wallet + hire-purchase UI, Next.js 16 App Router, dark Apple-ish UI. All user-visible strings resolve through `src/messages/{en,sw}.json` or the `{en,sw}` fields in `src/lib/products.ts`. No inline English copy remains in `.tsx` files.

**Commit trail on `master`:**

| SHA | What |
|---|---|
| `0d6176d` | Initial baseline (UI, credit calc, mock wallet/orders/products) |
| `cb04c3a` | Locale routing + dictionary scaffolding |
| `62b4449` | Locale toggle in site header |
| `c9be528` | Dictionary provider + shared chrome translated |
| `c3b319a` | Signin, signup, KYC pages translated |
| `6a4a1e4` | Store, product detail, filters, credit calc translated |
| `de759a5` | Wallet, orders, top-up dialog translated |
| `a1fe755` | Support, AI Tech Tips, localized product catalog |
| `76c3acb` | Swahili copy review — grammar, class agreement, natural phrasing |
| `42892f9` | Supabase foundation — deps, schema + RLS migration, client helpers |
| `29e1c91` | Auth adapter — SMS OTP + custom Supabase JWT session |
| `f644ee8` | KYC submit — upload to Storage, insert row, flip profile status |
| `882f3b7` | KYC status-aware page + specific error mapping |
| `4eca43a` | Evmark deposit + callback + reserve dialog (Phase 5 round A) |
| `bd40730` | Wallet topup + installment payments, real data reads (Phase 5 round B) |
| `fe37389` | Real OpenAI-backed recommendations (Phase 6) |
| `c81a05b` | SEO — hreflang, sitemap, robots, OG (Phase 6) |
| `d0c6ac6` | Rate limits, pending-push guard, structured events (Phase 6) |

---

## Architecture (i18n)

- **Routes:** `src/app/[locale]/*` — every page under `/en/*` or `/sw/*`.
- **Locale detection:** `src/proxy.ts` redirects unlocalized paths using cookie `NEXT_LOCALE` → `Accept-Language` → `defaultLocale` (`en`).
- **Server components:** call `getDictionary(locale)` from `src/app/[locale]/dictionaries.ts`.
- **Client components:** `useDictionary()` / `useLocale()` from `@/i18n/provider`. The provider wraps every page in the root layout.
- **Types:** `Dictionary` derived via `typeof` from `messages/en.json` in `@/i18n/types`. Hooks return strongly-typed `dict.namespace.key`.
- **Interpolation:** chained `.replace("{token}", value)`. No ICU library; add only if plural agreement beyond the single/plural pair in `store.*` becomes necessary.
- **Currency:** `formatTzs(amount, locale)` in `src/lib/currency.ts`. `en-TZ` / `sw-TZ` `Intl.NumberFormat`, code always TZS.
- **Dates:** `formatDate(date, locale, options)` in `src/lib/datetime.ts`. `en-GB` / `sw-TZ`.
- **Products:** `lib/products.ts` — `RawProduct` has `{en, sw}` for name/tagline/description; consumers call `getProducts(locale)` etc. which return flat `Product`.

---

## Architecture (data)

Supabase postgres + Storage + Auth. Every data table has RLS; every write happens server-side from route handlers or server actions.

### Tables

- **`public.profiles`** — 1:1 with `auth.users`. `id` (FK `auth.users`), `phone` (unique, `255XXXXXXXXX`), `first_name`, `last_name`, `email`, `credit_limit_tzs`, `credit_points`, `kyc_status` (`pending|approved|rejected`), `is_admin`, `created_at`.
- **`public.kyc_submissions`** — `id`, `user_id`, `nida_number`, `legal_first_name`, `legal_last_name`, `id_doc_path` (Storage key), `workplace`, `status`, `submitted_at`, `reviewed_at`, `reviewed_by`, `review_notes`.
- **`public.orders`** — `id`, `user_id`, `product_slug`, `plan_months`, `cash_price_tzs`, `deposit_tzs`, `financed_tzs`, `service_fee_tzs`, `total_tzs`, `monthly_tzs`, `status` (`pending|active|completed|cancelled`), `reference`, `created_at`, `activated_at`, `completed_at`.
- **`public.order_installments`** — `id`, `order_id`, `sequence`, `due_date`, `amount_tzs`, `paid_at`, `payment_id`.
- **`public.payments`** — `id`, `user_id`, `order_id` (nullable, null for top-ups), `kind` (`deposit|installment|topup|refund`), `amount_tzs`, `provider` (`mpesa|tigopesa|airtelmoney|card`), `evmark_ref`, `evmark_reference_id`, `status` (`pending|success|failed`), `raw_callback` (jsonb), `created_at`, `settled_at`.
- **`public.wallet_entries`** — `id`, `user_id`, `kind` (`credit|debit`), `amount_tzs`, `payment_id`, `note_key` (matches `wallet.activityNotes.*` dict keys so UI localizes from the key, not the stored note), `note_params` (jsonb), `created_at`. Balance = sum of credits − sum of debits.
- **`public.otp_challenges`** — `id`, `phone`, `code_hash` (bcrypt), `expires_at`, `consumed_at`, `attempts`, `created_at`. Service-role only.

### Storage

- **Bucket `kyc-documents`** — private. Policies: user can upload to `{user_id}/*`; user can read their own path; service role has full read.

### RLS outline

- `profiles` — user selects/updates own row; insert server-side only via service role.
- `kyc_submissions` — user inserts/selects own; update only via service role (admin review).
- `orders`, `order_installments`, `payments`, `wallet_entries` — user selects own; all writes server-side.
- `otp_challenges` — no anon/auth policy (service-role only).

### Auth adapter

SMS OTP via `messaging-service.co.tz`; on verify the server creates the `auth.users` row via `admin.createUser` (if phone is new) or looks it up by phone, then signs a custom JWT with `SUPABASE_JWT_SECRET` and returns it as a cookie. Client calls `supabase.auth.setSession(...)` on arrival. RLS trusts `auth.uid()` from the JWT.

---

## Locked decisions

- **Default locale:** `en`. **URL shape:** `/en/*`, `/sw/*` (path segment).
- **i18n library:** none — Next 16 native dictionary pattern.
- **Supabase:** live. Project ref `zlvcpaiyjshsjglqicvy`, region **West EU (Ireland, eu-west-1)**. Postgres + Storage + Auth, RLS on every data table. Built-in phone and email providers are disabled — we own the SMS OTP → custom JWT flow.
- **Auth:** phone+OTP via `messaging-service.co.tz` → custom JWT signed with `SUPABASE_JWT_SECRET` → Supabase session cookie. Not Supabase's built-in phone auth (which would force a Twilio swap).
- **Product catalog:** stays static in `lib/products.ts` for launch. Migrate to a `products` table post-launch when the admin/inventory surface lands.
- **KYC review:** manual via Supabase dashboard at launch. In-app admin queue is post-launch.
- **Evmark:** live, account `user='ipab'`, `api_source='iPAB'` (iPAB International's shared account, deliberate).
- **AI Tech Tips:** real OpenAI (`gpt-4o-mini`), behind `askLlm()` adapter so Claude swap is one-file later.
- **Deploy:** Vercel. Production domain **`ubeparipc.tech`**. Evmark callbacks point at `https://ubeparipc.tech/api/payments/{mno,card}/callback` in prod — no ngrok.
- **Google Maps:** deferred; key stays in env for when the showroom map ships.
- **Glossary (both locales unless noted):**
  - **Wallet** — keep English
  - **KYC** — keep English
  - **AI Tech Tips** — both locales
  - **Hire-purchase** → **Lipa kidogo kidogo** (Swahili, marketing-led)

---

## Stack & conventions

- Next.js **16.2.4**, React 19, Tailwind v4, shadcn/ui, motion, next-themes.
- Supabase client: `@supabase/supabase-js` v2 + `@supabase/ssr` for cookie-based server session.
- **Breaking changes vs. training data** — see `AGENTS.md`. Read `node_modules/next/dist/docs/` before writing routing / metadata / middleware.
  - `middleware.ts` → **`proxy.ts`** (renamed)
  - `params` in pages/layouts is a Promise — always `await`
- Phone format **`255XXXXXXXXX`** (12 digits, no `+`) everywhere — Evmark and Supabase.
- Credit math in `src/lib/credit.ts` — do not duplicate.
- Server-only env (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SMS_PASSWORD`, `OPENAI_API_KEY`, Evmark) must never reach the browser. Only `NEXT_PUBLIC_*` is client-safe.
- Apple aesthetic: near-black surfaces, `rounded-full` pills, `tracking-tight` semibold. No RGB/gamer accents.
- Dependencies added for i18n: `@formatjs/intl-localematcher`, `negotiator`, `@types/negotiator`.

---

## Phase 4 — Supabase foundation (~1.5 days)

**Goal:** schema, RLS, storage, and an auth adapter that issues real Supabase sessions from SMS OTP.

### Scope

1. **Project + envs.** ✅ Done. Project `zlvcpaiyjshsjglqicvy`. `.env.local` populated with URL, anon key, service-role key, and JWT secret.
2. **Schema migration.** ✅ Written at `supabase/migrations/0001_init.sql` (every table, enums, indexes, RLS, and the storage bucket + policies in a single transaction). **Apply via Supabase SQL editor** — paste the file contents and run; or `supabase db push` if the CLI is linked.
3. **Client helpers.** ✅ Written: `src/lib/supabase/server.ts` (server components / route handlers, reads cookies via `@supabase/ssr`), `src/lib/supabase/browser.ts` (client components, singleton), `src/lib/supabase/admin.ts` (service-role, `server-only`).
4. **Auth adapter.**
   - `src/lib/sms.ts` — `sendOtp(phone, code)` wrapping `messaging-service.co.tz`.
   - `POST /api/auth/otp/send` — rate-limit by phone+IP, hash+store code in `otp_challenges`, send SMS.
   - `POST /api/auth/otp/verify` — bcrypt-check the code, mark consumed, upsert profile, sign custom JWT (`iss=supabase`, `aud=authenticated`, `sub=user.id`, `role=authenticated`, `exp=1h` access / 1w refresh), return as httpOnly cookies the Supabase SSR client reads.
   - Client: `useSession()` hook backed by `supabase.auth.getUser()`.
5. **Signup/signin pages wired.** Real OTP round trip. Success routes to `/wallet`.
6. **KYC submit wired.** `POST /api/kyc/submit` — upload doc to Storage under `{user_id}/id.{ext}`, insert `kyc_submissions` row with `status='pending'`, set `profiles.kyc_status='pending'`. UI shows "under review" after submit.

### Deliverable
- Migrations applied, RLS green (can't select someone else's profile as anon or as another auth user).
- End-to-end: fresh phone → OTP SMS received → verify → profile row exists → signed in → can submit KYC → row visible in Supabase dashboard → doc in Storage.

### Commit boundary
- `feat(supabase): schema, RLS, storage bucket`
- `feat(auth): sms otp + custom jwt session`
- `feat(kyc): wire submit to supabase storage + table`

---

## Phase 5 — Payments (~1 day)

**Goal:** real money moves, backed by Supabase rows.

### Scope

1. **Evmark server client.** `src/lib/evmark.ts` — daily `md5(EVMARK_USER + "|" + DD-MM-YYYY)` hash, MNO push, card redirect, callback verification. Port notes from `docs/evmark_doc/` — do **not** disable TLS verification like the PHP sample.
2. **Deposit happy path (order creation).**
   - Store product detail: "Reserve with deposit" → `POST /api/orders` with `{slug, plan_months, provider, phone}`.
   - Server validates KYC approved, creates `orders` row (`status='pending'`), creates installment rows, generates reference (4 alnum + `X` + phone-without-255), triggers Evmark MNO push, creates a `payments` row (`kind='deposit'`, `status='pending'`).
3. **Evmark callback handler.** `POST /api/payments/mno/callback` — verify signature, find `payments` by `evmark_reference_id`, update to `success|failed`, and on success: set `orders.status='active'`, add a `wallet_entries` credit+debit pair for the deposit (so activity feed is clean), flip first installment due date window start.
4. **Wallet top-up.** Top-up dialog → `POST /api/wallet/topup` → Evmark MNO push → callback → `wallet_entries` credit.
5. **Installment payment.** "Pay this month" → `POST /api/wallet/pay-installment` → Evmark MNO push (or wallet-balance deduction if sufficient) → callback → mark `order_installments.paid_at`, `payments.status='success'`.
6. **Wallet + Orders pages read real data.** Remove `lib/mock-wallet.ts` and the mock activity seed. Server components query Supabase with the user's session.

### Deliverable
- Place an order end-to-end with a test phone: deposit push → STK/USSD on phone → confirm → order goes `pending → active`, wallet activity shows deposit, schedule is populated.
- Wallet top-up round-trips and reflects in balance.
- Missed callback retries / webhook idempotency: safe to replay.

### Commit boundary
- `feat(payments): evmark client + daily hash`
- `feat(orders): create order + deposit push`
- `feat(payments): mno callback handler`
- `feat(wallet): topup + installment payment`
- `refactor: remove mock wallet/orders seeds`

---

## Phase 6 — Production polish (~0.5 day)

1. **Real AI Tech Tips.** `/recommend` calls OpenAI with tool-use over the `lib/products.ts` catalog. Static fallback for quota/error cases.
2. **SEO.** `hreflang` alternates in each page's metadata; OG image per locale; canonical to self-locale; `sitemap.ts` listing both locale trees.
3. **Error + empty states.** Any Supabase read returning empty arrays must render a real empty state (orders, wallet activity), not a blank card. Show a toast on Evmark timeout/failure with "try again" CTA.
4. **Rate limits.** OTP endpoint: 1/min per phone, 5/hour per IP. Payment endpoints: 1 in-flight push per user.
5. **Observability stub.** Log structured events (`otp.sent`, `payment.pushed`, `payment.settled`, `order.created`) so Sentry or Axiom can be dropped in post-launch without refactoring.

### Commit boundary
- `feat(ai): real openai-backed recommendations`
- `feat(seo): hreflang, og, sitemap`
- `feat(reliability): rate limits + error states`

---

## Phase 7 — Launch (~0.5 day)

1. **Vercel project.** Link repo, set all env vars (prod), set `NEXT_PUBLIC_SITE_URL` to production domain.
2. **Production Evmark callbacks.** Update `EVMARK_MNO_CALLBACK_URL` / `EVMARK_CARD_CALLBACK_URL` to the prod domain. Share the callback URL with Evmark if allowlisting is required.
3. **Supabase prod.** If launch project is separate from dev, rerun migrations there; otherwise confirm the single project is configured for prod traffic (email templates, redirect URLs).
4. **Smoke tests.** Both locales × both themes on every page. Real deposit with a live MNO number. Real top-up. KYC approval toggle via dashboard flows through to `/wallet`.
5. **Security checklist.**
   - Restrict Google Maps API key by HTTP referrer (GCP Console).
   - Set monthly spending cap on the OpenAI project.
   - Confirm `SUPABASE_SERVICE_ROLE_KEY` is not in any client bundle (`grep` on `.next/static`).
   - Verify `otp_challenges` is not readable via anon key.
6. **Demo/handoff script.** Short appendix below this file with the exact happy-path walk.

### Commit boundary
- `chore(deploy): vercel + prod env wiring`
- `docs: launch checklist + runbook`

---

## Known issues (not blocking)

- **`next-themes@0.4.6` script-tag warning** under React 19 — cosmetic, theme works. Revisit when upstream ships a React 19 fix.

---

## Post-launch backlog

- **Admin surface:** KYC approval queue, order review, inventory edits, refund issuance.
- **Products table:** migrate `lib/products.ts` into Supabase; CMS-like admin.
- **Evmark card flow:** currently scoped to MNO only. Add Visa/Mastercard happy path + reconciliation.
- **Observability:** Sentry, Axiom or Logtail for structured events, webhook audit trail.
- **Google Maps:** showroom pickup + KYC address autocomplete.
- **Legal pages:** Terms, Privacy, Hire-Purchase Agreement (currently 404 from footer).
- **ICU plural library** if copy grows beyond single/plural.
- **Referral program:** `Mpango wa Ushirikiano` link in footer points nowhere today.

---

## Credentials

Live values live in `.env.local` (gitignored). Placeholders in `.env.local.example`. Covers:

- **SMS gateway** — Ubepari account, `messaging-service.co.tz`.
- **Evmark** — MNO + card URLs, `ipab` account.
- **OpenAI** — project key + org.
- **Google Maps** — deferred use.
- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `SUPABASE_JWT_SECRET` (server-only).

**Never-commit list:** `.env.local`, any file matching `.env*` other than `.env.local.example` (which must contain only empty placeholders).

---

## Next agent: start here

1. Read `CLAUDE.md`, `AGENTS.md`, and this file.
2. Read `MEMORY.md` for the user's working preferences + project context.
3. Confirm `.env.local` has all Supabase vars set. If not, ask the user before doing anything else — Phase 4 can't start without them.
4. **Begin Phase 4.** It's self-contained with scope, deliverable, and commit boundary.
5. Update the snapshot table with each commit SHA as phases land.

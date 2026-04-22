# Ubepari Wallet — Production Plan

**Last updated:** 2026-04-22
**Status:** Customer account surface (Phase 7), legal pages (Phase 15.1), DB-backed product catalog (Phase 8), and the admin foundation (Phase 9: role gate, shell, dashboard, audit log) all landed. Next up: the KYC review queue (Phase 10) — replaces approve-via-Supabase-dashboard with an in-app flow.

---

## Snapshot — what's already built

Bilingual EN/SW hire-purchase wallet on Next.js 16 App Router. Supabase (auth + data + KYC storage), Evmark MNO push (deposit/topup/installment), OpenAI recommendations. All user-visible copy routes through `src/messages/{en,sw}.json` or `{en,sw}` fields in `src/lib/products.ts`.

**Customer-facing pages that work today**

- `/signup`, `/signin` — SMS OTP → custom JWT Supabase session
- `/kyc` — submit NIDA + ID doc upload, status-aware view
- `/store`, `/store/[slug]` — browse + reserve with deposit push (DB-backed catalog)
- `/wallet` — balance + topup + pay installment + activity feed
- `/orders`, `/orders/[id]` — list + full detail with installment schedule + payment history
- `/account`, `/account/edit`, `/account/payments` — profile view, edit, filtered payment history
- `/recommend` — OpenAI `gpt-4o-mini` product advisor
- `/support` — static support page
- `/about` — mission, principles, stats, locations
- `/legal/terms`, `/legal/privacy`, `/legal/hire-purchase-agreement` — bilingual legal pages
- Header dropdown: avatar + Profile/Orders/Wallet/Sign out for signed-in users

**Commit trail on `master`** (most recent first)

| SHA | What |
|---|---|
| `b2e8c90` | Admin role gate + shell + dashboard |
| `cfff223` | admin_audit_log table + logAdmin helper |
| `ac4b3e7` | Products catalog → Supabase (server-only async loaders) |
| `107207f` | Seed products script (one-shot) |
| `ea76ef5` | products + product_images tables + bucket |
| `6465055` | About page |
| `5f718f1` | Legal pages (terms, privacy, hire-purchase agreement) |
| `ef91476` | Account profile + order detail + payment history |
| `168a1bd` | Header signed-in menu + sign-out wiring |
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

(`git log --oneline` for earlier i18n commits.)

---

## Architecture (i18n)

- **Routes:** `src/app/[locale]/*` — `/en/*` or `/sw/*`. Admin routes will live under `src/app/[locale]/admin/*` and also be bilingual.
- **Locale detection:** `src/proxy.ts` (Next 16 renamed `middleware.ts`).
- **Server components:** `getDictionary(locale)` from `src/app/[locale]/dictionaries.ts`.
- **Client components:** `useDictionary()` / `useLocale()` from `@/i18n/provider`.
- **Interpolation:** chained `.replace("{token}", value)`. No ICU lib.
- **Currency:** `formatTzs(amount, locale)` in `src/lib/currency.ts`, TZS only.
- **Dates:** `formatDate(date, locale, options)` in `src/lib/datetime.ts`.
- **Products:** DB-backed via `products` + `product_images` tables. `lib/products.ts` is `server-only` and exposes async `getProducts(locale)`, `getProduct(slug, locale)`, `getFeaturedProducts(locale)`, `getProductsBySlugs(slugs, locale)`, `getProductSlugs()`. Reads via the anon client (`supabaseAnon()`); bilingual columns (`name_en`/`name_sw`, etc.) resolved in the loader. Images resolve to Supabase Storage public URLs.

---

## Architecture (data)

Supabase postgres + Storage + Auth. RLS on every table; every write goes through the service-role client in a route handler.

### Tables (today)

- **`profiles`** — 1:1 with `auth.users`. phone (unique `255XXXXXXXXX`), names, email, credit_limit_tzs, credit_points, kyc_status, is_admin.
- **`kyc_submissions`** — nida, legal names, id_doc_path (Storage), workplace, status, review fields.
- **`orders`** — product_slug, plan_months, cash/deposit/financed/service_fee/total/monthly (all TZS integers), status (pending|active|completed|cancelled), reference (UBE-style), timestamps.
- **`order_installments`** — order_id, sequence, due_date, amount_tzs, paid_at, payment_id.
- **`payments`** — user_id, order_id?, kind (deposit|installment|topup|refund), amount, provider (mpesa|tigopesa|airtelmoney|card), evmark_ref, evmark_reference_id, status, raw_callback, settled_at.
- **`wallet_entries`** — kind (credit|debit), amount, payment_id, note_key, note_params jsonb. Balance = Σcredits − Σdebits.
- **`otp_challenges`** — phone, bcrypt code_hash, expires_at, attempts. Service-role only.
- **`products`** — slug (unique), brand, cash_price_tzs, specs jsonb, usage_tags text[], stock int, featured bool, color_accent text, active bool, created_at, updated_at. Bilingual columns: `name_en`, `name_sw`, `tagline_en`, `tagline_sw`, `description_en`, `description_sw`. RLS: `anon`/`authenticated` can select where `active=true`; writes service-role only.
- **`product_images`** — product_id, path (Storage key), position int, alt_en, alt_sw. RLS: select when parent product active; writes service-role only.

### Tables to add (Phase 9+)

- **`admin_audit_log`** — actor_id, action (kyc.approve, kyc.reject, order.cancel, payment.refund, product.update, credit_limit.change, etc.), target_table, target_id, diff jsonb, created_at. Append-only, service-role only.

### Storage

- **`kyc-documents`** (private) — `{user_id}/id.{ext}`.
- **`product-images`** (public read) — `{product_id}/{position}.{ext}`. Service-role write only; reads via CDN public URLs.

Migrations live at `supabase/migrations/`. Applied: `0001_init.sql` (baseline), `0002_products.sql` (catalog + bucket). New migrations will be numbered sequentially (`0003_admin_audit.sql`, etc.). Re-apply via Supabase SQL editor.

### Auth adapter

SMS OTP via `messaging-service.co.tz` → `admin.createUser({phone, phone_confirm: true})` on new phones → HS256 JWT signed with `SUPABASE_JWT_SECRET` (aud=`authenticated`, sub=user.id, phone, email) → httpOnly `ubepari-session` cookie (7-day). Server Supabase client attaches it as `Authorization: Bearer <jwt>`; RLS reads `auth.uid()` from the JWT. Supabase's own phone/email providers are **disabled**.

Admin gate: `profiles.is_admin = true` plus a server-side helper `requireAdmin()` on every `/admin/*` page and `/api/admin/*` route.

### API routes (today)

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
| `/api/recommend` | POST | OpenAI advisor |
| `/api/dev/simulate-callback` | POST | **dev-only**; will be replaced by gated `/api/admin/payments/reconcile` in Phase 13 |

### Reliability (today)

- **Rate limits:** OTP send = 1/min per phone (`otp_challenges`) + 5/hour per IP (`src/lib/rate-limit.ts` in-memory window).
- **Pending-push guard:** `hasPendingPush(userId)` in `src/lib/payments.ts` returns 429 `pending_push` if any `payments.status='pending'` <120 s old. Wired into orders/topup/pay-installment.
- **Events:** `logEvent(name, data)` in `src/lib/events.ts` emits one JSON line to stdout. Pipes cleanly into Sentry/Axiom/Logtail later. Instrumented: `otp.sent`, `otp.sms_failed`, `otp.verified`, `kyc.submitted`, `order.created`, `payment.pushed`, `payment.push_failed`, `payment.settled`.
- **Callback idempotency:** already-settled payments re-acked without reprocessing; `evmark_reference_id` is UNIQUE.

---

## Locked decisions

- **Default locale:** `en`. URL shape: `/en/*`, `/sw/*`. Admin is bilingual too.
- **i18n library:** none — Next 16 native dictionary pattern.
- **Supabase:** Project ref `zlvcpaiyjshsjglqicvy`, region **eu-west-1 (Ireland)**. Built-in phone/email providers disabled.
- **Auth:** phone+OTP via SMS gateway → custom JWT → Supabase session.
- **Product catalog:** **moving to DB in Phase 8** (was static in `lib/products.ts`).
- **KYC review:** **moving to in-app admin queue in Phase 10** (was manual via Supabase dashboard).
- **Evmark:** live, `user='ipab'`, `api_source='iPAB'` (shared iPAB International account).
- **AI Tech Tips:** real OpenAI `gpt-4o-mini` behind `askLlm()` adapter (`src/lib/llm.ts`).
- **Deploy:** Vercel. Production domain **`ubeparipc.tech`**.
- **Refund policy (v1):** admin issues refund → posts a `payments` row with `kind='refund'`, `status='success'` + wallet credit entry. No automatic push back to MNO for v1 (Evmark refund API integration is v2); cash-out happens via manual bank transfer tracked in a `refunds` note field. Revisit once Evmark confirms refund-API support.
- **Glossary:** Wallet / KYC / AI Tech Tips kept English. "Hire-purchase" → "Lipa kidogo kidogo".

---

## Stack & conventions

- Next.js **16.2.4**, React 19, Tailwind v4, shadcn/ui, motion, next-themes.
- Supabase client: `@supabase/supabase-js` v2 only.
- **Next 16 breaking changes** — see `AGENTS.md`. `middleware.ts` → `proxy.ts`; `params` is a `Promise` (always `await`).
- Phone format **`255XXXXXXXXX`** (12 digits) everywhere.
- Credit math in `src/lib/credit.ts` — don't duplicate.
- **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SMS_PASSWORD`, `OPENAI_API_KEY`, every `EVMARK_*`) must never reach the browser. Only `NEXT_PUBLIC_*` is client-safe.
- Apple aesthetic: near-black surfaces, `rounded-full` pills, `tracking-tight` semibold. No RGB/gamer accents. **Admin uses the same aesthetic** — it's a part of the product, not a back-office afterthought.
- Every new admin action writes a row to `admin_audit_log` via a shared helper.

---

# Roadmap

Phases are ordered for real delivery: customer gaps first (quickest polish wins), then catalog migration (prerequisite for admin CRUD), then admin surface, then legal/compliance, then deploy.

Each phase has a **commit boundary** — the set of commits that land together when the phase closes.

---

## Phase 7 — Customer account surface  ✅ done

Fill the visible gaps on the authenticated user side. Small phase, high polish.

1. **Header auth menu.** Audit `site-header.tsx`. Signed-in users see avatar/name → dropdown with Profile, Orders, Wallet, Sign out. Signed-out users see Sign in / Sign up.
2. **`/account` page.** View: first/last name, phone (read-only, it's identity), email, KYC badge, credit limit, credit points, member-since date.
3. **`/account/edit` page.** Edit first name, last name, email. Not phone (identity). Not KYC data (goes through KYC resubmit). `PATCH /api/account` — zod-validated, RLS-scoped.
4. **`/orders/[id]` detail page.** Product snapshot, deposit + financed + fee breakdown, full installment schedule with paid/unpaid badges, link to pay next installment, payment history for this order. `GET /api/orders/[id]` already returns the right shape — extend if needed.
5. **`/account/payments` page.** All payments the user made (deposits + installments + topups + refunds) with date, amount, provider, reference, status. Filter by kind.
6. **Sign-out wiring.** Verify dropdown item posts `/api/auth/signout` then redirects to locale-aware home.
7. **Bilingual copy** added to `src/messages/{en,sw}.json` for everything above.

### Commit boundary
- `feat(account): profile view + edit`
- `feat(account): order detail + payment history`
- `feat(header): signed-in menu + signout`

---

## Phase 8 — Product catalog → Supabase  ✅ done

Prerequisite for admin product CRUD. Migrate the static TS catalog into DB tables without breaking existing order references (they join by slug, which survives).

1. **Migration `0002_products.sql`.** `products` + `product_images` tables per the schema section above. RLS: public `select` where `active=true`; writes service-role only.
2. **Storage bucket `product-images`** (public read, service-role write).
3. **Seed script.** One-off Node script (`scripts/seed-products.ts`) that reads `lib/products.ts` and inserts every product + downloads/uploads current images into Storage, preserving slugs. Run once, commit the script, never run again in prod.
4. **Rewrite `getProducts` / `getProduct` / `getFeaturedProducts`** to query Supabase. Same signatures — callers don't change. Use the anon client on the server; products are public.
5. **Image URLs** now come from Storage public URLs, not `/public`.
6. **Delete `RAW_PRODUCTS` array** from `lib/products.ts`; keep only the type exports and the getter functions (now DB-backed).
7. **Smoke test** `/store` and `/store/[slug]` in both locales — everything should look identical.

### Commit boundary
- `feat(db): products + product_images tables`
- `feat(storage): product-images bucket`
- `refactor(products): static catalog → supabase`
- `chore: seed products from static list (one-shot)`

---

## Phase 9 — Admin foundation  ✅ done

Shell, role gate, dashboard landing. No business logic yet — just the plumbing everything else sits on.

1. **`requireAdmin()` helper** in `src/lib/auth/admin.ts`. Reads session, loads `profiles.is_admin`, throws/redirects otherwise. Use on every server component under `/admin/*` and every route handler under `/api/admin/*`.
2. **`/admin` layout** — sidebar with Dashboard, KYC, Products, Users, Orders, Payments, Reports. Locale-aware (`/en/admin`, `/sw/admin`). Same Apple aesthetic.
3. **`/admin` dashboard page** — KPI cards:
   - Orders today / this week / this month
   - Active orders (status='active')
   - Overdue installments (unpaid + due_date < today)
   - Pending KYC count
   - Revenue (Σ payments.amount where kind in (deposit, installment) and status='success') — today / week / month
   - Low-stock products (stock < 3)
4. **`admin_audit_log`** table (migration `0003_admin_audit.sql`) + `logAdmin(action, target, diff)` helper.
5. **Grant yourself admin.** Document in the runbook: `update profiles set is_admin=true where phone='255XXXXXXXXX';` in SQL editor.
6. **Bilingual admin copy** under `src/messages/{en,sw}.json` → `admin.*` namespace.

### Commit boundary
- `feat(admin): role gate + shell + dashboard`
- `feat(db): admin_audit_log`

---

## Phase 10 — Admin: KYC review queue

Replace "approve via Supabase dashboard" with a real in-app flow.

1. **`/admin/kyc`** — list of `kyc_submissions` where `status='pending'`, sorted oldest first. Columns: submitted_at, legal name, NIDA (partial masked), workplace.
2. **`/admin/kyc/[id]`** — full submission detail, including a signed URL preview of the ID doc from the `kyc-documents` bucket (server-signed, short TTL).
3. **Approve / Reject actions** — `POST /api/admin/kyc/[id]/approve` and `/reject`. Approve: set `kyc_submissions.status='approved'`, `reviewed_at`, `reviewed_by`. Also flip `profiles.kyc_status='approved'`. Reject: same fields with `review_notes` required (why it was rejected). Both write `admin_audit_log`. Both trigger an SMS (via existing SMS gateway) to the user.
4. **Filters** — also view approved / rejected submissions (separate tabs or `?status=` query).
5. **Resubmit handling** — user with `kyc_status='rejected'` can re-open `/kyc` and submit again; a second row is inserted (status=pending). Admin list shows the latest.

### Commit boundary
- `feat(admin): KYC review queue + approve/reject`
- `feat(sms): kyc.approved + kyc.rejected notifications`

---

## Phase 11 — Admin: Product management

Full CRUD, including image upload. This is what makes the catalog live-editable.

1. **`/admin/products`** — list with search, filter by brand/active, sort by created_at, columns: image thumb, name (en), brand, cash_price, stock, active.
2. **`/admin/products/new`** + **`/admin/products/[id]`** — form with bilingual fields (name_en/sw, tagline_en/sw, description_en/sw), brand, cash_price_tzs, specs (structured: cpu, cpu_generation, ram, storage, gpu, display, os, weight), usage_tags (multi-select), stock, featured, active, color_accent.
3. **Image management** — drag-drop reorder, upload to `product-images` Storage, set alt_en/alt_sw, mark primary. `POST /api/admin/products/[id]/images` (multipart), `DELETE /api/admin/products/[id]/images/[imageId]`, `PATCH` for reorder.
4. **Slug** — autogenerated from name_en on create; editable but validated unique; locked once any order references it (to preserve history).
5. **Stock decrement** — when an order activates (deposit callback settles), decrement `products.stock`. Wire into the existing callback handler.
6. **Delete** — soft delete (`active=false`); hard delete blocked if any order references the slug. `admin_audit_log` on every action.

### Commit boundary
- `feat(admin): products list + create/edit form`
- `feat(admin): product image upload + reorder`
- `feat(orders): decrement stock on activation`

---

## Phase 12 — Admin: Users + credit limits

1. **`/admin/users`** — search by phone, name, email. Columns: phone, name, KYC status, credit_limit, credit_points, orders count, created_at.
2. **`/admin/users/[id]`** — profile view + edit credit_limit_tzs (with reason note → `admin_audit_log`), toggle is_admin (root admin only), see all orders, all payments, wallet balance, KYC history.
3. **`POST /api/admin/users/[id]/credit-limit`** — zod-validated, audit-logged.
4. **Root admin concept** — the first admin (seeded via SQL) can promote/demote others. Subsequent admins cannot toggle is_admin. Store via env `ROOT_ADMIN_PHONE` or a `profiles.is_root_admin` flag — pick one and document.

### Commit boundary
- `feat(admin): users list + detail + credit limit`
- `feat(admin): admin role management`

---

## Phase 13 — Admin: Orders + payments ops

Operational tools — what staff need when something goes wrong.

1. **`/admin/orders`** — list, filter by status, user, date. Columns: reference, user, product, total, status, created_at.
2. **`/admin/orders/[id]`** — full order detail, installment schedule with paid/unpaid/overdue, payment history, actions:
   - Manual activate (if deposit callback was lost) — calls the same settle path the callback uses, with `admin_audit_log`.
   - Cancel order (only if status='pending'; refund deposit if any).
   - Edit installment due dates (payment plan adjustment) — audit-logged.
3. **`/admin/payments`** — list, filter by status/kind/provider/date. Columns: ref, user, order, kind, amount, provider, status.
4. **Payment reconciliation.** Replace `/api/dev/simulate-callback` with a gated **`/api/admin/payments/[id]/reconcile`** that requires `is_admin` and records an audit log. Keep dev endpoint behind `NODE_ENV !== 'production'` as a safety net.
5. **Refunds.** On any `payments` row with `status='success'`, admin can **Issue refund**:
   - Insert new `payments` row with `kind='refund'`, `status='success'`, `amount_tzs = refund amount`, `order_id` preserved if applicable.
   - Insert matching `wallet_entries` credit — user sees it in their balance immediately.
   - `admin_audit_log` with reason.
   - Bank cash-out (if any) tracked manually in the audit-log diff; Evmark refund-API integration is v2.

### Commit boundary
- `feat(admin): orders list + detail + manual activate`
- `feat(admin): payment reconciliation (replaces dev endpoint in prod)`
- `feat(admin): refunds (wallet credit)`

---

## Phase 14 — Admin: Reports

Enough for the business to run without SQL access.

1. **`/admin/reports/revenue`** — daily/weekly/monthly bar chart of successful payment amounts, split by kind (deposit / installment / topup) and provider (mpesa / tigopesa / airtelmoney). CSV export.
2. **`/admin/reports/receivables`** — outstanding balance per active order = Σ(unpaid installments). Total outstanding, aged buckets (0–30, 31–60, 61–90, 90+ days overdue). CSV export.
3. **`/admin/reports/inventory`** — stock by product, low-stock flag.
4. **`/admin/reports/kyc`** — throughput: submissions per week, approval rate, median time-to-review.
5. **CSV export** helper in `src/lib/export/csv.ts` — streams, no client-side libraries.

### Commit boundary
- `feat(admin): revenue + receivables + inventory + kyc reports`
- `feat(admin): csv export`

---

## Phase 15 — Legal, compliance, account lifecycle

Real product needs real legal pages and real account lifecycle.

1. **Legal pages** — `/legal/terms`, `/legal/privacy`, `/legal/hire-purchase-agreement`. Bilingual. Draft content with the user (they provide or approve); replace current footer 404s. Versioned — store version string users accepted at signup.
2. **Signup consent** — checkbox at `/signup` referencing the three legal pages. Store `profiles.terms_version_accepted` and `terms_accepted_at`.
3. **`/account/delete`** — user-initiated account deletion. Soft delete: anonymize profile (null phone/email, random suffix on names), wipe KYC Storage docs, keep orders/payments for accounting retention (legal requirement). Confirmation OTP to prevent accidental deletion.
4. **`/account/export`** — data export per request. ZIP of user's JSON: profile, orders, installments, payments, wallet entries, KYC (without doc binary).
5. **Cookie/consent banner** — minimal (we only use functional cookies — session + theme — so this is disclosure not tracking consent).

### Commit boundary
- `feat(legal): terms + privacy + hire-purchase agreement`
- `feat(account): delete + data export`
- `feat(signup): terms consent + version tracking`

---

## Phase 16 — Observability, scale, hardening

Everything we deferred for prototype but need before growth.

1. **Error tracking.** Sentry (or Axiom — decide; Sentry has a better free tier for error volume). Wire both server and browser. Feed `logEvent` lines to it.
2. **Distributed rate limits.** Upstash Redis for OTP IP limits (currently in-memory — breaks across Vercel regions). Replace `src/lib/rate-limit.ts`.
3. **`supabase gen types typescript --project-id zlvcpaiyjshsjglqicvy`** → replace hand-rolled `src/lib/supabase/types.ts`. Commit the generated file.
4. **E2E tests.** Playwright on the golden paths: signup → KYC → order → pay. Run in CI on PR.
5. **Lighthouse / accessibility pass** on landing, store, account, admin. Fix `<img>` alts, contrast issues, keyboard nav.
6. **Next-themes warning fix** — upgrade when upstream ships React 19 fix.
7. **Seed data for local dev** — `scripts/seed-dev.ts` creates a test admin + a few test users + some products. Gated on `NODE_ENV !== 'production'`.

### Commit boundary
- `feat(obs): sentry`
- `feat(infra): upstash rate limits`
- `chore(db): generated types`
- `test(e2e): playwright golden paths + CI`

---

## Phase 17 — Production deploy

Only when Phases 7–16 are done does this phase make sense. Deploying before admin is built means ops happen via Supabase dashboard — which we've moved past.

1. **Vercel project.** Import `mageuzialbert/ubepari_wallet`. Env vars for **Production** + **Preview**:
   - `NEXT_PUBLIC_SITE_URL=https://ubeparipc.tech`
   - `EVMARK_MNO_CALLBACK_URL=https://ubeparipc.tech/api/payments/mno/callback`
   - `EVMARK_CARD_CALLBACK_URL=https://ubeparipc.tech/api/payments/card/callback`
   - All Supabase, SMS, OpenAI, Evmark, Maps, Sentry, Upstash keys from `.env.local`.
2. **DNS** — `ubeparipc.tech` (apex + `www`) → Vercel.
3. **Evmark callback allowlist** — share `https://ubeparipc.tech/api/payments/mno/callback` with Evmark if required.
4. **Smoke tests** (both locales, both themes) — full signup → KYC (admin-approve via `/admin/kyc`) → store → reserve → deposit callback lands → order activates → wallet activity shows debits/credits → top-up → pay installment → `/recommend` prompt.
5. **Security checklist.**
   - GCP Maps API key → restrict by HTTP referrer to `*.ubeparipc.tech`.
   - OpenAI → monthly spending cap.
   - `grep -r SUPABASE_SERVICE_ROLE_KEY .next/static || echo clean` — must print `clean`.
   - With anon key: `select from otp_challenges` / `admin_audit_log` must return empty (RLS).
   - Confirm `/api/dev/*` returns 404 in production build.
6. **Runbook appendix** added to this file: how to approve KYC, issue refund, reconcile stuck payment, adjust credit limit, onboard new admin, rotate Evmark credentials, restore from Supabase backup.

### Commit boundary
- `chore(deploy): vercel + prod env wiring`
- `docs: production runbook`

---

## v2 backlog (after Phase 17)

Pulled out of scope on purpose to keep the roadmap shippable.

- Evmark card flow (Visa/Mastercard) + reconciliation + 3DS.
- Evmark refund-API integration (so refunds push back to MNO automatically).
- Google Maps — showroom pickup + KYC address autocomplete.
- Referral program (footer stub today).
- ICU plural lib if copy grows beyond single/plural.
- Push notifications (browser) for order/payment state changes.
- Admin bulk actions (multi-approve KYC, batch refund).
- Inventory alerts (email/SMS when stock hits threshold).
- Customer SMS receipts on every payment.
- Scheduled auto-debit of installments on due date from wallet balance if funded.

---

## Credentials

Live values in `.env.local` (gitignored). Placeholders in `.env.local.example`. Covers SMS gateway, Evmark, OpenAI, Google Maps, Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`). After Phase 16 add Sentry DSN + Upstash URL/token.

**Never-commit list:** `.env.local`, anything matching `.env*` other than `.env.local.example` (placeholder-only).

---

## Next agent: start here

1. Read `CLAUDE.md`, `AGENTS.md`, and this file.
2. Read `MEMORY.md` for the user's working preferences + project context.
3. Confirm `.env.local` has Supabase + SMS + Evmark + OpenAI filled.
4. **Begin Phase 10 (KYC review queue).** Build on the admin shell in `src/app/[locale]/admin/` — new routes `/admin/kyc` and `/admin/kyc/[id]`, approve/reject routes under `/api/admin/kyc/`, and SMS notifications on both outcomes.
5. Update the snapshot commit trail with each SHA as phases land. Update the "Status" line at the top when a phase closes.

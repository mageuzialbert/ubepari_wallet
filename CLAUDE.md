@AGENTS.md

# Ubepari Wallet — project rules

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui + motion + next-themes. Supabase + Evmark planned. Dark theme is default.

**Reference docs are in `docs/`.** Proposal PDF and Evmark API docs (payment gateway, card API, Postman collection) live there. Consult before writing payment code.

**Currency is TZS.** Use `formatTzs()` from `@/lib/currency`. Prices are integers (no decimals — TZS has no subunits in common use).

**Credit plan logic** lives in `@/lib/credit.ts`. 20% deposit, term-based service fee (0% / 5% / 8% / 12% for 3/6/9/12 months). Monthly rounded up to nearest 1,000 TZS.

**Phones** are stored and sent as `255XXXXXXXXX` (12 digits, no `+`) — Evmark's required format.

**Apple-inspired aesthetic:** near-black surfaces in dark mode, generous whitespace, large editorial type (`tracking-tight`, semibold, not bold), OKLCH neutral palette, pill-shaped buttons (`rounded-full`). Do NOT introduce gamer-RGB or aggressive color accents.

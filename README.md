# Ubepari Wallet

Premium PC hire-purchase for Tanzania. Pay a 20% deposit via M-Pesa, Tigo Pesa, Airtel Money, or card — own the PC today, settle the rest from your Ubepari Wallet.

Built by [iPAB International](https://ipab.co.tz) for Ubepari PC.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives, OKLCH tokens)
- **motion** for scroll-linked and enter animations
- **next-themes** with dark default + light toggle
- Target backend: **Supabase** (Postgres + Auth + Storage)
- Payments: **Evmark** (M-Pesa / Tigo Pesa / Airtel Money + card)
- AI: **Claude API** primary, OpenAI fallback
- Hosting: **Vercel** (auto-deploy from `mageuzialbert/ubepari_wallet`)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes (prototype)

| Path | Purpose |
|---|---|
| `/` | Cinematic landing — hero, featured PCs, how-it-works, AI CTA |
| `/store` | Catalog with usage/brand/price filters |
| `/store/[slug]` | Product detail + interactive credit calculator |
| `/wallet` | Ledger, progress, top-up dialog (M-Pesa / Tigo / Airtel / Card) |
| `/orders` | Active installments + repayment schedule grid |
| `/recommend` | AI Advisor input (static match for prototype) |
| `/kyc` | NIDA / passport upload flow |
| `/support` | WhatsApp / call / email channels + FAQ |
| `/signin`, `/signup` | Phone OTP stubs |

## Project layout

```
src/
├── app/                  # Next.js App Router routes
├── components/
│   ├── landing/          # Hero, featured PCs, how-it-works, AI CTA, trust strip
│   ├── product/          # Product card, filter rail, credit calculator
│   ├── wallet/           # Top-up dialog
│   ├── ui/               # shadcn primitives
│   ├── site-header.tsx
│   ├── site-footer.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
└── lib/
    ├── products.ts       # PC catalog seed data
    ├── credit.ts         # Installment plan calculator (20% deposit + term-based fee)
    ├── currency.ts       # TZS formatter
    ├── mock-wallet.ts    # Demo wallet + orders data
    └── nav.ts            # Primary nav config
```

## Reference docs

- **Proposal:** `docs/Ubepari_PC_Proposal.pdf`
- **Evmark payments:** `docs/evmark_doc/` — Payment Gateway PDF, Card API PDF, Postman collection

## Roadmap after prototype

- Supabase schema + auth (phone OTP)
- Evmark collection + payout integration (replace `top-up-dialog` mock with real API)
- Claude-powered `/recommend` with product knowledge base
- Admin console (`/admin/*`) — KYC queue, credit approvals, inventory, collections dashboard
- SMS reminders (Twilio / BulkSMS TZ)
- Digital contract e-sign on checkout
- Referral rewards
- React Native Android app (per PDF)

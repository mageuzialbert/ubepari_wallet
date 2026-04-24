# Ubepari Mobile

Client-facing React Native app for the Ubepari Wallet layaway platform. Mirrors the Next.js web app (`../`) in an Apple-inspired native experience.

## Stack

- Expo SDK 54 (managed) + Expo Router v4
- NativeWind v4 (consumes the same OKLCH tokens as the web `globals.css`)
- TanStack Query v5 + Zustand
- react-hook-form + zod
- react-native-sse for the streaming AI assistant
- expo-secure-store for JWT storage (bearer auth)

## Setup

```bash
cd mobile
cp .env.example .env
npm install
npm run start
```

The app calls the web's REST API at `EXPO_PUBLIC_API_URL`. See the plan at `.claude/plans/clients-want-simple-and-fancy-squid.md` for full architecture.

## Folder structure

```
app/            Expo Router file-based routes
  (onboarding)/ Welcome
  (auth)/       Sign-in, sign-up, OTP, reset
  (tabs)/       Store, Goals, Assistant, Profile
  kyc.tsx
  legal/        Privacy, Terms (WebView)
src/
  api/          REST client + typed per-resource modules
  auth/         Token storage, Zustand store, AuthGate
  components/   UI primitives + feature components
  theme/        Design tokens mirror
  i18n/         en/sw dictionaries + i18next setup
  lib/          currency, phone, sse, haptics, errors
  types/        API response shapes
```

## Auth

The backend accepts both cookie (web) and `Authorization: Bearer` (mobile) thanks to `getSessionFromRequest()` in `../src/lib/session.ts`. Auth endpoints (`/api/auth/otp/verify`, `/api/auth/password/login`, `/api/auth/password/reset/confirm`) return `{token, expiresAt}` in the body, which mobile stores in `expo-secure-store`.

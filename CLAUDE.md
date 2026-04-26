# Hopsell

> Sell any file. Keep 95%. No subscriptions, no listing fees. Domain: hopsell.shop.

A single-seller marketplace built on React Router 7 + Better Auth + Drizzle +
Stripe Connect Express + Bunny Storage.

## Tech Stack

- **Framework**: React 19 + React Router 7 (SSR enabled)
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4 + custom `--color-hop-*` tokens
- **Language**: TypeScript 5.9 (strict mode)
- **Auth**: Better Auth + magic-link plugin (passwordless only)
- **DB**: Drizzle ORM over libsql (local: `file:dev.db`, prod: Bunny Database)
- **Storage**: `@bunny.net/upload` (presigned PUT) + `@aws-sdk/client-s3` (presigned GET)
- **Payments**: Stripe Connect Express + Stripe Checkout (destination charge, 5% fee)
- **Email**: Resend + React Email

## Project Structure

```
app/
  components/      # Buttons, inputs, header, dropzone, etc.
  db/              # Drizzle schemas (auth-schema, marketplace-schema, email-log-schema)
  emails/          # React Email templates
  lib/             # *.server.ts for server-only code
  routes/          # React Router 7 explicit-config routes
```

## Path Aliases

`~/` maps to `./app/` — use `~/components`, `~/lib`, `~/db`, etc.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run typecheck` — typegen + tsc
- `npm run db:push` — push schema (local dev)
- `npm run db:generate` / `npm run db:migrate` — migrations (prod)
- `npm run db:studio` — open Drizzle Studio
- `npm run email:dev` — preview email templates

## Conventions

- **Server-only code**: `.server.ts` suffix to keep it out of the client bundle
- **Routes**: explicit registration in `app/routes.ts`, modules in `app/routes/`
- **Route types**: import from `./+types/<route-name>` (auto-generated)
- **Components**: app components in `app/components/`
- **Styling**: Tailwind utility classes; design tokens are `--color-hop-*` (bg, surface, border, text, muted, hover) defined in `app/app.css`. Use Tailwind utilities like `bg-hop-bg`, `text-hop-text`, `border-hop-border`
- **Numbers**: use `tabular-nums` on any UI showing counts/prices
- **Env vars**: see `.env.example`. Local dev needs only `BETTER_AUTH_SECRET`; Stripe / Bunny vars unlock those features

## Domain Model

- `user` — Better Auth managed; extended with `storagePrefix`, `stripeAccountId`, `stripeAccountStatus`, `chargesEnabled`, `payoutsEnabled`
- `products` — slug, title, price, file metadata, `status` (`pending_connect | live | paused`)
- `orders` — Stripe session, download token, status (`paid | refunded | failed`)

Storage paths follow `products/{user.storagePrefix}/{product.id}/{file_id}.{ext}`.

## Auth flow note

Sellers don't sign up before dropping a file — the `_index` action does
find-or-create on email then synthesises a magic-link `verify` Response so the
seller is logged in immediately. The pre-auth cookie holds the storagePrefix
for unauthenticated upload paths so the file lands in the seller's prefix
once they're created.

## Stripe Webhooks

| Event | Endpoint |
|---|---|
| `account.updated` | `/api/webhooks/stripe-connect` (flips products to `live`) |
| `checkout.session.completed` | `/api/webhooks/stripe` (creates order, sends emails) |
| `charge.refunded` | `/api/webhooks/stripe` (marks order refunded) |

# VoidAccount — Telegram Accounts Shop

Telegram-бот для продажи аккаунтов с WebApp магазином, админ-панелью и интеграцией LolzTeam Market.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run API server + bot (port 8080)
- `pnpm --filter @workspace/admin-panel run dev` — run admin panel (port 20130)
- `pnpm --filter @workspace/tg-shop run dev` — run Telegram WebApp shop (port 24512)
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Grammy (Telegram Bot API)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Frontend: React 19 + Vite + Tailwind CSS
- Bot: Grammy.js
- Telegram API: MTProto (telegram npm package)

## Where things live

- **API Server**: `artifacts/api-server/src/` — Express backend + bot logic
  - `bot/index.ts` — Telegram bot handlers
  - `routes/` — API endpoints (auth, accounts, orders, lolz, balance, users, sessions, stats)
  - `app.ts` — Express app setup
- **Admin Panel**: `artifacts/admin-panel/src/pages/` — React admin dashboard
  - `dashboard.tsx` — stats dashboard
  - `accounts.tsx` — account management
  - `orders.tsx` — orders view
  - `settings.tsx` — bot settings
  - `users.tsx` — user balances
  - `sessions.tsx` — Telegram sessions
- **TG Shop**: `artifacts/tg-shop/src/pages/` — WebApp mini-app for Telegram
  - `catalog.tsx` — account catalog
  - `account-detail.tsx` — account purchase
  - `orders.tsx` — order history
- **DB Schema**: `lib/db/src/schema/` — Drizzle ORM tables
  - `accounts.ts` — accounts table
  - `orders.ts` — orders table
  - `bot_settings.ts` — bot configuration
  - `user_balances.ts` — user balances
  - `telegram_sessions.ts` — MTProto sessions
- **Zod Schemas**: `lib/api-zod/src/generated/api.ts` — API validation schemas

## Architecture decisions

- Bot and API share the same Express server — same port, shared DB connection
- WebApp auth uses Telegram initData validation — no separate auth needed for Telegram users
- Admin panel uses JWT with hardcoded credentials + Telegram WebApp auth fallback
- LolzTeam API integration for auto-import, confirm codes, session reset, and tdata download
- MTProto sessions for requesting login codes on buyer's behalf
- Balance system allows purchasing with internal balance or Telegram Stars

## Product

- **Telegram Bot**: `@VoidAccountBot` — sells Telegram accounts via bot commands and WebApp
- **WebApp Shop**: Mini-app inside Telegram for browsing and buying accounts
- **Admin Panel**: Full dashboard for managing inventory, orders, settings, and users
- **Auto-delivery**: LolzTeam integration for automatic account delivery (code + tdata)
- **Payment**: Telegram Stars, internal balance, free accounts
- **Session Management**: MTProto sessions for login code retrieval

## User preferences

- Admin login: `Void` / `Clock358`
- Bot token: stored in Replit Secrets as `TELEGRAM_BOT_TOKEN`

## Gotchas

- If bot token is invalid (401), server continues running but bot won't respond — check token in BotFather
- Run `pnpm --filter @workspace/db run push` after any schema changes
- API server must be running before admin panel or tg-shop can work
- LolzTeam API key must be set in bot settings for auto-import/delivery
- `telegram` and `grammy` packages are externalized in build — need to be installed at runtime

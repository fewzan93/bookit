# Bookit — Booking & Event Ticketing Platform

Production-grade, responsive event ticketing platform: browse events, pick seats on a **live map with real-time locking**, pay (Stripe or built-in dev simulator), and get **HMAC-signed QR tickets** the organizer can scan at the door.

Monorepo: `client/` (React + Vite + Tailwind + shadcn + RTK Query) · `server/` (Express + Mongoose + Socket.io + node-cron).

## Features

- Live interactive SVG seat map — 8-minute seat locks, heartbeat extension, cross-client broadcasts (Socket.io)
- Checkout with Stripe Checkout sessions + signed webhook; **dev payment simulator** when `STRIPE_SECRET_KEY` is absent
- Promo codes + automatic 10% group discount at 5+ seats (pure pricing engine, unit-tested)
- Tickets: QR (rotatable, tamper-proof HMAC strings) + pdfkit PDF download
- Organizer camera **check-in scanner** (html5-qrcode) with valid/used/expired/invalid outcomes
- Dynamic tier pricing (`afterPrice` after `activeUntil` or capacity), waitlist queues with FIFO email notify
- nodemailer confirmations + 24h reminders and unpaid-booking expiry (node-cron)
- Analytics dashboard (revenue, sales, attendance, peak hours in Recharts) + Orders/Attendees CSV export
- Social sharing (Telegram/WhatsApp/X/LinkedIn) + OpenGraph meta, Google/Apple calendar (.ics)

## Requirements

- Node >= 20.19, npm
- MongoDB running locally (`mongodb://localhost:27017/bookit`) or via Docker (`docker compose up -d mongo`)

## Setup

```bash
# install all workspaces
npm install

# server env
cp server/.env.example server/.env

# run both (two terminals)
npm run dev:server   # API on http://localhost:5000
npm run dev:client   # web on http://localhost:5173
```

Optional `server/.env` values:

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | real Stripe test/live keys → real Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | verify webhooks (`stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe`) |
| `CLOUDINARY_CLOUD_NAME/_KEY/_SECRET` | banner uploads to Cloudinary; leave empty → local `server/uploads` |
| `SMTP_HOST/PORT/USER/PASS` | real emails; leave empty → emails log to console |
| `JWT_SECRET` | change in production! |
| `PUBLIC_URL` / `CLIENT_ORIGIN` / `STATIC_URL` | URLs used for redirects/CORS/static |

## Demo data

```bash
npm run seed -w server        # demo users, venue, 3 published events + seat plans
npm run seed:promo -w server  # promos EARLY10 (10%), GROUP5 (10% min 5)
```

Demo accounts (dev only):

| Role | Email | Password |
|---|---|---|
| Organizer | `org@bookit.dev` | `password123` |
| Attendee | `demo@bookit.dev` | `demo123` |
| Admin | `admin@bookit.dev` | `admin123` |

## Payments

- **No keys** → checkout shows "Pay in dev mode" and confirms instantly.
- **Stripe test keys** → real Checkout; confirmations arrive via webhook (set `STRIPE_WEBHOOK_SECRET` + run `stripe listen`). Refunds hit the Stripe API; dashboard-side refunds are detected and synchronized as already-refunded.

## Scripts

| Script | What |
|---|---|
| `npm run dev` / `build` / `typecheck` / `lint` / `test` | workspace-wide |
| `npm run seed -w server` | demo data |
| `node server/scripts/seat-smoke.mjs` | seat lock/broadcast E2E |
| `node server/scripts/bookings-smoke.mjs` | booking → promo → dev pay → refund |
| `node server/scripts/tickets-smoke.mjs` | QR → scan → rotate → PDF (use `SMOKE_BASE` for an isolated instance) |
| `node server/scripts/waitlist-smoke.mjs` | sold-out → waitlist → FIFO notify → .ics |
| `node server/scripts/cleanup-legacy-indexes.mjs` | drop stale dev collections (seats/tickets) |

## API quick walkthrough

1. `POST /api/v1/auth/register` → sets `bookit_token` httpOnly cookie
2. `GET /api/v1/events` (public, filters: `category|query|city|maxPrice|sort|page|lng/lat/radiusKm`)
3. Socket.io (cookie-authenticated): `seatmap:join` → `seat:lock {eventId, seatIds}` → `seats:state` broadcasts
4. `POST /api/v1/bookings` (all seats must be locked by you — 30-min payment hold)
5. `POST /api/v1/bookings/:ref/checkout` → Stripe URL (or `:ref/dev-confirm` in dev)
6. Webhook → seats `booked`, tier `sold` incremented, tickets auto-issued
7. `GET /api/v1/tickets/:ref` → QR payload · `POST /tickets/scan` (organizer) → check in
8. Cancel/refund → seats released → **waitlist FIFO notify** + email

## Production notes

- `JWT_SECRET`, Stripe, SMTP, Cloudinary keys must be set; `NODE_ENV=production` flips cookies to Secure.
- Mongo transactions require a replica set; the app detects standalone MongoDB and degrades gracefully (dev).
- `npm run build` produces `client/dist` (static) + `server/dist` (`node dist/server.js`).

Built phase-by-phase per `plans/bookit-plan.md` · roadmap tracker in `todo.md`.

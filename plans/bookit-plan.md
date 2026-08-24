# Bookit â€” Architecture & Execution Plan

**Product:** Booking & Event Ticketing Platform (production-grade, responsive, modern)
**Date:** 2026-08-23
**Status:** Approved roadmap â€” phased execution, backend-first

---

## 1. Decisions (confirmed)

| Decision | Choice |
|---|---|
| Payments | **Stripe only** (Card + wallet, Checkout mode; `STRIPE_MODE=dev` local fallback) |
| Media storage | **Cloudinary** (banners, uploaded via multer â†’ cloudinary SDK) |
| Repo layout | **Monorepo** (`client/` + `server/` via npm workspaces) |
| Scope | **Full spec**, all 7 feature groups, phased |
| Database | MongoDB (local `mongodb://localhost:27017/bookit`, docker-compose fallback) |
| Language | TypeScript on both client and server |

## 2. Tech Stack

**Frontend:** React 18 + Vite, react-router-dom v6 (nested routing), RTK + RTK Query (+ react-redux), Tailwind CSS v4, Radix/shadcn-style UI primitives, Framer Motion, Lucide React, Recharts, clsx + tailwind-merge, socket.io-client, html5-qrcode (scanner), jspdf/QrCode UI (ticket view).

**Backend:** Node + Express (modular MVC), Mongoose (validated schemas, geospatial points, transaction sessions), zod middleware, JWT httpOnly cookies + bcryptjs, RBAC (user/organizer/admin), Socket.io (seat locking, live availability, check-in), node-cron (reminders/waitlist drain/tier expiry), nodemailer, pdfkit (PDF tickets), qrcode, Stripe SDK, Cloudinary SDK, multer, helmet/cors/rate-limit.

## 3. Repo Architecture

```
bookit/
â”œâ”€â”€ todo.md                      # execution roadmap (one task at a time + checkpoints)
â”œâ”€â”€ plans/bookit-plan.md         # this document
â”œâ”€â”€ package.json                 # npm workspaces root (scripts: dev/build/typecheck/lint/test)
â”œâ”€â”€ docker-compose.yml           # mongo:7 service
â”œâ”€â”€ .gitignore
â”œâ”€â”€ client/
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ app/                 # store, typed hooks (useAppDispatch/useAppSelector)
â”‚       â”œâ”€â”€ features/
â”‚       â”‚   â”œâ”€â”€ auth/            # authSlice, api.ts, pages (login/register), RouteGuard
â”‚       â”‚   â”œâ”€â”€ events/          # public grid, detail, organizer CRUD
â”‚       â”‚   â”œâ”€â”€ venues/          # venue/seat-plan management
â”‚       â”‚   â”œâ”€â”€ seats/           # interactive SVG seat map, seatRSlice
â”‚       â”‚   â”œâ”€â”€ checkout/        # cart, countdown, promo/group discount, Stripe
â”‚       â”‚   â”œâ”€â”€ tickets/         # my tickets, QR view, PDF download
â”‚       â”‚   â”œâ”€â”€ organizer/       # scanner route, check-in, refunds, exports
â”‚       â”‚   â”œâ”€â”€ waitlist/        # join/leave UI
â”‚       â”‚   â””â”€â”€ dashboard/       # analytics (Recharts)
â”‚       â”œâ”€â”€ components/ui/       # shadcn-style primitives (button, input, dialog...)
â”‚       â”œâ”€â”€ components/layout/   # Navbar, Footer, Container
â”‚       â”œâ”€â”€ lib/                 # api client (RTK Query base), socket.ts, utils (cn via clsx+twMerge), calendar .ics helper
â”‚       â””â”€â”€ pages/...routes.tsx  # router tree
â””â”€â”€ server/
    â””â”€â”€ src/
        â”œâ”€â”€ config/           # env.ts (zod), db.ts, cloudinary.ts, stripe.ts
        â”œâ”€â”€ models/           # User, Event, Venue, Seat, Booking, Ticket, Waitlist, Transaction, PromoCode
        â”œâ”€â”€ controllers/      # thin, request/response only
        â”œâ”€â”€ services/         # business logic (auth, booking, seats, waitlist, tickets, analytics, pricing)
        â”œâ”€â”€ routes/           # versioned: /api/v1/
        â”œâ”€â”€ middlewares/      # auth (JWT cookie), rbac, validate (zod), errorHandler, notFound, rateLimit
        â”œâ”€â”€ sockets/          # seatLockEngine.ts, checkIn.ts, index.ts
        â”œâ”€â”€ jobs/             # cron: emailReminders, waitlistDrain, tierExpiry
        â”œâ”€â”€ utils/            # ApiError, asyncHandler, jwt, htmlTo?, ics.ts, csv.ts, pdfTicket.ts, qr.ts
        â”œâ”€â”€ seed/             # demo users/events/venue + seat plan
        â””â”€â”€ app.ts / server.ts
```

**API response standard:** `{ success: boolean, message?: string, data?: T, errors?: ZodIssue[] }`
**Error strategy:** central errorHandler + `ApiError(status, message)`; zod `validate` middleware; 200/4xx maps, never raw stack to client.

## 4. Data Model Highlights

| Model | Key fields |
|---|---|
| User | email, passwordHash, name, role (`user\|organizer\|admin`), phone, avatar, createdAt |
| Event | title, slug, description, category, banner {url, publicId}, venueId (ref), startsAt, endsAt, status (draft/published/cancelled/soldout), tiers[], location {point: GeoJSON point (2dsphere), address}, totalCapacity |
| EventTier (subdoc) | name (VIP/Regular/EarlyBird), price, capacity, sold, dynamic expiry rules {expiresAt, capacityLimit} |
| Venue | name, type (concert/theater/stadium), config: sections[] {id, name, tierId, rows[], cols, rowPattern, firstNumber}, image |
| Seat | eventId, venueId, sectionId, row, number, tierId, status (available/locked/booked/disabled), lockedBy/userId + lockedUntil (TTL index) |
| Booking | bookingRef (unique), userId, eventId, items[] {seatId, tierId, price}, promoCode, groupId (split), total, currency, status (pending/confirmed/cancelled/expired), paidAt, paymentProvider, providerRef |
| Ticket | bookingId, userId, eventId, seatId, qrToken (hashed, unique, rotated), status (valid/used/cancelled), checkedInAt, pdfUrl |
| Waitlist | eventId, tierId, userId, status (queued/notified/fulfilled/expired), joinedAt, FIFO position |
| Transaction | bookingId, ref, amount, status (pending/succeeded/failed/refunded/reversed), provider, rawWebhook, createdAt |
| PromoCode | code, type (percent/fixed), value, appliesTo (tier/event), minQuantity, maxUses, usedCount, active |

**Integrity:** Seat liveness via `lockedUntil` expiry; booking create inside Mongoose session with atomic seat status flip; unique indexes prevent double-ticket issuance.

## 5. Roadmap (backend-first, checkpoints after each task)

- **Phase 0 â€” Scaffolding:** monorepo root + server skeleton (config/middleware/health/socket bootstrap) + client skeleton (Vite/TS/Tailwind/router). Verify: install, typecheck, lint, build.
- **Phase 1 â€” Auth & RBAC:** User model, JWT cookie auth service/controllers, rbac + validate middleware; client auth slice, login/register, RouteGuard.
- **Phase 2 â€” Events & Venues:** Event/Venue/Tier models + CRUD, Cloudinary upload, public list/detail + geospatial search; client home grid, event detail, organizer CRUD.
- **Phase 3 â€” Seat Map + Real-time:** Seat plan generation, Socket.io SeatLockEngine (5â€“10 min locks, heartbeat, broadcast), interactive SVG seat map UI (tiers/states/countdown).
- **Phase 4 â€” Checkout & Stripe:** session-secure booking service, Stripe Checkout + webhook upsert, checkout UI w/ lock countdown, promo + group discount engine (auto 10% @ 5+), booking history, cancel/refund.
- **Phase 5 â€” Tickets & Scanner:** QrToken generation, pdfkit PDF tickets, my-tickets page, organizer camera scanner route w/ socket-broadcast check-in.
- **Phase 6 â€” Waitlist, Pricing, Notifications:** dynamic tier expiry waitlist queues + FIFO notify drain, nodemailer confirm/reminder emails (node-cron 24h), .ics calendar links (Google/Apple).
- **Phase 7 â€” Analytics & Social:** aggregate analytics (sold/revenue/attendance/peak hours), Recharts dashboards, CSV export, social share + OpenGraph meta.
- **Phase 8 â€” Hardening:** responsive audit, loading/error/empty states, seeds + demo data, README, final full verification sweep.

## 6. Self-Verification Protocol (every task)

1. `npm run typecheck` (tsc --noEmit, both workspaces) â€” zero errors
2. `npm run lint` (eslint flat config, both workspaces) â€” zero issues
3. `npm run build` (server tsc + client vite) â€” clean bundle
4. `npx vitest run` where core logic exists (seat locking, pricing, waitlist, split engine)
5. Fix root cause myself; only then pause for manual verification (Postman / browser) and await **APPROVED** to continue.

## 7. Phase Notes Log


- **Phase 0**: MongoDB confirmed running locally at mongodb://localhost:27017/bookit (no docker needed). ESLint flat config set to ignore ^_ prefixed args (Express middleware signatures). Server dev mode: 
pm run dev:server (tsx watch), client: 
pm run dev:client (Vite 5173). API standard { success, message, data?, errors? } + ApiError in place. Phase 1 routes mount inside /api/v1 in server/src/app.ts.
- **Phase 1**: Auth = cookie ookit_token (httpOnly, sameSite lax, 7d, secure in prod), JWT payload { sub, email, role }. Routes: POST /auth/register (name/email/password/role, role limited to user|organizer on signup), POST /auth/login, POST /auth/logout, GET /auth/me. uthRequired reads cookie first then Bearer header; RBAC via equireRoles(...). Client: uthApi (RTK Query, credentials: 'include'), uthSlice wired via isAnyOf matchers, RouteGuard gates authenticated routes, boot-time getMe hydrate in App. Verified: register 201 + cookie, me 200, bad login 401, logout 200 (PowerShell smoke).
- **Phase 2**: Venue (type, address/city, geo 2dsphere, seat config stub for Phase 3), Event (slug gen uniqueSlug, banner {url,publicId}, tiers[] with tierId/price/currency/capacity/sold/activeUntil, organizerId, geo). Public list via aggregation $lookup (venue, organizer) + optional $geoNear; sort date|price|name; count pipeline kept count-only (skip/limit excluded). Owner enforcement via ssertOwner; uthOptional lets owners see drafts by key. Uploads: multer memory (5MB, image mime) → Cloudinary if env keys present, else file-to-disk server/uploads served at /uploads (STATIC_URL). Routes: GET/POST /api/v1/venues (organizer), GET /api/v1/events (public, zod-validated query), GET /mine, POST/PATCH/DELETE, GET /:id/related, GET /:key, POST /api/v1/upload/banner. Verified: venue create, banner upload (local) 201, event create (2 tiers + activeUntil), category filter, slug detail, geoNear 200km, mine. Client: eventsApi (Events/Venues tags), searchable Home (chips, sort, Near-me geolocation), EventDetail (tier bars, sold progress, related), Studio (DashboardLayout, EventsList w/ publish toggle + delete, EventForm w/ inline venue create + banner upload + tier editor). Note: test DB held 3 pre-existing events (no tiers) from earlier session testing — priceFrom shows null → client renders 'Free'; seeds will replace them in Phase 8.
- **Phase 3**: Seat model (eventId/venueId/sectionId, row A-Z, number, tierId, status enum, lockedBy/lockedUntil, unique per-event seat key). Plan generated lazily on first GET /events/:id/seats (idempotent ensurePlan, force-regeneration supported; seats derived from enue.config.sections → sec-* ids, rows A..N, numbers from startNumber; 24–2500 seats). Socket.io: auth via JWT cookie parsed from WS handshake (esolveSocketUser), rooms event:{id}, events: seatmap:join/leave, seat:lock (atomic indOneAndUpdate + extend-if-mine, max 10 seats, ack w/ conflicts), seat:release, seat:heartbeat (extend while <4 min left), inbound seats:state broadcast; in-memory expiry timers + DB lockedUntil fallback (normal index — NOT TTL, which would delete the seat doc). Default lock 8 min (within 5–10 window), ExpireLock uses lockedUntil <= now condition. Client: lib/socket.ts singleton (withCredentials), seatMapSlice (seats cache, selected, expiresAt, error), SVG SeatMapView (tier palette, locked=amber L, booked ×, disabled hidden, selected ✓, overflow-x scroll, stage banner), SeatSelection page w/ sticky selection bar (chips+total, mm:ss countdown, release all, heartbeat), lock-conflict auto-deselect + refetch, unmount auto-release (via ref snapshot). Studio: EventForm gains seat-sections editor (name/tier/rows/cols/start#) passed as enue.config.sections. Verified by scripts/seat-smoke.mjs: 2 sockets, lock ack (480s), cross-client broadcast, HTTP locked state, release. Legacy stale seats collection (user's earlier env) dropped via scripts/cleanup-seats.mjs.
- **Phase 4**: Booking (bookingRef BK-XXXXXX unique, eventSnapshot frozen copy, items[] w/ seatLabel/tier/price, promoDiscount/groupDiscount/subtotal/total, status pending|confirmed|cancelled|expired|refunded, stripeSessionId, expiresAt), Transaction (provider stripe|dev), PromoCode (type percent|fixed, minQuantity, maxUses, usedCount). Pricing engine = pure computeTotals (auto 10% group discount @ ≥5 seats; percent/fixed promos, capped ≥ 0; 7 vitest tests). Booking inside Mongo session via inTransaction helper — on standalone dev Mongo (no replica set) it retries the same ops sessionless instead of failing. Create requires all seats locked+owned (lockedBy user), extends seat hold to 30 min. Confirm (webhook or dev): seats → booked, event.tiers.$.sold += count, Transaction succeeded, idempotent on repeat. Cancel (pending) / Refund (confirmed: Stripe API refund or dev skip) release seats to available + decrement sold + promo rollback (cancel). Stripe configured via STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET — absent = dev simulator (POST /bookings/:ref/dev-confirm), POST /webhooks/stripe mounted on raw body BEFORE express.json. Client: ookingsApi, Checkout page (/events/:slug/checkout?seats=) cart + promo apply + dev pay button, BookingComplete (polls pending → confirmed), My bookings (cancel/refund/pay-now), SeatSelection Continue → checkout keeps locks (release-on-unmount skipped when path includes /checkout) + heartbeat during checkout. Seeded promos: EARLY10 (10%), GROUP5 (10% min 5). Verified via scripts/bookings-smoke.mjs: lock → create+promo → checkout(dev) → confirm → history → refund → release. Note: group split-payment links deliberately deferred (optional per spec).
- **Phase 5**: Ticket model (ticketRef TK-XXXXXX, refs + eventSnapshot copy, seatLabel/tier/price snapshot, status valid|used|cancelled, qrVersion, qrExpEpoch = event start + 12h grace or 6h-from-issue floor). QR tokens are HMAC-signed strings BOOKIT1|ref.version.eventId.expEpoch|sig (utils/qrToken.ts, timingSafeEqual verify; decode distinguishes malformed/tampered/expired; secret = JWT_SECRET) — no raw token stored; rotation = qrVersion++ which invalidates stale QRs. Tickets auto-issued inside booking confirm transaction (per-item), cancelled on refund. Endpoints: GET /api/v1/tickets (mine), GET /:ref (qrRaw), POST /:ref/rotate, GET /:ref/pdf (pdfkit A6: event/seat/tier/price/holder + embedded QR png via qrcode; verified %PDF header), POST /scan (organizer only; valid/used/cancelled/expired/invalid outcomes; first scan flips status → used w/ checkedInAt). Client: 	icketsApi, My Tickets page (/tickets: stub cards, expandable QR via react-qr-code, PDF blob download w/ credentials, refresh QR, status badges), Scanner page (/scanner organizer-only: html5-qrcode environment camera, scan mutation, green/red toast strip, recent-scans list, manual payload fallback input, camera start/stop/error states — mount div isolated from React re-renders, runningRef-guarded stop, qrbox ≥50px). Dev-DB cleanups: stale seats + 	ickets collections (conflicting legacy unique indexes) dropped via scripts/cleanup-legacy-indexes.mjs; schema indexes rebuilt by mongoose autoIndex. Startup **seat recovery sweep** (expireStale in sockets/index.ts) releases locked seats whose lockedUntil passed after restarts. Verified by scripts/tickets-smoke.mjs (SMOKE_BASE env for isolated server on port 5010; park .env for dev-pay).
- **Phase 6**: Dynamic pricing: EventTier.afterPrice + pure 	ierPricing.ts (	ierExpired by activeUntil OR sold>=capacity; effectiveTierPrice falls back to afterPrice) used at booking time; client shows strikethrough base + new price + 'Offer ended' note. Waitlist model (unique eventId+tierId+userId; statuses queued|notified|fulfilled|removed; eventSnapshot copy); join refused while seats are available (capacity OR live-plan check, 409); FIFO drain after cancel/refund/unpaid expiry notifies oldest queued attendee(s) per freed slot via email and flips to 
otified (24h window noted). Emails: nodemailer behind SMTP_* env with console-log transport fallback ([mail:smtp-off]); templates = booking-confirmed, waitlist-slot, 24h-reminder; cron jobs (
ode-cron): reminders hourly (Ticket.reminderSentAt guard, one email per booking) + unpaid-expiry every 20min (pending bookings past expiresAt → expired, seats released, promo usage rolled back, waitlist drained). Calendar: utils/ics.ts VCALENDAR builder (escaped fields, uid=slug), GET /events/:id/ics (text/calendar), client lib/calendar.ts (Google Calendar URL + .ics blob download) mounted as Google/iCal buttons on EventDetail; Studio tier editor gains 'After' price input. Verified by scripts/waitlist-smoke.mjs: single-seat event → book+pay → join waitlist → refund → entry notified(FIFO) + email log + valid .ics.
- **Phase 7**: AnalyticsService (organizer-scoped): /analytics/summary (across own events: revenue from confirmed bookings, sold/capacity, attendance via tickets, per-event mini rows), /analytics/events/:id (overview + daily revenue/count buckets by paidAt, peak purchase hours (0-23), tier breakdown w/ per-tier revenue from booking items, recent bookings; attendanceRate = used/issued tickets), CSV exports orders (bookings w/ user email/name/seats/total/status/paidAt) and ttendees (tickets w/ check-in) — all routes RBAC organizer/admin, ssertOwnerEvent guard, RFC-style CSV quoting. Client: nalyticsApi (summary + event details), **Analytics dashboard** (/dashboard/analytics, Recharts: AreaChart revenue-by-day w/ gradient, BarChart bookings-by-hour, PieChart tier donut, recent bookings list, summary cards revenue/seats/attendance/events), event selector + Orders/Attendees CSV downloads (blob w/ credentials), Studio nav tabs (Events | Analytics). Social: lib/share.ts — Telegram (	.me/share/url), WhatsApp (wa.me/?text), X (	witter.com/intent/tweet), LinkedIn (sharing/share-offsite) links on EventDetail share row; OpenGraph: static tags in index.html + runtime setSocialMeta per event (title/description/image/url + twitter cards) so shared links render rich previews. Also fixed: seat-plan-driven sold-out display (soldOutTierIds from getMap, disabled/locked server-side guard in seat engine, plan-based seats-left in EventDetail, owner 'You hold N' chip) and waitlist join alignment (server now checks free seats in the live plan). Bundle note: Recharts pushed the chunk to ~1.36 MB — code-splitting planned in Phase 8.
- **Phase 8**: Route-level `React.lazy` code-splitting (main bundle 1.36 MB → 468 kB, gzip 151 kB; Scanner 341 kB and Analytics 403 kB become lazy chunks; no size warning remains), global `ErrorBoundary` at the app root (friendly reload fallback), Studio header mobile-safe (flex-wrap), seed script `server/scripts/seed-data.mjs` (`npm run seed -w server`: admin/organizer/demo users with known passwords, 'Bookit Demo Hall' venue with VIP+Regular sections, 3 published future events with early-bird+afterPrice tiers and 132-seat plans each), README.md at repo root (setup, env table, demo accounts, payments/dev-mode, smoke scripts, API walkthrough, production notes). Final sweep all green: typecheck, eslint, vitest 7/7, builds both workspaces, E2E tickets smoke re-verified on an isolated instance (issue → scan valid → used → rotate → stale → PDF). Full feature set delivered across Phases 0–8.

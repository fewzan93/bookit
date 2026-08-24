# Bookit — Execution Roadmap

> Full plan: `plans/bookit-plan.md` · Gate: after each task, self-verify then wait for user APPROVE.

## Phase 0 — Scaffolding
- [ ] Task 0.1 — Root monorepo: package.json (workspaces), .gitignore, docker-compose.yml, env templates
- [ ] Task 0.2 — Server skeleton: config/env (zod), db, middlewares (error/notFound/rateLimit), app.ts, /health, socket bootstrap, server.ts
- [ ] Task 0.3 — Client skeleton: Vite + React 18 + TS + Tailwind v4, router shell, base layout
- [ ] Task 0.4 — Verify: install, typecheck, lint, build all green; store plan in `plans/`

## Phase 1 — Auth & RBAC
- [x] Task 1.0 — [GATE] User verified Phase 0 and approved Phase 1 start
- [x] Task 1.1 — User model + register/login/logout/me (JWT httpOnly cookie, bcryptjs)
- [x] Task 1.2 — auth + rbac middlewares, Zod validation, auth routes (service/controller split)
- [x] Task 1.3 — Client: authSlice + RTK Query mutation hooks, authApi, RouteGuard
- [x] Task 1.4 — Client pages: Login / Register (animated, responsive, error states)

## Phase 2 — Events & Venues
- [x] Task 2.1 — Venue + EventTier schemas, Event model, CRUD services/controllers (Zod-validated, slug, status)
- [x] Task 2.2 — Cloudinary upload route (multer → cloudinary) + banner integration
- [x] Task 2.3 — Public event API: list w/ filters (category, date, price, geospatial near-me), detail, related
- [x] Task 2.4 — Client: Home event grid + EventDetail page
- [x] Task 2.5 — Client: Organizer event CRUD (form + list, banner upload, publish toggles)

## Phase 3 — Seat Map & Real-time Locking
- [x] Task 3.1 — Seat plan generator service (from venue config: sections/rows/cols/tiers)
- [x] Task 3.2 — Socket.io SeatLockEngine: lock/release/expire (5–10 min, heartbeat, broadcast state), TTL index
- [x] Task 3.3 — Client: seatMapSlice, SVG interactive map (Available/Locked/Booked/Disabled, tier colors, countdown, Framer Motion)
- [x] Task 3.4 — Lock expiry sync + race handling (re-seat on error)

## Phase 4 — Checkout, Stripe & Discounts
- [x] Task 4.1 — Booking model + transaction service (Mongoose session, atomic seat flip, bookingRef)
- [x] Task 4.2 — Stripe Checkout session endpoint + webhook upsert (STRIPE_MODE=dev fallback)
- [x] Task 4.3 — Client: Checkout flow (cart, lock countdown timer, seat list, total)
- [x] Task 4.4 — Promo code + group discount engine (auto 10% @ 5+ tickets), client apply UI
- [x] Task 4.5 — Booking history page + cancel/refund service

## Phase 5 — Tickets & On-site Scanner
- [x] Task 5.1 — Ticket model + qrcode token generator (hashed, rotate-able), ticket endpoints
- [x] Task 5.2 — pdfkit PDF ticket (event + seat + QR) + download route
- [x] Task 5.3 — Client: My Tickets page (QR display, PDF download, add-to-calendar)
- [x] Task 5.4 — Organizer scanner route: camera (html5-qrcode), check-in validation, socket broadcast

## Phase 6 — Waitlist, Pricing, Emails, Calendar
- [x] Task 6.1 — Dynamic tier pricing service (EarlyBird expiry by date/capacity, auto price switch)
- [x] Task 6.2 — Waitlist queue + FIFO notify drain on cancel/unpaid (email/SMS stub)
- [x] Task 6.3 — nodemailer setup + templates (confirmation, reminder 24h via node-cron)
- [x] Task 6.4 — Real-time seats: release re-broadcast + waitlist auto-promotions
- [x] Task 6.5 — .ics generator + Add-to-Calendar buttons (Google / Apple)

## Phase 7 — Analytics & Social
- [x] Task 7.1 — Analytics aggregation service (sold, revenue, attendance, peak purchase times)
- [x] Task 7.2 — Client: Organizer/Admin dashboards (Recharts: revenue line, sales bar, donut categories)
- [x] Task 7.3 — CSV export (orders/attendees) + refund processing UI
- [x] Task 7.4 — Social share links (Telegram/WhatsApp/X/LinkedIn) + OpenGraph meta handling

## Phase 8 — Hardening & Delivery
- [ ] Task 8.1 — Responsive + theme audit (mobile→xl), loading/error/empty states polish
- [ ] Task 8.2 — Seed data (users, venues, events, seats) + demo account docs
- [ ] Task 8.3 — README (setup, env, docker, stripe test flow) + final verification sweep

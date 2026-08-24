# Deploying Bookit

Three paths: **free (Render + Vercel + Atlas)** — recommended, **Docker Compose**, or **manual on a VPS**. All assume:

- Node **>= 20.19**
- MongoDB — **Atlas free M0** (replica set → real transactions) or local `mongo:7` container
- A public HTTPS URL (e.g. `https://tickets.yourdomain.com`)

> Transactions (seats, bookings, tickets) require a **replica set**. The app detects a standalone Mongo and degrades gracefully for dev — for production use Atlas (replica set by default) or your own RS.

---

## 0. Secrets checklist (env)

| Var | Required | Notes |
|---|---|---|
| `JWT_SECRET` | ✅ | 32+ random chars. `openssl rand -hex 32` |
| `NODE_ENV` | ✅ | `production` (Secure cookies, SameSite=None) |
| `MONGODB_URI` | ✅ | Atlas string e.g. `mongodb+srv://user:pass@cluster.mongodb.net/bookit` |
| `CLIENT_ORIGIN` / `PUBLIC_URL` | ✅ | public origin, no trailing slash; must match the deployed frontend |
| `STATIC_URL` | ✅ | API origin (URLs for `/uploads/` files) |
| `STRIPE_SECRET_KEY` | 🔑 | test first, then live |
| `STRIPE_WEBHOOK_SECRET` | 🔑 | needed for payment confirmations |
| `SMTP_*` + `EMAIL_FROM` | 🔁 | emails; unset ⇒ console logs |
| `CLOUDINARY_*` | 🔁 | unset ⇒ local `server/uploads` (needs the API `disk` volume on Render) |

---

## 1. FREE: Render (API) + Vercel (frontend) + Atlas (DB)

Vercel can't host this backend (Socket.io WebSockets + cron need an always-on Node service) — Render's free web tier does.

### 1a. MongoDB Atlas (5 min)
1. atlas.mongodb.com → create free M0 cluster → Database Access → create user → Network Access → `0.0.0.0/0` (dev) or your IP.
2. Connect → copy the connection string → append `/bookit` — becomes `MONGODB_URI`.

### 1b. Render API (2 min — blueprints do the rest)
1. Push this repo to GitHub.
2. render.com → New → **Blueprint** → pick the repo → Render reads `render.yaml`.
3. Fill the `sync: false` vars:
   - `MONGODB_URI` (from 1a)
   - `CLIENT_ORIGIN` & `PUBLIC_URL` = your Vercel URL — get it after 1c, then update here + redeploy (or use a temporary placeholder)
   - `STATIC_URL` = `https://bookit-api.onrender.com`
   - `STRIPE_*`, `SMTP_*`, `CLOUDINARY_*` optional
4. `JWT_SECRET` auto-generates. Deploy → your API is live at `https://bookit-api.onrender.com` (health: `/health`).
5. Seed once: Render → your service → **Shell** tab → `node scripts/seed-data.mjs` + `node scripts/seed-promo.mjs`.

### 1c. Vercel frontend (1 min)
1. vercel.com → New Project → import the same repo → framework: **Vite** → root dir `client` → deploy.
2. Project → Settings → **Environment Variables**: `VITE_API_URL=https://bookit-api.onrender.com` (Production + Preview) → **Redeploy**.
3. Copy your URL (e.g. `https://bookit.vercel.app`) → go back to Render → set `CLIENT_ORIGIN`/`PUBLIC_URL` to it → **Manual deploy**.

### 1d. Stripe webhook
Endpoint: `https://bookit-api.onrender.com/api/v1/webhooks/stripe` (Stripe dashboard → Webhooks, or `stripe listen --forward-to …`). Put the `whsec_` into `STRIPE_WEBHOOK_SECRET`.

### 1e. Smoke test
`GET https://bookit-api.onrender.com/api/v1/events` → open the site → register → pick seats (WebSocket works cross-site; cookies are SameSite=None Secure) → pay (dev button until Stripe vars are set) → refund to see the waitlist email log in Render Logs.

> Gotchas: Socket.io + cross-site works but Seat Selection/Scanner must run over **HTTPS**; Render free instances sleep after ~15 min idle (first request wakes it — a free uptime like `cron-job.org` helps).

---

## 2. Docker Compose (all-in-one)

```bash
cp .env.example .env
docker compose up -d --build
# → http://localhost:8080
```

Seeding: `docker compose exec server node scripts/seed-data.mjs`. Put a Caddy/Traefik in front for HTTPS, then set `PUBLIC_URL`.

---

## 3. Manual VPS (no Docker)

```bash
# build both workspaces
npm install
npm run build                       # client/dist + server/dist

# run the API (bg, or with pm2)
cd server
NODE_ENV=production PUBLIC_URL=https://… JWT_SECRET=… node dist/server.js
# or: pm2 start dist/server.js --name bookit-api

# serve the client static build
# nginx roots: /client/dist
# proxy_pass /api, /socket.io (with Upgrade headers), /uploads → localhost:5000
```

`client/nginx.conf` is ready to adapt as the nginx site config (change `proxy_pass http://server:5000` → `http://127.0.0.1:5000` and drop/keep the container DNS as needed). The SPA fallback `try_files $uri /index.html` and `/assets/` caching are pre-configured.

### PM2

```bash
npm i -g pm2
pm2 start server/dist/server.js --name bookit-api --cwd server
pm2 save && pm2 startup
```

---

## 3. Post-deploy smoke

1. `GET /api/v1/events` → JSON list
2. Open the site → ticket-stub hero appears (next event)
3. Register → login → pick seats (lock works via WebSocket through the proxy)
4. Pay — no Stripe keys means the **dev simulator** button; add keys+webhook for real cards
5. Refund a booking → watch `docker compose logs server` for the waitlist email line
6. `/scanner` works only over HTTPS (camera APIs require a secure context)

---

## 4. Troubleshooting

| Symptom | Fix |
|---|---|
| 502 on `/api` or `/socket.io` | server container down → `docker compose logs server` |
| WebSocket closes instantly | proxy missing `Upgrade`/`Connection` headers (see nginx.conf) |
| `Transaction numbers are only allowed…` → graceful degradation | dev-only; move to Atlas/replica set in prod |
| Emails missing | set SMTP vars; unset ⇒ check server logs (`[mail:smtp-off]`) |
| Camera won't start on `/scanner` | HTTPS required (localhost is exempt) |
| Old QR "expired" at scan | it is date-expired (start + 12 h) — refresh only fixes version issues |

# Campus Ride Platform

A real-time campus mobility platform that connects passengers and drivers
(modelled on IIT Roorkee's e-rickshaw last-mile transport). Passengers request
rides, drivers accept and manage them, and every update is delivered live over
WebSockets.

---

## Technology Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Socket.IO** — real-time updates (`/rides`, `/drivers` namespaces)
- **PostgreSQL** (Supabase) + **Prisma ORM**
- **JWT** auth + **bcryptjs** password hashing
- **Zod** request validation
- **Nodemailer** — email OTP verification
- **Tailwind CSS**, **Leaflet/OpenStreetMap** (maps), **Recharts** (charts)

A custom Node server (`server.js`) hosts Next.js and Socket.IO in one process so
API routes and the WebSocket layer share a single runtime.

---

## Features

### Mandatory
- [x] JWT authentication with **email OTP verification**
- [x] Passenger & driver registration + profiles (driver vehicle info)
- [x] Driver availability (online/offline + live location)
- [x] Ride request workflow (pickup/drop, distance-based fare)
- [x] **Atomic** ride assignment — a ride goes to exactly one driver
- [x] Real-time updates over Socket.IO (live requests, acceptance, status)
- [x] Ride lifecycle: REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED / CANCELLED
- [x] Driver dashboard (total rides, earnings, rating, history)
- [x] Ratings & feedback (updates driver average)

### Optional / Bonus
- [x] Live map (Leaflet / OpenStreetMap)
- [x] Ride scheduling
- [x] Digital payments (UPI / Card / Wallet / Cash, simulated)
- [x] Demand analytics (peak hours, popular locations)
- [x] Demand forecasting (Moving Average + Exponential Smoothing)

---

## Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (a free **Supabase** project works)

### Install & configure
```bash
npm install
```

Create `.env.local` (app) and `.env` (Prisma CLI) with:
```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"
JWT_SECRET="your-secret-key"
# Optional — real OTP email (Gmail App Password). Without these, the OTP prints
# to the server console (dev mode).
EMAIL_USER="you@gmail.com"
EMAIL_PASS="your-app-password"
```

### Database
```bash
npx prisma migrate dev      # create tables
npx prisma db seed          # demo users + historical data for analytics
```

Demo accounts (password `password123`):
- Passenger — `passenger@example.com`
- Driver — `driver@example.com`

---

## Running

```bash
npm run dev          # http://localhost:8080
```

Production build:
```bash
npm run build
npm start
```

> The app runs on **port 8080**. To test the real-time flow, open two windows
> (one passenger, one driver) — e.g. a normal window + an Incognito window.

---

## API Reference

All protected routes need `Authorization: Bearer <JWT>`. Bodies validated with Zod.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/send-otp` | Email a 6-digit OTP |
| POST | `/api/auth/signup` | Create account (requires OTP) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET / POST | `/api/rides` | List my rides / create request (computes fare) |
| GET | `/api/rides/requests` | Open requests (drivers) |
| GET / PATCH | `/api/rides/:id` | Ride detail / status change |
| POST | `/api/rides/:id/ratings` | Rate a completed ride |
| GET / POST | `/api/rides/scheduled` | List / create scheduled rides |
| GET | `/api/drivers/available` | Online drivers near a point |
| GET / PATCH | `/api/drivers/status` | Availability + live location |
| POST | `/api/payments/initiate` | Simulated payment (persists fare) |
| GET | `/api/analytics/demand` | Demand analytics |
| GET | `/api/analytics/forecast` | 7-day demand forecast |

### Socket.IO events (`/rides`)
| Event | Direction | Meaning |
|---|---|---|
| `register` | client → server | Join personal room `user-<id>` |
| `join-ride` | client → server | Follow ride room `ride-<id>` |
| `ride:requested` | server → drivers | New open request |
| `ride:accepted` | server → passenger | A driver claimed the ride |
| `ride:status_updated` | server → ride room | Lifecycle change |
| `driver:availability_changed` | server (`/drivers`) | Online pool changed |

---

## Database Schema

7 tables via Prisma (`prisma/schema.prisma`): **User**, **PassengerProfile**,
**DriverProfile**, **SavedLocation**, **Ride**, **Rating**, **EmailVerification**.
An importable ER diagram source is in `schema.dbml` (paste into dbdiagram.io).

---

## Project Structure

```
app/
  api/            REST API routes (auth, rides, drivers, payments, analytics)
  auth/           login + signup (OTP) pages
  dashboard/      passenger & driver dashboards
  request-ride/   ride booking flow
  schedule-ride/  scheduling
  my-rides/       history + ratings
  analytics/, forecast/
components/        map, payment, common UI
lib/              auth, prisma, socket (server + client), email, locations
prisma/           schema + migrations + seed
server.js         custom Next.js + Socket.IO server
```

---

## Deployment

This app needs a host that runs a **persistent server with WebSockets** — so
**not** Vercel (serverless). The repo includes a `Dockerfile`; deploy on any of:

- **Render** (free Docker web service) — uses `render.yaml`
- **Railway** — auto-detects the Dockerfile (free trial credit)
- **Koyeb** — permanently free tier, no card

Steps (any platform): push to GitHub → create a Docker web service from the repo
→ set env vars `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `EMAIL_USER`,
`EMAIL_PASS` → deploy. The database stays on Supabase.

---

## Verifying it works

```bash
npx tsc --noEmit     # 0 type errors
npm run build        # production build succeeds
```

Manual: log in → driver goes online → passenger requests → request appears live on
the driver → accept → passenger sees it live → start → complete → rate the ride →
check the driver dashboard and analytics update.

---

## Design Notes

- **Persist first, broadcast second:** every change is written to the DB, then a
  Socket.IO event is emitted — clients never see a non-durable update.
- **Atomic accept:** a conditional `updateMany` guarantees one driver per ride.
- **Single-query relation loads** (`relationLoadStrategy: "join"`) cut latency.
- **Optimistic UI** keeps driver actions feeling instant against a remote DB.
- **Deterministic fare** (`₹20 + ₹12/km`) shared by client preview and server.

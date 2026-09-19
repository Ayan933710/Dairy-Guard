# NANDI — Full-Stack Project

This package contains the complete **NANDI** application:

```
dairyguard-ai-fullstack/
├── frontend/    # React + Vite dashboard (herd overview, animal detail, analytics, predictions, history)
└── backend/     # Node.js/Express API, PostgreSQL schema, Socket.io, IoT ingestion, AI-service bridge
```

NANDI tracks **cows and buffaloes** (goats are not supported).
Every screen and button in the frontend is wired to the backend — login,
herd management, analytics, predictions, and history all run on live data.

---

## 1. Prerequisites

- **Node.js 18+**
- **PostgreSQL 14+**

See `backend/README.md` §2 for OS-specific install commands.

---

## 2. Start the backend first

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to match your Postgres install, generate a JWT_SECRET
npm install
npm run migrate
npm run seed        # creates 3 demo users + a 5-animal demo herd, prints each user's Farm ID
npm run dev          # starts on http://localhost:5000
```

If you're upgrading an existing database that already had goat records,
`npm run migrate` includes a migration that removes them and rebuilds the
species/quarter schema automatically — no manual cleanup needed.

Full details, the REST API reference, IoT/MQTT ingestion instructions, and
the Python AI-service integration point are in **`backend/README.md`**.

Demo accounts (seeded, password `Password123!` — sign in with the email,
phone, *or* Farm ID printed by `npm run seed`):

| Role               | Email                       | Phone           |
|--------------------|------------------------------|------------------|
| Farmer             | farmer@dairyguard.test       | +919800000001    |
| Vet                | vet@dairyguard.test           | +919800000002    |
| Cooperative Admin  | admin@dairyguard.test         | +919800000003    |

---

## 3. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
# defaults already point at http://localhost:5000 - only edit if your backend runs elsewhere
npm install
npm run dev           # starts on http://localhost:5173
```

Open http://localhost:5173, switch the language selector to confirm the
whole site (nav, forms, charts, empty states) translates, then log in with
one of the seeded demo accounts above.

---

## 4. What's wired up

| Frontend screen / action | Backend endpoint |
|---|---|
| Sign up (full name, role, farm name, phone, email, password) | `POST /api/auth/register` — phone is mandatory; response includes an issued Farm ID |
| Login (email, phone, *or* Farm ID) | `POST /api/auth/login` |
| Session check on load (`ProtectedRoute`) | `GET /api/auth/me` |
| Herd Overview page | `GET /api/herd` |
| "Add animal" modal (cow or buffalo) | `POST /api/herd` |
| Species list pages (Cows / Buffaloes) | `GET /api/herd/species/:species` |
| Animal detail page (profile, 4 mammary quarters, 30-day trend) | `GET /api/animals/:id` |
| "Run prediction now" button | `POST /api/predictions/run/:animalId` |
| "Find nearby vet" button | Opens Google Maps (browser geolocation) — no backend call |
| Predictions page | `GET /api/predictions` |
| History page | `GET /api/history` |
| Analytics page (risk distribution, species average, herd trend) | `GET /api/analytics/summary` |
| Live alert banner in the dashboard header | Socket.io `alert:new` event |
| Logout | Clears the local JWT, no backend call needed |

---

## 5. Feature notes

- **Cows and buffaloes only** — goat support has been fully removed from
  both frontend and backend (UI, validation, database schema, seed data).
  Every animal has the same 4 mammary quarters (`LF`/`RF`/`LR`/`RR`).
- **Full language switching** — every visible string goes through the
  translation system; switching language re-renders the whole site in
  English, Hindi, or Kannada.
- **Fixed 30-day trend chart X-axis** — angled, de-duplicated tick labels
  so 30 daily points don't overlap.
- **AI recommendations + nearby vets** — recommendation cards include a
  "Find nearby vet" button that opens Google Maps centered on the farmer's
  current location.
- **Mandatory phone at signup** — required for WhatsApp/SMS alerts.
- **Farm ID system** — every account gets a short, unique Farm ID at
  signup. It must be configured into every hub/collar/cup, and the backend
  rejects any telemetry whose Farm ID doesn't match the animal's actual
  owner — so one farm's hardware can never write into another farm's data.
- **Sign in with email, phone, or Farm ID** — whichever the farmer has
  on hand.
- **WhatsApp / SMS / email mastitis alerts** — fires automatically when an
  animal crosses the High Risk threshold, with key readings, the current
  recommendation, and a direct link to that animal's page. **Requires your
  own Twilio and SMTP credentials** (off by default) — see
  `backend/README.md` §9.

---

## 6. IoT hardware & the future AI microservice

Both are backend-only concerns and don't require any frontend changes:

- **ESP32-S3 devices** post telemetry to `POST /api/telemetry/ingest`
  (or via the optional MQTT bridge), including the farm's Farm ID — see
  `backend/README.md` §6. Every ingested reading immediately updates the
  relevant animal's risk score and pushes a live update to any connected
  dashboard; a High Risk reading also triggers the alert pipeline above.
- **Python AI microservice**: point `backend/.env`'s `AI_SERVICE_URL` at it
  and set `AI_SERVICE_ENABLED=true` — see `backend/README.md` §8. Until
  then, an equivalent rule-based risk engine keeps the whole app fully
  functional.

---

## 7. Troubleshooting

If the frontend shows "Could not reach the DairyGuard backend..." on any
page, check:
1. Is the backend running (`npm run dev` in `backend/`) and did it print
   `DairyGuard AI backend listening on http://localhost:5000`?
2. Does `frontend/.env`'s `VITE_API_URL` match the backend's actual port?
3. Does `backend/.env`'s `CLIENT_ORIGIN` include `http://localhost:5173`
   (or whatever port Vite printed)? A mismatch here shows up as a CORS
   error in the browser console, not a connection error.

See `backend/README.md` §11 for more troubleshooting entries (database
connection issues, Farm ID mismatches, phone-required signup, etc).

# DairyGuard AI — Backend

Node.js/Express backend, PostgreSQL schema, real-time Socket.io layer, and
IoT/AI integration points for **Project DairyGuard AI**. This service is
built to plug directly into the existing `dairyguard-ai` React frontend and
to receive telemetry from ESP32-S3 Smart Collars / Smart Cups, either
directly over HTTP or via an MQTT broker bridge for LoRa-based hubs.

---

## 1. What's inside

```
dairyguard-backend/
├── server.js                  # entry point (HTTP server + Socket.io + MQTT bridge)
├── package.json
├── .env.example                # copy to .env and fill in
├── src/
│   ├── app.js                  # Express app: middleware + route mounting
│   ├── config/
│   │   ├── env.js              # loads & defaults process.env
│   │   └── db.js               # pg connection pool
│   ├── db/
│   │   ├── migrations/         # 001..005 SQL migration files, run in order
│   │   ├── migrate.js          # `npm run migrate`
│   │   └── seed.js             # `npm run seed` — demo users + demo herd
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT `protect`, `requireRole`, device-key auth
│   │   └── errorMiddleware.js
│   ├── models/                 # plain SQL data-access layer (no ORM)
│   ├── controllers/            # one per frontend page / feature
│   ├── routes/                 # REST routes, mounted under /api
│   └── services/
│       ├── socketService.js          # Socket.io setup + broadcast helpers
│       ├── mqttBridge.js             # optional MQTT broker bridge for ESP32 hubs
│       ├── telemetryIngestService.js # shared ingest pipeline (HTTP + MQTT both use it)
│       ├── riskEngine.js             # transparent rule-based risk scoring (fallback)
│       └── ai_inference_service.js   # bridge to the future Python XGBoost microservice
```

---

## 2. Prerequisites

Install these once, before doing anything else:

1. **Node.js 18+** — check with `node -v`. Get it from https://nodejs.org.
2. **PostgreSQL 14+** — check with `psql --version`.
   - **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
   - **Windows:** install via https://www.postgresql.org/download/windows/ (use the installer, it also gives you `psql` and pgAdmin)
   - **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`
3. *(Optional, only if you want to test the MQTT path now)* **Mosquitto** broker:
   - macOS: `brew install mosquitto && brew services start mosquitto`
   - Ubuntu: `sudo apt install mosquitto mosquitto-clients`
   - You can skip this entirely and use the HTTP ingestion route instead — see Section 6.

---

## 3. One-time setup

### 3.1 Create the database and a dedicated user

Open `psql` (as your Postgres superuser, often just `psql postgres` on macOS
or `sudo -u postgres psql` on Linux) and run:

```sql
CREATE DATABASE dairyguard_db;
CREATE USER dairyguard_user WITH PASSWORD 'dairyguard_pass';
GRANT ALL PRIVILEGES ON DATABASE dairyguard_db TO dairyguard_user;
\c dairyguard_db
GRANT ALL ON SCHEMA public TO dairyguard_user;
```

(Feel free to use your own username/password — just make sure they match
`DATABASE_URL` in your `.env` file in the next step.)

### 3.2 Configure environment variables

```bash
cd dairyguard-backend
cp .env.example .env
```

Open `.env` and set, at minimum:

```
DATABASE_URL=postgresql://dairyguard_user:dairyguard_pass@localhost:5432/dairyguard_db
JWT_SECRET=<generate one with the command below>
DEVICE_INGEST_KEY=<any long random string — your ESP32 firmware will send this>
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Everything else in `.env.example` has a sensible local-dev default and can
be left as-is for now (MQTT and the Python AI service are both disabled by
default, so the backend runs standalone with the built-in rule-based risk
engine).

### 3.3 Install dependencies

```bash
npm install
```

### 3.4 Run migrations and seed demo data

```bash
npm run migrate   # creates all tables (users, bovine_registry, sensor_telemetry, ...)
npm run seed       # wipes and repopulates demo users + a 7-animal demo herd
```

`npm run setup` does both in one step.

The seed script prints three demo accounts you can log in with (all share
the password `Password123!`):

| Role               | Email                       |
|--------------------|------------------------------|
| Farmer             | farmer@dairyguard.test       |
| Vet                | vet@dairyguard.test           |
| Cooperative Admin  | admin@dairyguard.test         |

Each printed line also shows that account's **Farm ID** (an 8-character
code like `K7QX9F2A`) - login accepts email, phone, *or* Farm ID
interchangeably (see Section 6.1).

---

## 4. Running the server

```bash
npm run dev     # nodemon, auto-restarts on file changes (recommended while developing)
# or
npm start        # plain node, for a one-off run
```

You should see:

```
[INFO] DairyGuard AI backend listening on http://localhost:5000
[INFO] Environment: development
[INFO] Allowed CORS origins: http://localhost:5173
```

Verify it's alive:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","service":"dairyguard-ai-backend"}
```

---

## 5. Connecting the frontend

The `dairyguard-ai` React app currently renders entirely from mock data in
`src/data/herd.js` and has no API calls yet. To wire it up to this backend:

1. Start this backend on port 5000 (default) and the frontend's Vite dev
   server (`npm run dev` inside `dairyguard-ai`, default port 5173).
2. Confirm `CLIENT_ORIGIN=http://localhost:5173` in this backend's `.env`
   matches whatever port Vite actually prints.
3. In the frontend, add an API base URL, e.g. via a `.env` file:
   ```
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```
4. Replace the static imports from `src/data/herd.js` with `fetch`/`axios`
   calls to the matching endpoint (see the table in Section 7) and store the
   JWT returned by `/api/auth/login` (e.g. in memory or `localStorage`) to
   send as `Authorization: Bearer <token>` on subsequent requests.
5. For live updates, connect Socket.io from the frontend:
   ```js
   import { io } from 'socket.io-client';
   const socket = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } });
   socket.on('animal:updated', (animal) => { /* update herd state */ });
   socket.on('alert:new', (alert) => { /* toast / notification */ });
   ```

**Quick manual check without touching the frontend at all** — log in and
list the herd with curl:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@dairyguard.test","password":"Password123!"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

curl http://localhost:5000/api/herd -H "Authorization: Bearer $TOKEN"
```

If that returns a JSON array of 7 animals (Gauri, Radha, Lakshmi, Kajal,
Kali, Chandni, Pari), your backend + database are working end-to-end.

---

## 6. Connecting ESP32-S3 hardware

### 6.1 Farm ID - required on every reading

Every user gets an 8-character **Farm ID** (e.g. `K7QX9F2A`) the moment they
register - it's returned in the `/auth/register` response and shown once on
the frontend's signup success screen. This is the ID you punch into a hub,
collar, or cup's setup screen (however your firmware exposes that - a
serial console, a captive Wi-Fi portal, etc). **Every telemetry reading
must include it**, and the backend rejects (`403`) any reading whose
`farm_id` doesn't match the actual owner of the animal being reported on -
this is what guarantees one farm's hardware can never write into another
farm's herd data, even by accident.

Farm ID also works as a login identifier (see Section 7) - handy for a
farmer who doesn't want to remember an email address.

Two ingestion paths are provided — use whichever matches your firmware.

### Option A — Direct HTTP POST (simplest, good for early bring-up / testing)

```
POST /api/telemetry/ingest
Header: x-device-key: <your DEVICE_INGEST_KEY from .env>
Content-Type: application/json

{
  "device_id": "CUP-C104-01",
  "device_type": "cup",
  "farm_id": "K7QX9F2A",
  "rfid_tag": "900000000000104",
  "quarter": "LF",
  "ec": 6.8,
  "ph": 6.9,
  "viscosity_torque": 58,
  "yield": 2.1,
  "rumination": -14,
  "skin_temp": 39.6
}
```

`quarter` is one of `LF`/`RF`/`LR`/`RR` — the four mammary quarters every
cow and buffalo has.

Test it with curl right now, against the seeded demo herd (replace
`FARM_ID` with whatever your seeded farmer account's Farm ID actually is -
printed by `npm run seed`, or fetch it via `GET /api/auth/me` after logging in):

```bash
curl -X POST http://localhost:5000/api/telemetry/ingest \
  -H "Content-Type: application/json" \
  -H "x-device-key: <your DEVICE_INGEST_KEY>" \
  -d '{"device_id":"CUP-TEST","farm_id":"<FARM_ID>","rfid_tag":"900000000000104","ec":7.1,"ph":6.9,"rumination":-20,"skin_temp":39.7}'
```

A successful response returns the computed risk score and pushes a live
`telemetry:new` / `animal:updated` Socket.io event to that animal's owner.
If the risk score crosses `ALERT_RISK_THRESHOLD` (default 75, "High Risk"),
a WhatsApp/SMS/email alert also fires - see Section 8.

### Option B — MQTT broker bridge (recommended for LoRa gateways / hubs relaying many devices)

1. Set `MQTT_ENABLED=true` and `MQTT_BROKER_URL` in `.env` (e.g.
   `mqtt://localhost:1883` for a local Mosquitto broker).
2. Restart the backend — it will subscribe to `MQTT_TELEMETRY_TOPIC`
   (default `dairyguard/+/telemetry`) and process any JSON message with the
   same shape as Option A (farm_id included).
3. Simulate a device locally with Mosquitto's CLI:
   ```bash
   mosquitto_pub -t dairyguard/COLLAR-01/telemetry \
     -m '{"device_id":"COLLAR-01","farm_id":"<FARM_ID>","rfid_tag":"900000000000104","rumination":-22,"skin_temp":39.8}'
   ```

Every animal must exist in `bovine_registry` with a matching 15-digit
`rfid_tag` before telemetry can be attributed to it — register new animals
via `POST /api/herd` (see route table below) or add them in `src/db/seed.js`.

---

## 7. REST API reference

All routes below are prefixed with `/api`. Routes marked 🔒 require
`Authorization: Bearer <JWT>` (obtained from `/auth/login`); routes marked
🔑 require the `x-device-key` header instead.

| Method | Route                          | Used by (frontend page)     | Notes |
|--------|---------------------------------|------------------------------|-------|
| POST   | `/auth/register`                | AuthPage (sign up)            | requires `phone`; returns an issued `farm_id` |
| POST   | `/auth/login`                   | AuthPage (log in)             | `identifier` = email, phone, or Farm ID |
| GET    | `/auth/me` 🔒                    | —                              | current user |
| GET    | `/herd` 🔒                       | HerdOverviewPage              | scoped to caller's herd if role=farmer |
| GET    | `/herd/species/:species` 🔒      | SpeciesListPage                | species = cow \| buffalo |
| POST   | `/herd` 🔒                       | —                              | register a new animal (farmer/coop_admin) |
| GET    | `/animals/:id` 🔒                | AnimalDetailPage               | includes quarters + 30-day trend |
| GET    | `/animals/:id/telemetry` 🔒      | AnimalDetailPage (charts)      | raw readings, `?limit=` |
| POST   | `/telemetry/ingest` 🔑           | — (ESP32-S3 devices)           | requires `farm_id` matching the animal's owner - see Section 6.1 |
| GET    | `/telemetry/recent` 🔒           | —                              | recent raw readings across herd |
| GET    | `/predictions` 🔒                | PredictionsPage                | |
| POST   | `/predictions` 🔒                | PredictionsPage (vet only)     | manual recommendation |
| POST   | `/predictions/run/:animalId` 🔒  | PredictionsPage ("run now")    | on-demand re-score |
| GET    | `/history` 🔒                    | HistoryPage                    | |
| POST   | `/history` 🔒                    | HistoryPage                    | log a manual event |
| GET    | `/analytics/summary` 🔒          | AnalyticsPage                  | risk/species breakdowns + 30-day trend |
| GET    | `/devices` 🔒                    | —                              | list registered ESP32 hardware |
| POST   | `/devices` 🔒                    | —                              | register a new device |
| GET    | `/health`                        | —                              | liveness check, no auth |

### Real-time events (Socket.io)

| Event              | Payload                          | Fired when |
|---------------------|-----------------------------------|------------|
| `telemetry:new`     | raw sensor_telemetry row          | any telemetry ingested (HTTP or MQTT) |
| `animal:updated`    | full bovine_registry row          | an animal's cached risk snapshot changes |
| `alert:new`         | `{ animalId, displayTag, name, riskScore, riskLevel, message }` | an animal crosses into High Risk |

---

## 8. Connecting the future Python AI microservice

`src/services/ai_inference_service.js` is the single integration point.
Today, with `AI_SERVICE_ENABLED=false`, every risk request is answered by
the transparent rule engine in `src/services/riskEngine.js`, so the whole
app works without the ML model.

When your Python service (XGBoost) is ready:

1. Start the V2.2 wrapper using `ai_service/README.md`. It exposes `POST /predict` and accepts:
   ```json
   { "animal_id": "uuid", "features": { "ec": 6.4, "ph": 6.9, "viscosity_torque": 58, "milk_yield": 11.2, "rumination": -14, "skin_temp": 39.6, "thi": 74, "lactation_number": 3, "age": 5 } }
   ```
   and returning:
   ```json
   { "risk_score": 71, "risk_level": "Moderate Risk", "model_version": "xgb_v1.0" }
   ```
2. Set `AI_SERVICE_ENABLED=true` and `AI_SERVICE_URL=http://localhost:8000`
   (or wherever it runs) in `.env`.
3. Restart the Node backend. No other code changes are needed — if the
   Python service is ever unreachable, the backend automatically falls back
   to the rule engine so the dashboard never breaks.

---

## 9. Instantaneous four-quarter spot check

The ESP32 can submit one complete milk test to `POST /api/telemetry/spot-check`
using the `x-device-key` header. The backend stores all four readings with one
`spot_check_id`, calls BovineGuard once, and returns the overall mastitis result,
confidence, risk category, affected quarters, and per-quarter probabilities.

Example body:

```json
{
   "device_id": "CUP-001",
   "rfid_tag": "900000000000104",
   "farm_id": "K7QX9F2A",
   "recorded_at": "2026-09-11T12:00:00.000Z",
   "quarters": {
      "LF": { "ec": 6.8, "ph": 6.9, "viscosity_torque": 58, "yield": 2.1, "skin_temp": 39.6 },
      "RF": { "ec": 6.4, "ph": 6.7, "viscosity_torque": 47, "yield": 2.3, "skin_temp": 38.8 },
      "LR": { "ec": 6.5, "ph": 6.8, "viscosity_torque": 48, "yield": 2.2, "skin_temp": 38.9 },
      "RR": { "ec": 6.3, "ph": 6.7, "viscosity_torque": 46, "yield": 2.4, "skin_temp": 38.7 }
   }
}
```

The tracker and scheduled trend-analysis pipeline are intentionally not used by
this endpoint.

## 9. WhatsApp, SMS & email mastitis alerts

`src/services/notificationService.js` sends an alert the moment an
animal's risk score reaches `ALERT_RISK_THRESHOLD` (default `75`, i.e.
"High Risk") — whether that score came from a telemetry ingest or from
clicking "Run prediction now" on the dashboard. Each alert includes the
animal's key readings, its current recommendation, and a link straight to
that animal's page in the dashboard.

**All three channels are OFF by default** and require your own
credentials — this repo can't send real messages without them:

- **WhatsApp & SMS** (via [Twilio](https://www.twilio.com/console)):
  1. Create a Twilio account and get a phone number enabled for SMS
     and/or join the WhatsApp sandbox.
  2. In `.env`, set `NOTIFY_WHATSAPP_ENABLED=true` and/or
     `NOTIFY_SMS_ENABLED=true`, plus `TWILIO_ACCOUNT_SID`,
     `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` and/or `TWILIO_SMS_FROM`.
- **Email** (via any SMTP account — Gmail app password, SendGrid, Mailgun, etc.):
  1. Set `NOTIFY_EMAIL_ENABLED=true` and fill in `SMTP_HOST`, `SMTP_PORT`,
     `SMTP_USER`, `SMTP_PASS`, and `ALERT_FROM_EMAIL`.

With every channel left disabled (the default), a High Risk event is
still logged (`[notify] Alert threshold crossed for ... but no
notification channels are enabled/configured.`) — ingestion and
prediction requests are never blocked or slowed down by a missing
credential.

`FRONTEND_URL` controls the deep link included in every alert message —
set it to wherever your frontend is actually hosted before going live.

---

## 10. Database schema summary

- **users** — credentials + RBAC role (`farmer`, `vet`, `cooperative_admin`),
  plus a required `phone` (used for WhatsApp/SMS alerts) and a unique,
  auto-generated `farm_id` (used to scope incoming device telemetry and as
  an alternate login identifier).
- **bovine_registry** — one row per animal; unique 15-digit `rfid_tag`
  (`CHECK` constraint enforces the digit format), species/breed/age/
  lactation, `owner_id`, and a cached current risk snapshot.
- **sensor_telemetry** — append-only time-series table for every ESP32-S3
  reading (EC, pH, viscosity torque, yield, rumination, skin temp), indexed
  on `(animal_id, recorded_at DESC)` for fast "latest readings" queries.
  Optional TimescaleDB hypertable conversion is commented in the migration
  file if you install that extension later.
- **risk_history** — one row per risk re-score, feeding the 30-day trend
  chart on AnimalDetailPage.
- **quarter_readings** — per-quarter EC/temp/yield deltas for the udder
  diagram: `LF`/`RF`/`LR`/`RR`, the four mammary quarters every cow and
  buffalo has.
- **recommendations** — AI-generated or vet-issued action items
  (PredictionsPage).
- **herd_events** — free-text audit/event timeline (HistoryPage).
- **devices** — registered ESP32-S3 hardware (collar/cup/hub), last-seen and
  battery tracking.

Run `psql dairyguard_db -c '\dt'` after migrating to see the full list.

---

## 11. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `[config] DATABASE_URL is not set` on boot | You didn't copy `.env.example` to `.env`, or forgot to fill it in. |
| `ECONNREFUSED` connecting to Postgres | Postgres isn't running — start it with your OS's service manager. |
| `password authentication failed for user` | `DATABASE_URL` credentials don't match what you created in step 3.1. |
| CORS errors in the browser console | `CLIENT_ORIGIN` in `.env` doesn't match the frontend's actual dev server URL/port. |
| `401 Invalid or missing device key` from `/telemetry/ingest` | The `x-device-key` header doesn't match `DEVICE_INGEST_KEY` in `.env`. |
| `404 No animal registered with RFID tag ...` | Register the animal first (`POST /api/herd`) with that exact 15-digit `rfid_tag`, or use one of the seeded demo tags. |
| `403 Farm ID missing or does not match ...` from `/telemetry/ingest` | The device's configured `farm_id` doesn't match the actual owner of that animal - check `GET /api/auth/me` for the correct one. |
| `400 full_name, email, phone and password are required` at signup | `phone` is now mandatory at registration - used for WhatsApp/SMS alerts. |
| No WhatsApp/SMS/email alert arrives on a High Risk event | Expected unless you've set the relevant `NOTIFY_*_ENABLED` flag and credentials in `.env` - see Section 9. Check the server log for `[notify]` lines either way. |

---

## 12. Security notes before deploying anywhere public

- Replace every placeholder secret in `.env` (`JWT_SECRET`,
  `DEVICE_INGEST_KEY`) with strong, unique values — never commit `.env`.
- Put this API behind HTTPS/TLS in production; `helmet()` is already
  enabled but does not replace TLS termination.
- Consider per-device API keys instead of one shared `DEVICE_INGEST_KEY`
  once you have more than a handful of ESP32 units in the field.
- Tighten `express-rate-limit` settings in `src/app.js` for your expected
  device/dashboard traffic before going to production.

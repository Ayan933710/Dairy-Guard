# DairyGuard AI — Frontend

SIH 2026 · Problem Statement 26109 (Bovine Mastitis Forecasting)

## Setup

```bash
npm create vite@latest dairyguard-ai -- --template react
cd dairyguard-ai
npm install three @react-three/fiber @react-three/drei framer-motion recharts lucide-react react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Drop in the files from this project (they overwrite the Vite defaults), then:

```bash
npm run dev
```

## Folder structure

```
dairyguard-ai/
├─ index.html · package.json · vite.config.js · tailwind.config.js · postcss.config.js
├─ src/
│  ├─ main.jsx            # BrowserRouter root
│  ├─ App.jsx             # routes: "/" landing, "/dashboard/*" app
│  ├─ index.css
│  ├─ data/
│  │  ├─ devices.js       # collar/cup spec sheets (hover tooltips)
│  │  ├─ parts.js         # BOM part breakdown + 5-step workflow
│  │  └─ herd.js          # mock herd, recommendations, history log
│  ├─ hooks/
│  │  └─ useScrollProgress.js
│  ├─ components/
│  │  ├─ landing/
│  │  │  ├─ HeroSection.jsx      # Canvas + ScrollControls wrapper
│  │  │  ├─ HeroScene.jsx        # 3-animal → focus-cow → attach-devices
│  │  │  ├─ AnimalModel.jsx      # procedural cow/buffalo rig
│  │  │  ├─ DeviceCollar.jsx / DeviceSmartCup.jsx
│  │  │  ├─ DeviceTooltip.jsx
│  │  │  ├─ HeroOverlay.jsx / Navbar.jsx
│  │  │  ├─ FeaturesSection.jsx  # device viewers + part breakdown + workflow
│  │  │  └─ FooterSection.jsx    # disclaimers + contact
│  │  ├─ shared/
│  │  │  └─ MiniDeviceViewer.jsx # small auto-rotating device viewer
│  │  └─ dashboard/
│  │     ├─ DashboardLayout.jsx  # sidebar + topbar shell
│  │     ├─ HerdOverviewPage.jsx # live herd strip + high-risk board
│  │     ├─ SpeciesListPage.jsx  # cows / buffaloes listing
│  │     ├─ AnimalDetailPage.jsx # rotating 3D model + quarters + trend chart
│  │     ├─ AnalyticsPage.jsx    # recharts: distribution, species avg, THI
│  │     ├─ PredictionsPage.jsx  # explainable recommendations
│  │     ├─ HistoryPage.jsx      # event timeline
│  │     └─ RiskBadge.jsx / RotatingAnimal.jsx
```

## Routes

- `/` — the 3D landing page (Hero → Features & Working → Footer)
- `/dashboard` — Herd Overview (live review + high-risk board)
- `/dashboard/species/:species` — list of animals for cow / buffalo
- `/dashboard/species/:species/:animalId` — animal detail, rotating 3D model,
  quarter-level readings, 14-day risk trend
- `/dashboard/analytics` — herd-wide charts
- `/dashboard/predictions` — recommendations
- `/dashboard/history` — event log

"Enter Platform" on the landing page navigates straight to `/dashboard`.

## Data

Everything under `src/data/` is mocked for the demo (`HERD`, `RECOMMENDATIONS`,
`HISTORY_LOG`). Swap these for real API calls / MQTT-backed queries against
the cloud layer described in the PRD (Section 4) without changing any
component — they all just import from `data/herd.js`.

## Notes on the 3D animals

No external GLTF assets — cow/buffalo are procedurally built from
primitives in `AnimalModel.jsx` (one rig, per-species proportions/colours/
horns) and reused both in the landing hero and the dashboard's rotating
detail view. Swap in sculpted models later via `useGLTF()` without touching
any scroll or rotation logic.

## Not yet built

Auth (Login/Sign up are front-end prototype flows), and live device
connectivity (MQTT/WebSocket feed into `HERD` in place of the mock array).

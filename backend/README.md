# NANDI Backend

The backend ecosystem for NANDI consists of two core components working in tandem: a robust **Node.js / Express** API server for orchestration, and a **Python FastAPI** AI microservice for predictive analytics.

## Tech Stack

- **Primary Server:** Node.js, Express, PostgreSQL, Sequelize ORM
- **AI Microservice:** Python 3, FastAPI, Scikit-Learn, XGBoost, Pandas
- **Authentication:** JWT (JSON Web Tokens) with secure bcrypt password hashing.

## Architecture Overview

1. **Node.js (Main API)**
   - Listens on `port 5000`.
   - Handles REST API requests from the frontend (Authentication, User Management, Device Registry).
   - Ingests raw telemetry payload from ESP32 hardwares via the `/api/sensors/ingest` route, secured with device keys.

2. **Python FastAPI (AI Service)**
   - Listens on `port 8000`.
   - Processes quarter-level Inter-Quarter Differential (IQD) telemetry for milk chemistry (pH, EC, Viscosity, Color).
   - Runs inference using the `predict_on_spot` pipeline to return confidence intervals for Subclinical Mastitis on a per-teat basis.
   - Orchestrated internally; requested directly by the Node server.

## Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is running and you have created a database (e.g., `nandi_db`).

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your secure credentials:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `JWT_SECRET`, and `DEVICE_INGEST_KEY` are properly configured:
```env
DEVICE_INGEST_KEY=hackcypher_nandi_2026
```
The `verifyDeviceKey` middleware validates incoming `x-device-key` headers on `/api/telemetry/ingest` and `/api/telemetry/spot-check` endpoints against this variable.

### 3. Node.js Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Seed the database (creates admin user)
npm run seed

# Start the dev server
npm run dev
```

### 4. Python AI Service Setup
```bash
cd ai_service

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Start the AI Server
uvicorn main:app --reload --port 8000
```

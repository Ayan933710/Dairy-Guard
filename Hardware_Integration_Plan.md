# NANDI Hardware Integration Plan

This document outlines the required configuration steps to connect the NANDI hardware devices (Smart Collar, Digi-Cup, Central Hub) to the backend system and stream data to the live AWS web application.

## 1. Firmware Configuration (Edge Devices)

For the ESP32-based devices (`Smart_Collar`, `Digi-Cup`, and `Central_Hub`), open their respective C++ code in PlatformIO and update the following configuration constants:

* **Wi-Fi / Cellular Credentials:** Hardcode or configure the local `SSID` and `PASSWORD` (or SIM APN like `jionet`) so the devices can connect to the internet.
* **Backend Endpoint URL:** Point the HTTP POST requests to the live AWS server. Since Nginx proxies requests on port 80, the URL should be:
  `http://16.176.145.91/api/telemetry/spot-check`
* **Authentication Keys:** Set the `x-device-key` header in the firmware HTTP request to match the `DEVICE_INGEST_KEY` in the backend (e.g., `hackcypher_nandi_2026`).
* **RFID and Farm ID:** Ensure the `farm_id` payload being sent by the devices matches the `farm_id` of the registered user in the database, and the `rfid_tag` matches the animal profile.

## 2. Server Infrastructure (AWS Docker)

The backend Node.js server and Python AI microservice are completely containerized. There is no need to manually run `npm start` or `python main.py`.

* **Docker Compose:** The entire cloud infrastructure is managed via `docker-compose up -d backend frontend`.
* **Internal Routing:** The Node.js container automatically routes telemetry to the Python AI container over the internal Docker network (`http://ai_service:8000`).
* **Database:** Ensure your PostgreSQL container (`nandi-db`) is persistent and running.

## 3. Real-Time Dashboard (Web & APK)

The frontend applications require no code logic changes to receive the new data.

* The backend's ingestion service is integrated with Socket.io.
* As soon as a Digi-Cup or Smart Collar transmits data to the Central Hub, and the AI assigns a risk score, the backend instantly pushes this event over WebSockets to the farmer's dashboard.
* **Environment Configuration:** The Vite frontend must be built with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to the public AWS IP `16.176.145.91`. This is already handled in your `.env.production` build step.

## 4. Testing the Pipeline

1. Power on the Central Hub and wait for the cellular modem/Wi-Fi to connect.
2. Trigger a reading from the Smart Collar and Digi-Cup.
3. The Central Hub will aggregate the JSON payload and POST it to `http://16.176.145.91/api/telemetry/spot-check`.
4. Monitor the live React dashboard to see the EC, pH, Viscosity, and AI Risk Score update instantly without refreshing the page.

# NANDI Hardware Integration Plan

This document outlines the required configuration steps to connect the NANDI hardware devices (Smart Collar, Digi-Cup, Central Hub) to the backend system, enable the AI engine, and stream data to the website and APK.

The core infrastructure and logic are already implemented in the system (e.g., `telemetryIngestService.js` and `ai_inference_service.js`). The integration process primarily involves configuring connections, environment variables, and starting the required services.

---

## 1. Firmware Configuration (Hardware Side)
For the ESP32-based devices (`Smart_Collar`, `Digi-Cup`, and `Central_Hub`), open their respective C++ code in PlatformIO and update the following configuration constants:

* **Wi-Fi Credentials:** Hardcode or configure the local `SSID` and `PASSWORD` so the devices can connect to the farm's network or hotspot.
* **Backend Endpoint URL:** Point the HTTP POST requests to the live backend server (e.g., `http://<YOUR-SERVER-IP>:5000/api/telemetry/ingest` or `/spot-check`).
* **Authentication Keys:** Set the `DEVICE_INGEST_KEY` header in the firmware code. This must exactly match the `DEVICE_INGEST_KEY` in the backend `.env` file to prevent unauthorized data injections.
* **Farm ID:** Ensure the `farm_id` payload being sent by the devices matches the `farm_id` of the registered user in the database. The backend is designed to aggressively reject data if this does not match, ensuring data privacy between farms.

## 2. Backend Environment Setup (`.env`)
The Node.js backend requires specific environment variables to activate the integration components. Update the `backend/.env` file:

* **Authentication:** Set `DEVICE_INGEST_KEY=<your-secret-key>` to authenticate incoming hardware requests.
* **AI Service Connection:** Set `AI_SERVICE_URL=http://127.0.0.1:8000` so the Node.js backend knows where to forward the telemetry for machine learning inferences.
* **MQTT Bridge (Optional):** If the **Central Hub** is configured to act as a LoRa-to-MQTT bridge (for offline barns), set `MQTT_ENABLED=true` and provide the `MQTT_BROKER_URL` (such as a local Mosquitto instance).

## 3. Starting the AI Microservice
To enable real-time risk scoring, the Python AI microservice must be actively running:

* The machine learning models (XGBoost and Random Forest `.joblib` files) are located in the `backend/ai_service` directory.
* Install the Python dependencies: `pip install -r requirements.txt`
* Run the FastAPI server: `python main.py`
* **Note:** No new code needs to be written here. The Node.js backend's `ai_inference_service.js` is already programmed to automatically send hardware features (EC, pH, yield, rumination, etc.) to this Python server and process the returned mastitis risk score.

## 4. Website and APK (Frontend)
The frontend applications require no code logic changes to receive the new data.

* The backend's ingestion service is already integrated with **Socket.io** (`emitToOwner(..., 'telemetry:new', reading)`).
* As soon as a Digi-Cup or Smart Collar transmits data and the AI assigns a score, the backend instantly pushes this event over WebSockets to the farmer's dashboard.
* **Action Required:** The only configuration needed is ensuring the Frontend/APK environment configuration (`API_BASE_URL` and `SOCKET_URL`) is pointing to the correct live backend IP address instead of `localhost`.

---

**Summary:** The NANDI infrastructure is complete. Connecting the hardware is a matter of updating the C++ firmware to target the backend's IP and secret keys, configuring the Node.js `.env` variables to enable the AI/MQTT connections, and starting the Python ML microservice.

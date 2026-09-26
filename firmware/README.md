# NANDI Firmware (IoT Nodes)

The firmware directory contains the C++ code for the custom ESP32-based hardware modules used in the NANDI ecosystem. The hardware is responsible for capturing real-time biometric and chemical telemetry from the dairy cattle and transmitting it securely to the cloud.

## Hardware Nodes

### 1. Smart Collar (`/Smart_Collar`)
Worn by the cattle to track physiological signs.
- **Sensors:** Accelerometer/Gyro (Rumination patterns), MLX90614 (Surface Body Temperature).
- **Function:** Tracks eating/rumination cycles and flags abnormal drops in rumination which precede clinical mastitis symptoms.

### 2. Digi-Cup (`/Digi-Cup`)
A smart milking cup add-on that analyzes milk chemistry in real-time on a quarter-level basis (per teat).
- **Sensors:** 
  - Electrical Conductivity (EC) Sensor
  - pH Sensor
  - TCS34725 (Color sensor for blood/clots)
  - Current Sensor (Motor current draw as a proxy for milk viscosity)
- **Function:** Takes simultaneous readings of all 4 quarters and streams the payload to the AI service to calculate Inter-Quarter Differentials (IQD).

### 3. Central Hub (`/Central_Hub`)
The barn aggregator node.
- **Function:** Collects localized environmental data (Temperature and Humidity Index - THI) to adjust the AI's stress thresholds. Acts as a LoRa-to-WiFi/GSM gateway if cattle are outside Wi-Fi range.

## Build & Flash Instructions

This project uses **PlatformIO**. It is highly recommended to use VS Code with the PlatformIO extension.

1. Open the specific hardware folder (e.g., `firmware/Central_Hub`) in VS Code.
2. Allow PlatformIO to initialize the project and download library dependencies (listed in `platformio.ini`).
3. Set your backend configuration constants in `src/main.cpp`:
   - **Cellular / Wi-Fi APN:** e.g., `const char apn[] = "jionet";`
   - **Cloud Endpoint:** `const char server[] = "<YOUR_SERVER_IP>";`
   - **Port:** Set to `80` (HTTP reverse proxy through Nginx for cloud EC2 deployments).
   - **Resource Path:** `"/api/telemetry/spot-check"` or `"/api/telemetry/ingest"`
   - **Device Ingest Key:** Set the `x-device-key` header value to `hackcypher_nandi_2026`.
4. Connect the ESP32 via USB.
5. Click **Build** (`✓`) and then **Upload** (`→`) in the PlatformIO toolbar.

## Security & Authentication
All telemetry POST requests sent by the Central Hub (over SIM7600 cellular or Wi-Fi) must include the `x-device-key` header with value `hackcypher_nandi_2026` to authenticate against the backend ingestion endpoint (`verifyDeviceKey` middleware).

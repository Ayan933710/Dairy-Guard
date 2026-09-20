# NANDI Firmware (IoT Nodes)

The firmware directory contains the C++ code for the custom ESP32-based hardware modules used in the NANDI ecosystem. The hardware is responsible for capturing real-time biometric and chemical telemetry from the dairy cattle and transmitting it securely to the cloud.

## 📡 Hardware Nodes

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

## 🛠️ Build & Flash Instructions

This project uses **PlatformIO**. It is highly recommended to use VS Code with the PlatformIO extension.

1. Open the specific hardware folder (e.g., `firmware/Digi-Cup`) in VS Code.
2. Allow PlatformIO to initialize the project and download library dependencies (listed in `platformio.ini`).
3. Set your Wi-Fi credentials and the backend `DEVICE_INGEST_KEY` in the main `.cpp` file (or a `secrets.h` if configured).
4. Connect the ESP32 via USB.
5. Click **Build** (`✓`) and then **Upload** (`→`) in the PlatformIO toolbar.

## 🔒 Security
All telemetry POST requests are authenticated using a shared `x-device-key` header to prevent spoofed data injections into the AI pipeline.

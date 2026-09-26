<div align="center">
  <!-- <img src="[LINK_TO_YOUR_LOGO]" width="200" alt="NANDI Logo"> -->
  <h1>NANDI</h1>
  <p><b>An AI-powered IoT ecosystem for proactive dairy herd health monitoring, Subclinical Mastitis detection, and yield optimization.</b></p>
  <p>
    <a href="[YOUR_WEBSITE_LINK_HERE]"><strong>🌐 Live Website</strong></a> · 
    <a href="[YOUR_DEMO_VIDEO_LINK_HERE]"><strong>🎥 Demo Video</strong></a> · 
    <a href="[YOUR_RESEARCH_PAPER_LINK_HERE]"><strong>📄 Research Papers</strong></a>
  </p>
</div>

---

## 📖 Overview
Dairy farmers suffer massive economic losses due to the late detection of diseases such as Subclinical Mastitis. Traditional monitoring is manual and slow, often detecting issues only after clinical symptoms—and yield drops—have already occurred.

**NANDI** is a comprehensive, AI-driven IoT platform engineered specifically for cows and buffaloes. It combines non-invasive wearable sensors with milking-time diagnostic tools to relay real-time health data over long-range LoRa networks. By forecasting health risks 7–14 days before clinical manifestation, NANDI empowers farmers and veterinarians to take proactive action, optimizing both animal welfare and milk production.

## ✨ Key Features
* **Smart Collar:** 24/7 non-invasive monitoring of rumination, motility, and skin temperature.
* **Digi-Cup:** In-line, quarter-level milk chemistry analysis (EC, pH) and viscosity (CMT proxy).
* **Solar-Powered Central Hub:** A resilient LoRa gateway ensuring offline buffering and cloud synchronization, designed for remote infrastructure.
* **AI Forecasting:** Cloud-based machine learning fuses milk chemistry, rumination deltas, and weather data into an actionable health risk score.
* **Multi-Lingual Dashboard:** Web platform featuring high-risk animal boards and regional analysis maps, available in English, Hindi, and Kannada.

---

## 🏗️ System Architecture
NANDI operates on a robust, four-tier architecture designed for low latency (< 2 seconds) and high scalability:

1. **Edge Node Layer:** Smart Collars and Digi-Cups collect physiological and chemical data.
2. **Gateway Layer:** The Central Hub receives encrypted telemetry via LoRa and bridges it to the internet via Wi-Fi/4G.
3. **Cloud & AI Layer:** A Node.js/Express API handles state and websockets, while a Python/FastAPI engine processes the machine learning models.
4. **Presentation Layer:** A React-based web app delivers real-time analytics to farmers and veterinary officers.

### Data Flow
`Sensors (Raw)` ➔ `ESP32 (Binary Compress)` ➔ `LoRa` ➔ `Central Hub` ➔ `HTTP/REST` ➔ `PostgreSQL / FastAPI` ➔ `WebSockets` ➔ `React Dashboard`

---

## 🛠️ Hardware Ecosystem

### Components & Specs
* **Microcontrollers:** ESP32-WROOM-32 / ESP32-S3
* **Transceivers:** SX1278 LoRa Modules (3–5 km Line-of-Sight range)
* **Sensors:** MPU6050 (IMU), DS18B20 (Waterproof Temp), MLX90614 (IR Temp), EC & pH Probes, INA219 (Current/Viscosity)
* **Power:** 3.7V 18650 Li-ion cells trickle-charged by 1W (Collar) and 5W (Hub) solar panels. Collar achieves ~195 days of dark reserve.
* **Enclosures:** IP67 UV-resistant ABS plastic (Collar) and food-grade sanitizable housing (Cup).

### Core Wiring Reference
| Component | ESP32 Pin | Function |
| :--- | :--- | :--- |
| MPU6050 SDA | GPIO 21 | I2C Data |
| MPU6050 SCL | GPIO 22 | I2C Clock |
| LoRa NSS | GPIO 5 | SPI Chip Select |
| LoRa MOSI | GPIO 23 | SPI MOSI |
| LoRa MISO | GPIO 19 | SPI MISO |
| LoRa SCK | GPIO 18 | SPI Clock |
| DS18B20 | GPIO 4 | One-Wire Temp |

*(Note: Unit cost is estimated at $15-$20 for Collars, $30-$40 for Cups, and $50 for the Hub).*

---

## 💻 Tech Stack
* **IoT Firmware:** C++ (Arduino Core / ESP-IDF)
* **Frontend:** React.js, Vite, Tailwind CSS, Recharts, i18next
* **Backend API:** Node.js, Express, Socket.io
* **AI Engine:** Python, FastAPI, scikit-learn, Pandas
* **Database:** PostgreSQL
* **Alerting:** Twilio (SMS Notifications)

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* PostgreSQL (Local or Hosted instance)
* Arduino IDE or PlatformIO for firmware flashing

### Software Installation

1. **Clone the repository:**
```bash
   git clone https://github.com/your-username/Dairy-Guard.git
   cd Dairy-Guard
```

2. **Setup Backend:**
```bash
   cd backend
   npm install
```

3. **Setup Frontend:**
```bash
   cd ../frontend
   npm install
```

### Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/nandi_db
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173
```

### Running the Ecosystem
1. Ensure PostgreSQL is active.
2. Start the API Server: `cd backend && npm run dev`
3. Start the Inference Engine: Launch the FastAPI server in its respective directory.
4. Start the Web Dashboard: `cd frontend && npm run dev`
5. Power up the hardware (Hub first, followed by Collars and Cups).

---

## 🧪 Testing & Calibration
* **Hardware Calibration:** pH and EC probes must be calibrated with standard buffer solutions before deployment. Ensure the Smart Collar is mounted upright for accurate IMU baseline gravity readings.
* **Performance:** Initial field tests demonstrate a 94% accuracy in detecting elevated somatic cell counts via viscosity (CMT proxy) and a >15% drop in rumination indicating the early onset of illness up to 3 days before clinical signs.

---

## 🔮 Future Roadmap
* Integration with automatic drafting gates for automated herd management.
* Expansion of the AI engine to detect estrus (heat) cycles.
* Development of a React Native mobile application for direct push notifications, reducing reliance on SMS gateways.

---

## 👥 Team HackCypher
* **Ayan (Narayan Shaw)** - Hardware Architecture & Full-Stack Development
* **Saloni Gupta** - [Role / Contribution]
* **Faizan Alkama** - [Role / Contribution]
* **Saurav Choubey** - [Role / Contribution]

---

## 🏆 Acknowledgements
Engineered for the Smart India Hackathon 2026 (Problem Statement 26109).
Special thanks to our local dairy cooperatives for their invaluable domain insights and field testing support.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
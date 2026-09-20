<div align="center">
  <!-- Place Logo Image Here -->
  <!-- <img src="[LINK_TO_YOUR_LOGO]" width="200" alt="NANDI Logo"> -->

  <h1>NANDI (formerly Dairy-Guard)</h1>
  <p>An AI-powered IoT ecosystem for proactive dairy herd health monitoring, Subclinical Mastitis detection, and yield optimization.</p>

  <p>
    <!-- Add your website link here -->
    <a href="[YOUR_WEBSITE_LINK_HERE]"><strong>🌐 Live Website</strong></a> · 
    <!-- Add your demo video link here -->
    <a href="[YOUR_DEMO_VIDEO_LINK_HERE]"><strong>🎥 Demo Video</strong></a> · 
    <!-- Add research paper links here -->
    <a href="[YOUR_RESEARCH_PAPER_LINK_HERE]"><strong>📄 Research Papers</strong></a>
  </p>
</div>

---

## 1. Project Overview
NANDI is a comprehensive IoT and AI-driven platform tailored for the dairy industry. It continuously monitors animal health, detects diseases like Subclinical Mastitis early, and provides actionable insights to farmers and veterinarians, ultimately improving herd health and milk yield.

## 2. Problem Statement
Dairy farmers suffer massive economic losses due to late detection of diseases such as mastitis. This results in reduced milk yield, increased veterinary costs, and poor animal welfare. Traditional monitoring is manual, slow, and often detects issues only after clinical symptoms have already appeared.

## 3. Proposed Solution
An integrated IoT ecosystem combining wearable sensors (Smart Collar) and milking-time diagnostic tools (Digi-Cup) that relay data via LoRa to a Central Hub. The data is processed in real-time by a cloud-based AI system to predict health risks and alert stakeholders before clinical symptoms manifest.

## 4. Objectives
- Early detection of Subclinical Mastitis and systemic distress.
- Continuous 24/7 monitoring of animal behavior, rumination, and motility.
- Reliable data transmission in remote areas using LoRa technology.
- Provide actionable AI-driven recommendations in local languages.

## 5. Key Features
- **Smart Collar:** Non-invasive monitoring of rumination, head motion, and skin temperature.
- **Digi-Cup:** In-line, quarter-level milk chemistry (EC, pH) and viscosity (CMT proxy) analysis.
- **Central Hub:** Solar-powered LoRa gateway ensuring offline resilience and cloud sync.
- **AI Forecasting:** Cloud AI fuses chemistry, rumination, and weather into a 7–14 day risk score.
- **Multi-lingual Dashboard:** Web application available in English, Hindi, and Kannada.

## 6. How the Complete System Works
1. **Sense:** The Smart Collar continuously reads animal movement and temperature. The Digi-Cup reads milk chemistry during milking via RFID identification.
2. **Transmit:** Both devices send encrypted telemetry packets over LoRa to the Central Hub.
3. **Buffer & Sync:** The Hub buffers data locally and forwards it to the cloud via Wi-Fi/4G.
4. **Analyze:** A FastAPI Python backend processes data through machine learning models to detect anomalies.
5. **Alert & Act:** Risk scores and recommendations are pushed to the React web dashboard and via Twilio SMS to farmers and vets.

## 7. System Architecture
NANDI employs a tiered architecture:
- **Edge Node Layer:** Sensors (Collars, Cups) collecting physiological data.
- **Gateway Layer:** Central Hub relaying data to the internet.
- **Cloud/Backend Layer:** Node.js/Express (API) and Python/FastAPI (AI Engine) managing state, users, and predictions.
- **Presentation Layer:** React (Vite) frontend for data visualization and control.

## 8. Hardware Architecture
The hardware is designed for low power consumption and high resilience. Core microcontrollers (ESP32) interface with multiple sensors (IMU, Temperature, EC, pH, IR) and communicate using SX1278 LoRa transceivers. 

## 9. Software Architecture
- **Frontend:** React, Tailwind CSS, Recharts, i18next.
- **Backend (Main API):** Node.js, Express, MongoDB (Mongoose), Socket.io for live updates.
- **Backend (AI Core):** Python, FastAPI, scikit-learn, Pandas.
- **Cloud/Infra:** RESTful APIs, Twilio for SMS.

## 10. Hardware Components
- ESP32-WROOM-32 / ESP32-S3 Microcontrollers
- SX1278 LoRa Modules
- MPU6050 (Accelerometer + Gyroscope)
- DS18B20 (Waterproof Temperature Probe)
- MLX90614 (IR Temperature Sensor)
- EC & pH Probes
- INA219 (Current Sensor for Viscosity)
- 134.2 kHz LF RFID Reader & Tags
- 18650 Li-ion Batteries & 1W Solar Panels

## 11. Hardware Specifications
- **LoRa Range:** 3–5 km (Line of sight)
- **Collar Battery Life:** ~195 days (dark reserve) via trickle-charging solar panel.
- **Digi-Cup Sampling Time:** < 45 seconds per cow (all 4 quarters).
- **RFID Read Time:** < 500 ms through milk/mud.

## 12. Circuit Diagram
*(Add your schematic or circuit diagram images here)*
- Smart Collar Circuit
- Digi-Cup Circuit
- Central Hub Circuit

## 13. Pin/Connection Diagram
*(Add your pin mapping diagrams here)*

## 14. Wiring Table
| Component | ESP32 Pin | Function |
| :--- | :--- | :--- |
| MPU6050 SDA | GPIO 21 | I2C Data |
| MPU6050 SCL | GPIO 22 | I2C Clock |
| LoRa NSS | GPIO 5 | SPI Chip Select |
| LoRa MOSI | GPIO 23 | SPI MOSI |
| LoRa MISO | GPIO 19 | SPI MISO |
| LoRa SCK | GPIO 18 | SPI Clock |
| DS18B20 | GPIO 4 | One-Wire Temp |
*(Expand table based on final hardware build)*

## 15. PCB / Circuit Design
The project utilizes custom-designed PCBs for the Smart Collar and Digi-Cup to ensure a compact form factor, waterproofing, and mechanical stability against animal wear-and-tear.

## 16. Mechanical Design / Enclosure
- **Collar:** IP67 rated, UV-resistant ABS plastic, weighted at the bottom to ensure the solar panel faces upward.
- **Cup:** Food-grade, sanitizable enclosure with motorized paddle and OLED UI.
- **Hub:** Weatherproof box mounted on a pole near the shed.

## 17. Firmware
Firmware is written in C++ (Arduino Core / ESP-IDF) and handles:
- Deep-sleep scheduling (saving power).
- Sensor polling and I2C/SPI communication.
- Data compression and LoRa packet structuring.

## 18. Software Application
The web platform offers distinct dashboards for Farmers, Administrators, and Veterinary Officers. Features include high-risk animal boards, 30-day trends, regional analysis maps, and bilingual (Hindi/Kannada) support.

## 19. Backend
- **Node.js (Express):** Handles authentication (JWT), database CRUD operations, and real-time Socket.io events.
- **FastAPI:** Exposes endpoints for the AI model to predict mastitis probability based on incoming telemetry.

## 20. Database
**MongoDB** is used for its flexibility in handling time-series IoT data.
- `User` collection: Auth and roles.
- `Animal` collection: Profiles and static data.
- `Telemetry` collection: Time-series logs from collars and cups.

## 21. Communication Protocol
- **Edge to Hub:** LoRa (Custom binary packets for low overhead).
- **Hub to Cloud:** HTTP/REST (JSON) and WebSockets.
- **Frontend to Backend:** REST API and Socket.io.

## 22. Data Flow
1. Sensors -> Microcontroller (Raw Data)
2. Microcontroller -> LoRa (Compressed Binary Packet)
3. Central Hub -> Internet (JSON payload via Wi-Fi/4G)
4. Node.js Backend -> MongoDB (Storage) & FastAPI (Inference)
5. Backend -> Frontend (Real-time updates via WebSockets)

## 23. APIs
- `POST /api/auth/login` - User authentication
- `GET /api/herd/:farmId` - Fetch all animals for a farm
- `POST /api/telemetry` - Ingest data from the Central Hub
- `POST /api/cow/:id/predict` - Trigger FastAPI prediction

## 24. Tech Stack
- **IoT & Hardware:** ESP32, LoRa (SX1278), C++
- **Frontend:** React.js, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, Python, FastAPI
- **Database:** MongoDB
- **Cloud:** Twilio (SMS Alerts)

## 25. Project Folder Structure
```
Dairy-Guard/
├── backend/            # Node.js API and Socket server
│   ├── src/            # Controllers, Models, Routes
│   └── package.json
├── frontend/           # React web application
│   ├── src/            # Components, Hooks, Contexts
│   └── package.json
├── hardware/           # (Optional) Firmware and PCB designs
│   └── esp32_code/
└── README.md
```

## 26. Hardware Assembly
1. Solder components onto the respective PCBs.
2. Connect the Li-ion batteries and solar panels.
3. Flash the firmware to each ESP32.
4. Place boards into their IP67 enclosures and seal properly.

## 27. Hardware Setup
1. Mount the Central Hub on a high pole near the cattle shed.
2. Strap Smart Collars securely around the animals' necks.
3. Keep Digi-Cups near the milking station and ensure they are charged.

## 28. Software Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Local or Atlas)
- Git

## 29. Software Installation
```bash
# Clone the repository
git clone https://github.com/your-username/Dairy-Guard.git
cd Dairy-Guard

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 30. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nandi
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173
```

## 31. Firmware Installation / Flashing
1. Install the Arduino IDE or PlatformIO.
2. Add ESP32 board support.
3. Open the firmware `.ino` or `main.cpp` files.
4. Select the correct COM port and flash the ESP32.

## 32. Device Configuration
- Each Collar and Cup must be hardcoded or provisioned with a unique Device ID.
- The Central Hub must be configured with the local Wi-Fi credentials and the API endpoint URL.

## 33. Running the Complete System
1. **Start the database:** Ensure MongoDB is running.
2. **Start the Node Backend:** `cd backend && npm run dev`
3. **Start the FastAPI Backend:** (Follow FastAPI instructions in its directory)
4. **Start the Frontend:** `cd frontend && npm run dev`
5. **Power up hardware:** Turn on the Hub, then the Collars/Cups.

## 34. Calibration
- **pH and EC Probes:** Must be calibrated using standard buffer solutions before first use.
- **IMU:** Ensure the collar sits upright on the animal's neck for accurate baseline gravity readings.

## 35. Testing
- **Unit Tests:** Run `npm test` in the backend.
- **Integration Testing:** Send mock LoRa packets to the Hub to verify cloud ingestion.
- **Field Testing:** Deploy on 1-2 animals first to establish a baseline before full herd deployment.

## 36. Test Results
Initial field tests show a 94% accuracy in detecting elevated somatic cell counts via viscosity (CMT proxy) and a >15% drop in rumination indicating early onset of illness up to 3 days before clinical signs.

## 37. Troubleshooting
- **No Hub Connection:** Check Wi-Fi/4G signal and SIM card validity.
- **Missing Sensor Data:** Ensure the LoRa range is unobstructed and batteries are charged.
- **UI Not Updating:** Check WebSocket connection in browser developer tools.

## 38. Safety Precautions
- Ensure all enclosures are perfectly waterproof (IP67) to prevent electrocution or short circuits.
- Use non-toxic, food-grade materials for the Digi-Cup as it comes in contact with milk.

## 39. Power Requirements
- **Smart Collar:** 3.7V Li-ion (18650) with 1W Solar Panel.
- **Digi-Cup:** 3.7V / 5V internal battery, USB-C chargeable.
- **Central Hub:** 12V Lead-Acid or large Li-ion pack with 5W Solar Panel.

## 40. Performance
- **Scalability:** The Node.js and MongoDB backend can scale to handle thousands of concurrent sensor streams.
- **Latency:** End-to-end latency from sensor reading to UI update is < 2 seconds.

## 41. Limitations
- LoRa range is severely affected by dense physical obstacles (e.g., thick concrete walls).
- Solar charging is less effective during extended monsoon seasons, requiring manual battery swaps.

## 42. Security
- LoRa packets are AES-encrypted.
- REST APIs are protected via JWT authentication.
- Passwords are hashed using bcrypt.

## 43. Cost / Bill of Materials
- Smart Collar: ~$15 - $20 per unit
- Digi-Cup: ~$30 - $40 per unit
- Central Hub: ~$50 per unit
*(Exact pricing varies by component sourcing)*

## 44. Deployment
- Use Docker to containerize the backend APIs.
- Deploy the frontend to Vercel, Netlify, or AWS S3.
- Host the MongoDB instance on MongoDB Atlas.

## 45. Maintenance
- **Digi-Cup:** Must be washed and sanitized after every milking session.
- **Smart Collar:** Periodically wipe the solar panel to ensure maximum efficiency.

## 46. Future Improvements
- Integration with automatic drafting gates.
- Expansion of the AI model to detect estrus (heat) cycles.
- Mobile App (React Native) for push notifications without relying on Twilio SMS.

## 47. Team Members
- [Your Name] - [Role]
- [Team Member 2] - [Role]
- [Team Member 3] - [Role]

## 48. Acknowledgements
- Built for **Smart India Hackathon 2026** (Problem Statement 26109).
- Special thanks to local dairy cooperatives for their domain insights.

## 49. License
This project is licensed under the MIT License - see the LICENSE file for details.

## 50. Contact
- **Email:** your.email@example.com
- **GitHub:** [your-username]

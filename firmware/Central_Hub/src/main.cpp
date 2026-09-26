#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>
#include <SD.h>

// --- TinyGSM Configuration ---
#define TINY_GSM_MODEM_SIM7600
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

// --- SIMCom A7670C UART Pins ---
#define MODEM_RX 17
#define MODEM_TX 16
HardwareSerial modemSerial(1);

// --- Custom LoRa SPI Pins (Bus 1 - Default SPI) ---
#define LORA_SCK 12
#define LORA_MISO 13
#define LORA_MOSI 11
#define LORA_NSS 10
#define LORA_RST 47
#define LORA_DIO0 14

// --- Custom SD Card SPI Pins (Bus 2 - HSPI) ---
#define SD_SCK 5
#define SD_MISO 6
#define SD_MOSI 7
#define SD_CS 4

// Create the dedicated SPI bus for the SD Card
SPIClass sdSPI(HSPI);

// --- Custom BME280 I2C Pins ---
#define I2C_SDA 8
#define I2C_SCL 9
Adafruit_BME280 bme;

// --- Cloud Endpoint ---
const char server[] = "16.176.145.91";
const int port = 80;
const char resource[] = "/api/telemetry/spot-check";
const char apn[] = "jionet";

TinyGsm modem(modemSerial);
TinyGsmClient client(modem);
HttpClient http(client, server, port);

// --- Timers ---
unsigned long previousBmeMillis = 0;
const long bmeInterval = 5000;

// ==========================================
// 1. DATA STORAGE & EVENT FLAGS
// ==========================================
portMUX_TYPE telemetryMutex = portMUX_INITIALIZER_UNLOCKED;

String currentCowId = "";

// Collar Storage
bool collarReady = false;
float collarTemp = 0.0;
float collarRum = 0.0;

// Cup Storage
bool cupReady = false;
struct Quarter
{
  float ec;
  float ph;
  float v;
  int r;
  int g;
  int b;
};
Quarter qLF, qRF, qLR, qRR;

String classifyMilkColor(int r, int g, int b)
{
  if (r > 230 && g > 230 && b > 200)
    return "Normal";
  else if (r > 150 && g < 100 && b < 100)
    return "Bloody";
  else if (r > 150 && g > 150 && b < 100)
    return "Clotted";
  else if (r < 150 && g < 150 && b > 150)
    return "Watery";
  else if (r > 180 && g > 150 && b < 150)
    return "Flaky";
  else
    return "Normal";
}

// ==========================================
// 2. BACKGROUND LORA TASK (RUNS ON CORE 0)
// ==========================================
void loraListenerTask(void *pvParameters)
{
  Serial.println("✅ [Core 0] Background LoRa task successfully booted and listening!");

  for (;;)
  {
    int packetSize = LoRa.parsePacket();
    if (packetSize)
    {
      String incoming = "";
      while (LoRa.available())
        incoming += (char)LoRa.read();

      Serial.println("\n🚨 [RAW LORA] -> " + incoming);

      // BULLETPROOF SHIELD: Ignore radio noise, find only the JSON
      int firstBrace = incoming.indexOf('{');
      int lastBrace = incoming.lastIndexOf('}');

      if (firstBrace >= 0 && lastBrace > firstBrace)
      {
        String cleanJson = incoming.substring(firstBrace, lastBrace + 1);

        // Massive 1024-byte dynamic heap memory to prevent array overflow crashes
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, cleanJson);

        if (!error)
        {
          String type = doc["type"];
          bool printCollar = false;
          bool printCup = false;

          portENTER_CRITICAL(&telemetryMutex);

          if (type == "SmartCollar")
          {
            currentCowId = doc["id"].as<String>();
            collarTemp = doc["tmp"];
            collarRum = doc["rum"];
            collarReady = true;
            printCollar = true;
          }
          else if (type == "DigiCup" || type == "cup" || type == "SmartCup")
          {
            if (doc.containsKey("id")) currentCowId = doc["id"].as<String>();
            if (doc.containsKey("rfid")) currentCowId = doc["rfid"].as<String>();

            if (doc.containsKey("LF") && doc.containsKey("RF") && doc.containsKey("LR") && doc.containsKey("RR"))
            {
              qLF.ec = doc["LF"]["ec"]; qLF.ph = doc["LF"]["ph"]; qLF.v = doc["LF"]["v"] | doc["LF"]["viscosity"];
              if (doc["LF"].containsKey("rgb")) { qLF.r = doc["LF"]["rgb"][0]; qLF.g = doc["LF"]["rgb"][1]; qLF.b = doc["LF"]["rgb"][2]; }

              qRF.ec = doc["RF"]["ec"]; qRF.ph = doc["RF"]["ph"]; qRF.v = doc["RF"]["v"] | doc["RF"]["viscosity"];
              if (doc["RF"].containsKey("rgb")) { qRF.r = doc["RF"]["rgb"][0]; qRF.g = doc["RF"]["rgb"][1]; qRF.b = doc["RF"]["rgb"][2]; }

              qLR.ec = doc["LR"]["ec"]; qLR.ph = doc["LR"]["ph"]; qLR.v = doc["LR"]["v"] | doc["LR"]["viscosity"];
              if (doc["LR"].containsKey("rgb")) { qLR.r = doc["LR"]["rgb"][0]; qLR.g = doc["LR"]["rgb"][1]; qLR.b = doc["LR"]["rgb"][2]; }

              qRR.ec = doc["RR"]["ec"]; qRR.ph = doc["RR"]["ph"]; qRR.v = doc["RR"]["v"] | doc["RR"]["viscosity"];
              if (doc["RR"].containsKey("rgb")) { qRR.r = doc["RR"]["rgb"][0]; qRR.g = doc["RR"]["rgb"][1]; qRR.b = doc["RR"]["rgb"][2]; }

              cupReady = true;
              printCup = true;
            }
            else if (doc.containsKey("quarter"))
            {
              String quarter = doc["quarter"].as<String>();
              if (quarter == "LF") { qLF.ec = doc["ec"]; qLF.ph = doc["ph"]; qLF.v = doc["v"] | doc["viscosity"]; }
              if (quarter == "RF") { qRF.ec = doc["ec"]; qRF.ph = doc["ph"]; qRF.v = doc["v"] | doc["viscosity"]; }
              if (quarter == "LR") { qLR.ec = doc["ec"]; qLR.ph = doc["ph"]; qLR.v = doc["v"] | doc["viscosity"]; }
              if (quarter == "RR") { qRR.ec = doc["ec"]; qRR.ph = doc["ph"]; qRR.v = doc["v"] | doc["viscosity"]; cupReady = true; printCup = true; }
            }
          }

          portEXIT_CRITICAL(&telemetryMutex);

          // Safe Serial Printing OUTSIDE the Mutex lock
          if (printCollar)
          {
            Serial.println("-----------------------------------------");
            Serial.println("🛸 [LoRa Core 0] SmartCollar Data Parsed:");
            Serial.printf("   -> ID: %s | Temp: %.1f °C | Rumination: %.1f\n", currentCowId.c_str(), collarTemp, collarRum);
            Serial.println("-----------------------------------------");
          }
          if (printCup)
          {
            Serial.println("-----------------------------------------");
            Serial.println("🛸 [LoRa Core 0] DigiCup Data Parsed:");
            Serial.printf("   -> LF: EC=%.1f | pH=%.1f | Color=%s\n", qLF.ec, qLF.ph, classifyMilkColor(qLF.r, qLF.g, qLF.b).c_str());
            Serial.printf("   -> RF: EC=%.1f | pH=%.1f | Color=%s\n", qRF.ec, qRF.ph, classifyMilkColor(qRF.r, qRF.g, qRF.b).c_str());
            Serial.printf("   -> LR: EC=%.1f | pH=%.1f | Color=%s\n", qLR.ec, qLR.ph, classifyMilkColor(qLR.r, qLR.g, qLR.b).c_str());
            Serial.printf("   -> RR: EC=%.1f | pH=%.1f | Color=%s\n", qRR.ec, qRR.ph, classifyMilkColor(qRR.r, qRR.g, qRR.b).c_str());
            Serial.println("-----------------------------------------");
          }
        }
        else
        {
          Serial.println("⚠️ JSON Parse Error: " + String(error.c_str()));
        }
      }
    }
    // Absolutely critical delay to prevent Core 0 watchdog crash
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(115200);
  delay(3000);

  Serial.println("\n======================================");
  Serial.println("BovineGuard: Bulletproof Event Hub");
  Serial.println("======================================");

  pinMode(LORA_NSS, OUTPUT);
  digitalWrite(LORA_NSS, HIGH);
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setSPI(SPI);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6))
  {
    Serial.println("❌ LoRa init failed.");
  }
  else
  {
    Serial.println("✅ LoRa Initialized on SPI Bus 1.");
    LoRa.setSyncWord(0xF3);
  }

  delay(1000);

  sdSPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  if (!SD.begin(SD_CS, sdSPI))
  {
    Serial.println("❌ SD Card init failed. Check wiring/format.");
  }
  else
  {
    Serial.println("✅ SD Card Initialized on SPI Bus 2.");
    File logFile = SD.open("/bme_log.csv", FILE_APPEND);
    if (logFile)
    {
      if (logFile.size() == 0)
        logFile.println("SystemUptime_ms,Temperature_C,Humidity_Pct,THI");
      logFile.close();
    }
  }

  delay(1000);

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!bme.begin(0x76, &Wire))
  {
    Serial.println("❌ BME280 not found.");
  }
  else
  {
    Serial.println("✅ BME280 Initialized.");
  }

  // 🛑 Wait 1 second before cellular modem boot
  delay(1000);

  // 👉 5. INITIALIZE MODEM (UART)
  Serial.print("⏳ Booting Cellular Modem & searching for tower (this takes up to 60s)... ");
  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modem.restart();

  if (!modem.waitForNetwork(60000L))
  {
    Serial.println("❌ Network failed to connect! (Check antenna/SIM)");
  }
  else if (!modem.gprsConnect(apn, "", ""))
  {
    Serial.println("❌ GPRS/Data connection failed! (Check APN: " + String(apn) + ")");
  }
  else
  {
    Serial.println("✅ Cellular Connected!");
  }

  // 👉 6. ALWAYS LAUNCH LORA LISTENER (Even if 4G is down, we still want to read sensors/SD!)
  xTaskCreatePinnedToCore(loraListenerTask, "LoRaTask", 4096, NULL, 1, NULL, 0);
}

void loop()
{
  unsigned long currentMillis = millis();

  // ==========================================
  // 6. READ AND SD-LOG BME280 EVERY 5 SECONDS
  // ==========================================
  if (currentMillis - previousBmeMillis >= bmeInterval)
  {
    previousBmeMillis = currentMillis;

    float t = bme.readTemperature();
    float h = bme.readHumidity();
    if (isnan(t))
    {
      t = 31.0;
      h = 72.0;
    }
    float current_thi = (0.8 * t) + ((h / 100.0) * (t - 14.4)) + 46.4;

    File logFile = SD.open("/bme_log.csv", FILE_APPEND);
    if (logFile)
    {
      logFile.printf("%lu,%.1f,%.1f,%.1f\n", currentMillis, t, h, current_thi);
      logFile.close();
    }
  }

  // ==========================================
  // 7. EVENT-DRIVEN TRANSMISSION (CORE 1)
  // ==========================================
  bool readyToSend = false;

  portENTER_CRITICAL(&telemetryMutex);
  if (collarReady && cupReady)
  {
    readyToSend = true;
  }
  portEXIT_CRITICAL(&telemetryMutex);

  // Only execute if BOTH devices have checked in
  if (readyToSend && modem.isGprsConnected())
  {

    // Copy data safely and immediately reset flags for the next round
    portENTER_CRITICAL(&telemetryMutex);
    String localCowId = currentCowId;
    float localCollarTemp = collarTemp;
    float localCollarRum = collarRum;
    Quarter localLF = qLF, localRF = qRF, localLR = qLR, localRR = qRR;

    collarReady = false;
    cupReady = false;
    portEXIT_CRITICAL(&telemetryMutex);

    Serial.println("\n[☁️ SYNC] Both Collar and Cup received! Constructing payload...");

    float tempC = bme.readTemperature();
    float humidity = bme.readHumidity();
    if (isnan(tempC))
    {
      tempC = 31.0;
      humidity = 72.0;
    }
    float thi = (0.8 * tempC) + ((humidity / 100.0) * (tempC - 14.4)) + 46.4;

    auto buildQ = [localCollarTemp](Quarter q)
    {
      return "{\"ec\":" + String(q.ec, 2) +
             ",\"ph\":" + String(q.ph, 2) +
             ",\"skin_temp\":" + String(localCollarTemp, 1) +
             ",\"yield\":0.0" +
             ",\"viscosity_torque\":" + String(q.v, 1) + "}";
    };

    String postData = "{";
    postData += "\"device_id\":\"HUB-001\",";
    postData += "\"device_key\":\"hackcypher_nandi_2026\",";
    postData += "\"rfid_tag\":\"900000000000118\",";
    postData += "\"farm_id\":\"FARM0001\",";
    postData += "\"skin_temp\":" + String(localCollarTemp, 1) + ",";
    postData += "\"rumination\":" + String(localCollarRum, 1) + ",";
    postData += "\"thi\":" + String(thi, 1) + ",";
    postData += "\"quarters\":{";
    postData += "\"LF\":" + buildQ(localLF) + ",";
    postData += "\"RF\":" + buildQ(localRF) + ",";
    postData += "\"LR\":" + buildQ(localLR) + ",";
    postData += "\"RR\":" + buildQ(localRR);
    postData += "}}";

    Serial.println("📤 Transmitting to AI Server:");
    Serial.println(postData);

    http.beginRequest();
    int err = http.post(resource);
    if (err == 0)
    {
      http.sendHeader("Content-Type", "application/json");
      http.sendHeader("x-device-key", "hackcypher_nandi_2026");
      http.sendHeader("Bypass-Tunnel-Reminder", "true"); // Instantly bypasses the loca.lt warning page
      http.sendHeader("Content-Length", postData.length());
      http.sendHeader("Connection", "close");
      http.beginBody();
      http.print(postData);
      http.endRequest();

      int statusCode = http.responseStatusCode();
      Serial.printf("📡 HTTP Response Code: %d\n", statusCode);

      if (statusCode > 0)
      {
        String response = http.responseBody();
        Serial.println("📩 Server Reply: " + response);
      }
    }
    http.stop();
  }
}
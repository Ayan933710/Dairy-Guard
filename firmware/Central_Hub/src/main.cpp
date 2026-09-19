#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

// --- TinyGSM Configuration ---
#define TINY_GSM_MODEM_SIM7600
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

// --- SIMCom A7670C UART Pins ---
#define MODEM_RX 17
#define MODEM_TX 16
HardwareSerial modemSerial(1);

// --- Custom LoRa SPI & Control Pins ---
#define LORA_SCK 12
#define LORA_MISO 13
#define LORA_MOSI 11
#define LORA_NSS 10
#define LORA_RST 47
#define LORA_DIO0 14

// --- Custom BME280 I2C Pins ---
#define I2C_SDA 8
#define I2C_SCL 9
Adafruit_BME280 bme;

// --- Cloud Endpoint ---
const char server[] = "bore.pub";
const int port = 61695;
const char resource[] = "/api/sensors/ingest";
const char apn[] = "jionet";

TinyGsm modem(modemSerial);
TinyGsmClient client(modem);
HttpClient http(client, server, port);

// --- Timers ---
unsigned long previousMillis = 0;
const long uploadInterval = 30000; // 30 seconds sync window

unsigned long previousBmeMillis = 0;
const long bmeInterval = 5000;

// ==========================================
// 1. DATA STORAGE & WINDOW TRACKING
// ==========================================
struct CollarTelemetry
{
  float cow_body_temp = 0.0;
  float rumination_delta = 0.0;
};

struct SmartCupTelemetry
{
  float ec = 0.0, ph = 0.0, viscosity = 0.0;
  int r = 0, g = 0, b = 0;
  String rfid = "";
  String quarter = "";
};

CollarTelemetry collarData;
SmartCupTelemetry quarters[4];

bool collarReady = false;
bool cupReady[4] = {false, false, false, false};

// Mutex for safe multi-core access
portMUX_TYPE telemetryMutex = portMUX_INITIALIZER_UNLOCKED;

void resetDataWindow()
{
  portENTER_CRITICAL(&telemetryMutex);
  collarReady = false;
  for (int i = 0; i < 4; i++)
    cupReady[i] = false;
  portEXIT_CRITICAL(&telemetryMutex);
}

String classifyMilkColor(int r, int g, int b)
{
  if (r > 150 && g < 100 && b < 100)
    return "Bloody";
  else if (r > 150 && g > 150 && b < 100)
    return "Clotted";
  else if (r < 100 && g < 100 && b > 120)
    return "Watery";
  else
    return "Normal";
}

// ==========================================
// 2. BACKGROUND LORA TASK (RUNS ON CORE 0)
// ==========================================
void loraListenerTask(void *pvParameters)
{
  for (;;)
  {
    int packetSize = LoRa.parsePacket();
    if (packetSize)
    {
      String incoming = "";
      while (LoRa.available())
        incoming += (char)LoRa.read();

      // Software Shield Filter
      if (incoming.startsWith("{\"type\""))
      {
        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, incoming);

        if (!error)
        {
          String type = doc["type"];

          // Temporary local variables to hold values for printing outside critical lock
          bool printCollar = false;
          float pTemp = 0, pRum = 0;
          bool printCup = false;
          String pQ = "", pRfid = "";
          float pPh = 0, pEc = 0, pVisc = 0;
          int pR = 0, pG = 0, pB = 0;

          portENTER_CRITICAL(&telemetryMutex);
          if (type == "collar")
          {
            collarData.cow_body_temp = doc["temp"];
            collarData.rumination_delta = doc["rumination"];
            collarReady = true;

            printCollar = true;
            pTemp = collarData.cow_body_temp;
            pRum = collarData.rumination_delta;
          }
          else if (type == "cup")
          {
            String q = doc["quarter"];
            int idx = (q == "LF") ? 0 : (q == "RF") ? 1
                                    : (q == "LR")   ? 2
                                                    : 3;
            quarters[idx].ec = doc["ec"];
            quarters[idx].ph = doc["ph"];
            quarters[idx].r = doc["r"];
            quarters[idx].g = doc["g"];
            quarters[idx].b = doc["b"];
            quarters[idx].viscosity = doc["viscosity"];
            quarters[idx].rfid = doc["rfid"].as<String>();
            quarters[idx].quarter = q;
            cupReady[idx] = true;

            printCup = true;
            pQ = q;
            pRfid = quarters[idx].rfid;
            pPh = quarters[idx].ph;
            pEc = quarters[idx].ec;
            pVisc = quarters[idx].viscosity;
            pR = quarters[idx].r;
            pG = quarters[idx].g;
            pB = quarters[idx].b;
          }
          portEXIT_CRITICAL(&telemetryMutex);

          // 👉 SAFE PRINTING OUTSIDE THE CRITICAL SECTION
          if (printCollar)
          {
            Serial.println("\n-----------------------------------------");
            Serial.println("🛸 [LoRa Core 0] Received Smart Collar Data:");
            Serial.printf("   -> Body Temp: %.1f °C\n", pTemp);
            Serial.printf("   -> Rumination Delta: %.1f\n", pRum);
            Serial.println("-----------------------------------------");
          }

          if (printCup)
          {
            String milkStatus = classifyMilkColor(pR, pG, pB);
            Serial.println("\n-----------------------------------------");
            Serial.printf("🛸 [LoRa Core 0] Received Smart Cup Data [%s]:\n", pQ.c_str());
            Serial.printf("   -> RFID: %s\n", pRfid.c_str());
            Serial.printf("   -> pH: %.2f | EC: %.2f mS/cm\n", pPh, pEc);
            Serial.printf("   -> Viscosity: %.1f mA\n", pVisc);
            Serial.printf("   -> Color Classification: %s (R:%d, G:%d, B:%d)\n",
                          milkStatus.c_str(), pR, pG, pB);
            Serial.println("-----------------------------------------");
          }
        }
      }
    }
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(115200);
  delay(3000);

  Serial.println("\n======================================");
  Serial.println("BovineGuard: Asynchronous Dual-Core Hub");
  Serial.println("======================================");

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  LoRa.setSPI(SPI);
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6))
  {
    Serial.println("❌ LoRa init failed.");
  }
  else
  {
    Serial.println("✅ LoRa Initialized.");
    LoRa.setSyncWord(0xF3); // Private Network Channel
  }

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!bme.begin(0x76, &Wire))
    Serial.println("❌ BME280 not found.");
  else
    Serial.println("✅ BME280 Initialized.");

  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modem.restart();

  if (!modem.waitForNetwork(60000L))
    return;
  if (!modem.gprsConnect(apn, "", ""))
    return;
  Serial.println("✅ Cellular Connected!");

  // Launch background LoRa listener on Core 0
  xTaskCreatePinnedToCore(
      loraListenerTask,
      "LoRaTask",
      4096,
      NULL,
      1,
      NULL,
      0);
  Serial.println("✅ Background LoRa Listener pinned to Core 0");
}

void loop()
{
  unsigned long currentMillis = millis();

  // ==========================================
  // 3. PRINT BME280 DATA EVERY 5 SECONDS
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

    Serial.printf("🌡️ Hub Environment -> Temp: %.1f°C | Hum: %.1f%% | THI: %.1f\n", t, h, current_thi);
  }

  // ==========================================
  // 4. TRANSMIT SWEPT DATA ON 30s MARK (CORE 1)
  // ==========================================
  if (currentMillis - previousMillis >= uploadInterval)
  {
    previousMillis = currentMillis;

    if (modem.isGprsConnected())
    {
      Serial.println("\n[☁️ SYNC] Constructing payload during cellular upload...");

      float tempC = bme.readTemperature();
      float humidity = bme.readHumidity();
      if (isnan(tempC))
      {
        tempC = 31.0;
        humidity = 72.0;
      }
      float thi = (0.8 * tempC) + ((humidity / 100.0) * (tempC - 14.4)) + 46.4;

      portENTER_CRITICAL(&telemetryMutex);
      bool localCollarReady = collarReady;
      CollarTelemetry localCollar = collarData;
      bool localCupReady[4];
      SmartCupTelemetry localQuarters[4];
      for (int i = 0; i < 4; i++)
      {
        localCupReady[i] = cupReady[i];
        localQuarters[i] = quarters[i];
      }
      resetDataWindow();
      portEXIT_CRITICAL(&telemetryMutex);

      String collarJson = localCollarReady
                              ? "{\"cow_body_temp\":" + String(localCollar.cow_body_temp, 1) + ",\"rumination_delta\":" + String(localCollar.rumination_delta, 1) + "}"
                              : "{\"cow_body_temp\":null,\"rumination_delta\":null}";

      auto buildQuarter = [](SmartCupTelemetry &q, bool isReady) -> String
      {
        if (!isReady)
        {
          return "{\"ec\":null,\"ph\":null,\"color\":null,\"viscosity\":null,\"yield_val\":null,\"scc\":null,\"raw_motor_ma\":null}";
        }
        return "{\"ec\":" + String(q.ec, 2) +
               ",\"ph\":" + String(q.ph, 2) +
               ",\"color\":\"" + classifyMilkColor(q.r, q.g, q.b) +
               "\",\"viscosity\":" + String(q.viscosity, 1) +
               ",\"yield_val\":null,\"scc\":null,\"raw_motor_ma\":null}";
      };

      String postData = "{";
      postData += "\"cow_id\":\"C-118\",";
      postData += "\"collar_metrics\":" + collarJson + ",";
      postData += "\"hub_metrics\":{\"ambient_temp\":" + String(tempC, 1) + ",\"ambient_humidity\":" + String(humidity, 1) + ",\"shed_thi\":" + String(thi, 1) + "},";
      postData += "\"quarter_readings\":{";
      postData += "\"LF\":" + buildQuarter(localQuarters[0], localCupReady[0]) + ",";
      postData += "\"RF\":" + buildQuarter(localQuarters[1], localCupReady[1]) + ",";
      postData += "\"LR\":" + buildQuarter(localQuarters[2], localCupReady[2]) + ",";
      postData += "\"RR\":" + buildQuarter(localQuarters[3], localCupReady[3]);
      postData += "}}";

      Serial.println("📤 Transmitting to AI Server:");
      Serial.println(postData);

      http.beginRequest();
      int err = http.post(resource);
      if (err == 0)
      {
        http.sendHeader("Content-Type", "application/json");
        http.sendHeader("Content-Length", postData.length());
        http.sendHeader("Connection", "close");
        http.beginBody();
        http.print(postData);
        http.endRequest();

        int statusCode = http.responseStatusCode();
        Serial.printf("📡 HTTP Response Code: %d\n", statusCode);
      }
      http.stop();
    }
  }
}
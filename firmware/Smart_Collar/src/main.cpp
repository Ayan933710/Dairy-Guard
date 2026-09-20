#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <SPI.h>
#include <LoRa.h>
#include <math.h>
#include <ArduinoJson.h>

#define ONE_WIRE_BUS 15

#define I2C_SDA 21
#define I2C_SCL 22
const int MPU_ADDR = 0x68;

#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS 5
#define LORA_RST 14
#define LORA_DIO0 26

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature dallasSensors(&oneWire);

unsigned long lastAccelRead = 0;
const unsigned long accelInterval = 100;

unsigned long lastTerminalPrint = 0;
const unsigned long printInterval = 1000;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 30000;

const int MAX_SAMPLES = 100;
float magnitudeSamples[MAX_SAMPLES];
int sampleIndex = 0;
bool bufferFull = false;

float currentAx = 0.0, currentAy = 0.0, currentAz = 0.0, currentMag = 0.0;

float calculateCalibratedRumination()
{
  int totalCount = bufferFull ? MAX_SAMPLES : sampleIndex;
  if (totalCount < 10)
    return 0.0;

  float sum = 0.0;
  for (int i = 0; i < totalCount; i++)
    sum += magnitudeSamples[i];
  float mean = sum / totalCount;

  float varianceSum = 0.0;
  for (int i = 0; i < totalCount; i++)
    varianceSum += pow(magnitudeSamples[i] - mean, 2);
  float stdDev = sqrt(varianceSum / totalCount);

  if (stdDev < 0.035 || stdDev > 0.320)
    return 0.0;
  return stdDev * 100.0;
}

void setup()
{
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nStarting collar boot...");

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission();
  Serial.println("MPU6050 initialized.");

  dallasSensors.begin();
  Serial.print("DS18B20 sensors found: ");
  Serial.println(dallasSensors.getDeviceCount());

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setSPI(SPI);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6))
  {
    Serial.println("[FAIL] LoRa initialization failed. Check wiring and pins.");
    Serial.println("CS=5, RST=14, DIO0=26, SCK=18, MISO=19, MOSI=23");
  }
  else
  {
    LoRa.setSyncWord(0xF3);
    LoRa.setTxPower(14);
    Serial.println("LoRa initialized successfully.");
  }

  Serial.println("Collar System Ready.");
}

void loop()
{
  unsigned long now = millis();

  if (now - lastAccelRead >= accelInterval)
  {
    lastAccelRead = now;
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom((uint16_t)MPU_ADDR, (uint8_t)6, true);

    int16_t AcX = Wire.read() << 8 | Wire.read();
    int16_t AcY = Wire.read() << 8 | Wire.read();
    int16_t AcZ = Wire.read() << 8 | Wire.read();

    currentAx = AcX / 16384.0;
    currentAy = AcY / 16384.0;
    currentAz = AcZ / 16384.0;
    currentMag = sqrt(currentAx * currentAx + currentAy * currentAy + currentAz * currentAz);

    magnitudeSamples[sampleIndex] = currentMag;
    sampleIndex++;
    if (sampleIndex >= MAX_SAMPLES)
    {
      sampleIndex = 0;
      bufferFull = true;
    }
  }

  if (now - lastSendTime >= sendInterval)
  {
    lastSendTime = now;

    dallasSensors.requestTemperatures();
    float tempC = dallasSensors.getTempCByIndex(0);
    float rumination = calculateCalibratedRumination();

    sampleIndex = 0;
    bufferFull = false;

    StaticJsonDocument<200> doc;
    doc["type"] = "SmartCollar";
    doc["id"] = "C-118";
    doc["tmp"] = tempC;
    doc["rum"] = rumination;

    String payload;
    serializeJson(doc, payload);

    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();

    Serial.print("\n>>> Sent: { \"type\": \"SmartCollar\", \"id\": \"C-118\", \"tmp\": ");
    Serial.print(tempC, 1);
    Serial.print(", \"rum\": ");
    Serial.print(rumination, 1);
    Serial.println(" }");
  }
}
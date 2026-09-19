#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_TCS34725.h>
#include <Adafruit_INA219.h>
#include <Adafruit_ADS1X15.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LoRa.h>
#include <ArduinoJson.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Adafruit_INA219 ina219;
Adafruit_ADS1115 ads1115;

const int SDA_PIN = 18;
const int SCL_PIN = 19;
const int MOTOR_PIN = 25;
const int IR_PIN = 32;

const int CONTROLLED_PWM = 180;

#define RFID_SS_PIN 5
#define RFID_RST_PIN 4
MFRC522 mfrc522(RFID_SS_PIN, RFID_RST_PIN);

#define SPI_SCK 14
#define SPI_MISO 27
#define SPI_MOSI 13

#define LORA_SS 15
#define LORA_RST 33
#define LORA_DIO0 34

void setup()
{
  Serial.begin(115200);
  while (!Serial)
    ;

  Wire.begin(SDA_PIN, SCL_PIN);
  pinMode(MOTOR_PIN, OUTPUT);
  analogWrite(MOTOR_PIN, 0);
  pinMode(IR_PIN, INPUT);

  pinMode(RFID_SS_PIN, OUTPUT);
  digitalWrite(RFID_SS_PIN, HIGH);
  pinMode(LORA_SS, OUTPUT);
  digitalWrite(LORA_SS, HIGH);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setRotation(1);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("BovineGuard v3.0"));
  display.display();

  tcs.begin();
  ina219.begin();
  ads1115.setGain(GAIN_TWOTHIRDS);
  ads1115.begin();

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  mfrc522.PCD_Init();

  LoRa.setSPI(SPI);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6))
  {
    Serial.println(F("❌ LoRa failed!"));
  }
  else
  {
    Serial.println(F("✅ LoRa Ready."));
    LoRa.setSyncWord(0xF3);
  }
}

void loop()
{
  float ecSum = 0, phVoltsSum = 0;
  for (int i = 0; i < 5; i++)
  {
    int16_t adc0 = ads1115.readADC_SingleEnded(0);
    int16_t adc1 = ads1115.readADC_SingleEnded(1);
    float vTds = ads1115.computeVolts(adc0);
    float vPh = ads1115.computeVolts(adc1);
    float sampleEc = (vTds / 2.38) * 8.0;
    if (sampleEc < 0)
      sampleEc = 0;
    if (sampleEc > 8.0)
      sampleEc = 8.0;
    ecSum += sampleEc;
    phVoltsSum += vPh;
    delay(10);
  }

  float ec_mS_per_cm = ecSum / 5;
  float phValue = 7.0 + ((2.5 - (phVoltsSum / 5)) / 0.18);

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(F("--- SMART CUP ---"));
  display.println(F("Tap RFID to Start"));
  display.print(F("pH:   "));
  display.println(phValue, 2);
  display.print(F("EC:   "));
  display.print(ec_mS_per_cm, 2);
  display.println(F(" mS"));
  display.display();

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial())
  {
    String currentRFID = "";
    for (byte i = 0; i < mfrc522.uid.size; i++)
    {
      currentRFID += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
      currentRFID += String(mfrc522.uid.uidByte[i], HEX);
    }
    currentRFID.toUpperCase();

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    digitalWrite(RFID_SS_PIN, HIGH);

    Serial.println("\n[EVENT] RFID: " + currentRFID);

    String quarters[4] = {"LF", "RF", "LR", "RR"};

    for (int qIdx = 0; qIdx < 4; qIdx++)
    {
      String currentQuarter = quarters[qIdx];
      delay(5000);

      float phSumEvent = 0;
      for (int p = 0; p < 15; p++)
      {
        phSumEvent += ads1115.computeVolts(ads1115.readADC_SingleEnded(1));
        delay(5);
      }
      float stablePhValue = 7.0 + ((2.5 - (phSumEvent / 15)) / 0.18);

      uint16_t sampleR, sampleG, sampleB, sampleC;
      tcs.getRawData(&sampleR, &sampleG, &sampleB, &sampleC);

      analogWrite(MOTOR_PIN, CONTROLLED_PWM);
      delay(2000);

      float rawReadings[40];
      for (int j = 0; j < 40; j++)
      {
        float measuredCurrent = abs(ina219.getCurrent_mA());
        float busVoltage = ina219.getBusVoltage_V();
        rawReadings[j] = (busVoltage > 3.0) ? (measuredCurrent * (5.0 / busVoltage)) : measuredCurrent;
        delay(25);
      }

      for (int i = 0; i < 39; i++)
      {
        for (int k = i + 1; k < 40; k++)
        {
          if (rawReadings[i] > rawReadings[k])
          {
            float temp = rawReadings[i];
            rawReadings[i] = rawReadings[k];
            rawReadings[k] = temp;
          }
        }
      }

      float correctedCurrentSum = 0;
      for (int j = 4; j < 36; j++)
        correctedCurrentSum += rawReadings[j];
      float finalVisc_mA = correctedCurrentSum / 32;
      analogWrite(MOTOR_PIN, 0);

      StaticJsonDocument<256> doc;
      doc["type"] = "cup";
      doc["rfid"] = currentRFID;
      doc["quarter"] = currentQuarter;
      doc["ec"] = serialized(String(ec_mS_per_cm, 2));
      doc["ph"] = serialized(String(stablePhValue, 2));
      doc["r"] = sampleR;
      doc["g"] = sampleG;
      doc["b"] = sampleB;
      doc["viscosity"] = serialized(String(finalVisc_mA, 1));

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      Serial.println("\n>>> Sent: " + jsonPayload);

      LoRa.beginPacket();
      LoRa.print(jsonPayload);
      LoRa.endPacket();

      delay(500);
    }
  }
}
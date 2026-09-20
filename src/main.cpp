
#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Preferences.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_TCS34725.h>
#include <Adafruit_INA219.h>
#include <Adafruit_ADS1X15.h>
#include <MFRC522.h>
#include <LoRa.h>

#define USE_IR_GATING         // comment out to fall back to fixed delays
#define IR_LIQUID_LEVEL LOW   // pin level when liquid is present - verify with 'irtest'

// ---------------- hardware ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Adafruit_INA219 ina219;
Adafruit_ADS1115 ads1115;

const int SDA_PIN = 18;
const int SCL_PIN = 19;
const int MOTOR_PIN = 25;
const int IR_PIN = 32;
const int EC_PWR_PIN = 26;    // NEW: powers the TDS board only while EC is being read

#define RFID_SS_PIN 5
#define RFID_RST_PIN 4
MFRC522 mfrc522(RFID_SS_PIN, RFID_RST_PIN);

#define SPI_SCK 14
#define SPI_MISO 27
#define SPI_MOSI 13
#define LORA_SS 15
#define LORA_RST 33
#define LORA_DIO0 34

// ---------------- settings ----------------
const uint8_t EC_CH = 0;              // ADS1115 channel for the TDS board
const uint8_t PH_CH = 1;              // ADS1115 channel for the PH-4502C
const int CONTROLLED_PWM = 180;
const float EC_TEMP_COEF = 0.02f;     // ~2 % per degC
const uint32_t EC_SETTLE_MS = 500;
const uint32_t PH_TIMEOUT_MS = 20000; // never wait longer than this for a stable pH
const float PH_STABLE_V = 0.003f;     // window spread (V) that counts as "stable"
const float PH_V_MIN = 0.8f;          // outside this range the reading cannot be a working pH probe
const float PH_V_MAX = 4.3f;
const uint16_t TCS_SAT = 20000;       // clear channel saturates ~21500 at 50 ms
const uint8_t INA_ADDR = 0x40;

// What to send for a reading that could not be measured. "null" is valid JSON; use "-1" if the
// receiver's parser cannot handle null.
#define MISSING "null"

// ---- LoRa radio settings: the RECEIVER must use exactly the same values ----
const long LORA_FREQ = 433000000L;   // Hz (Ra-02 SX1278 = 433 MHz band)
const int LORA_SF = 7;               // spreading factor
const long LORA_BW = 125000L;        // bandwidth, Hz
const int LORA_CR = 5;               // coding rate 4/5
const int LORA_PREAMBLE = 8;
const int LORA_TX_DBM = 17;          // PA_BOOST output power
const uint8_t LORA_SYNC = 0xF3;      // sync word (the library default is 0x12!)
// CRC is enabled, explicit header mode.
bool loraOk = false;

// RFID tag UID (upper-case hex, as printed on Serial) -> cow id sent in the packet.
// EDIT THESE: replace with your real tag/cow pairs. An unknown tag sends its raw UID as the id.
struct CowMap { const char *uid; const char *id; };
const CowMap COWS[] = {
  {"E9290007", "C-118"},
  {"A2771E07", "C-119"},
};

enum : uint8_t {
  F_PH_UNSTABLE = 1, F_EC_UNCAL = 2, F_COLOR_SAT = 4,
  F_NO_TEMP = 8, F_NO_SAMPLE = 16, F_SENSOR_FAULT = 32, F_PH_INVALID = 64
};
enum : uint8_t { PH_OK = 0, PH_UNSTABLE = 1, PH_NO_PROBE = 2 };

// ---------------- state ----------------
Preferences prefs;
bool adsOk = false, tcsOk = false, inaOk = false, tempOk = false;

float phSlope = -1.0f / 0.18f;            // pH per volt (default = old formula)
float phIntercept = 7.0f + 2.5f / 0.18f;
float phTcalK = 298.15f;                  // temperature the pH calibration was done at
float ecV[8], ecC[8];                     // EC table: volts -> mS/cm at calibration temperature
uint8_t ecN = 0;
float viscBase = 0;
float whiteR = 0, whiteG = 0, whiteB = 0;   // raw counts of a white reference (0 = not calibrated)

float calPhV[2], calPhVal[2];
uint8_t calN = 0;
uint32_t lastIdle = 0;

// ---------------- small helpers ----------------
void showMsg3(String a, String b, String c) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(a);
  if (b.length()) display.println(b);
  if (c.length()) display.println(c);
  display.display();
}
void showMsg(String a) { showMsg3(a, "", ""); }
void showMsg2(String a, String b) { showMsg3(a, b, ""); }

inline void ecOn()  { digitalWrite(EC_PWR_PIN, HIGH); }
inline void ecOff() { digitalWrite(EC_PWR_PIN, LOW); }

// Average of n ADS1115 reads (n >= 3). First read after a mux switch is discarded,
// then the min and max are dropped.
float readVolts(uint8_t ch, uint8_t n) {
  ads1115.readADC_SingleEnded(ch);
  float sum = 0, mn = 1e9f, mx = -1e9f;
  for (uint8_t i = 0; i < n; i++) {
    float v = ads1115.computeVolts(ads1115.readADC_SingleEnded(ch));
    sum += v;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return (sum - mn - mx) / (n - 2);
}

// No temperature sensor is fitted, so 25 C is assumed (no compensation) and every
// quarter carries flag 8. When a sensor is added (e.g. a DS18B20), read it here and
// set tempOk = true on a valid reading.
float readTempC() {
  tempOk = false;
  return 25.0f;
}

// ---------------- calibration storage ----------------
void loadCal() {
  prefs.begin("bg", true);
  phSlope = prefs.getFloat("phSlope", phSlope);
  phIntercept = prefs.getFloat("phInt", phIntercept);
  phTcalK = prefs.getFloat("phTk", phTcalK);
  ecN = prefs.getUChar("ecN", 0);
  if (ecN > 8) ecN = 0;
  if (ecN) {
    size_t a = prefs.getBytes("ecV", ecV, sizeof(ecV));
    size_t b = prefs.getBytes("ecC", ecC, sizeof(ecC));
    if (a != sizeof(ecV) || b != sizeof(ecC)) ecN = 0;
  }
  viscBase = prefs.getFloat("vBase", 0);
  whiteR = prefs.getFloat("wR", 0);
  whiteG = prefs.getFloat("wG", 0);
  whiteB = prefs.getFloat("wB", 0);
  prefs.end();
}

void saveEc() {
  prefs.begin("bg", false);
  prefs.putUChar("ecN", ecN);
  prefs.putBytes("ecV", ecV, sizeof(ecV));
  prefs.putBytes("ecC", ecC, sizeof(ecC));
  prefs.end();
}

// ---------------- pH ----------------
float phFromVolts(float v, float tC) {
  float v7 = (7.0f - phIntercept) / phSlope;                 // volts at pH 7
  float slopeT = phSlope * (phTcalK / (tC + 273.15f));       // electrode slope scales with absolute temperature
  return 7.0f + slopeT * (v - v7);
}

// Waits until the last 6 window-averages agree within PH_STABLE_V (about 2.5 s once the probe has
// settled). Gives up after timeoutMs.
//   PH_OK       stable; vOut = mean of the last window
//   PH_UNSTABLE still drifting at the timeout; vOut = mean of the last window
//   PH_NO_PROBE voltage is outside PH_V_MIN..PH_V_MAX for ~2 s (probe not in liquid / wiring)
uint8_t readPhStable(float &vOut, uint32_t timeoutMs) {
  const uint8_t W = 6;
  float win[W];
  uint8_t cnt = 0, bad = 0;
  vOut = 0;
  uint32_t t0 = millis();
  while (millis() - t0 < timeoutMs) {
    float v = readVolts(PH_CH, 10);
    vOut = v;
    win[cnt % W] = v;
    cnt++;
    bad = (v < PH_V_MIN || v > PH_V_MAX) ? (uint8_t)(bad + 1) : 0;
    if (bad >= 5) return PH_NO_PROBE;
    if (cnt >= W) {
      float mn = win[0], mx = win[0], sum = 0;
      for (uint8_t i = 0; i < W; i++) {
        if (win[i] < mn) mn = win[i];
        if (win[i] > mx) mx = win[i];
        sum += win[i];
      }
      vOut = sum / W;
      if (mx - mn < PH_STABLE_V) return PH_OK;
    }
    delay(300);
  }
  return PH_UNSTABLE;
}

// ---------------- EC ----------------
float ecFromVolts(float v, bool &inRange) {
  if (ecN < 2) {                                   // uncalibrated fallback = old formula
    inRange = false;
    float e = (v / 2.38f) * 8.0f;
    return constrain(e, 0.0f, 8.0f);
  }
  inRange = (v >= ecV[0] - 0.02f && v <= ecV[ecN - 1] + 0.02f);
  int i = 1;
  while (i < ecN - 1 && v > ecV[i]) i++;           // pick the segment (extrapolates at the ends)
  float v0 = ecV[i - 1], v1 = ecV[i], c0 = ecC[i - 1], c1 = ecC[i];
  if (v1 == v0) return c0;
  float e = c0 + (v - v0) * (c1 - c0) / (v1 - v0);
  return e < 0 ? 0 : e;
}

// Returns EC normalised to 25 C. EC is off except during this call.
float measureEc(float tC, float &vOut, bool &inRange) {
  ecOn();
  delay(EC_SETTLE_MS);
  vOut = readVolts(EC_CH, 20);
  ecOff();
  float ecT = ecFromVolts(vOut, inRange);
  if (vOut > 2.25f) inRange = false;               // TDS board output ceiling is ~2.3 V
  return ecT / (1.0f + EC_TEMP_COEF * (tC - 25.0f));
}

// ---------------- colour ----------------
void readColor(uint16_t &r, uint16_t &g, uint16_t &b, uint16_t &c) {
  uint16_t rr, gg, bb, cc;
  tcs.getRawData(&rr, &gg, &bb, &cc);              // discard first reading
  delay(60);
  uint32_t sr = 0, sg = 0, sb = 0, sc = 0;
  for (int i = 0; i < 3; i++) {
    tcs.getRawData(&rr, &gg, &bb, &cc);
    sr += rr; sg += gg; sb += bb; sc += cc;
    delay(60);
  }
  r = sr / 3; g = sg / 3; b = sb / 3; c = sc / 3;
}

// Raw counts -> 0-255. With a white reference stored, that reference reads 255,255,255.
// Without one, the brightest channel is scaled to 255 (hue only) - run whitecal for real colours.
uint8_t clamp255(float x) {
  if (x < 0) return 0;
  if (x > 255) return 255;
  return (uint8_t)(x + 0.5f);
}

void toRgb8(uint16_t r, uint16_t g, uint16_t b, uint8_t out[3]) {
  float sr, sg, sb;
  if (whiteR > 0 && whiteG > 0 && whiteB > 0) {
    sr = 255.0f / whiteR; sg = 255.0f / whiteG; sb = 255.0f / whiteB;
  } else {
    float m = fmaxf((float)r, fmaxf((float)g, (float)b));
    if (m < 1) m = 1;
    sr = sg = sb = 255.0f / m;
  }
  out[0] = clamp255(r * sr);
  out[1] = clamp255(g * sg);
  out[2] = clamp255(b * sb);
}

// ---------------- viscosity (motor current) ----------------
void inaUseAveraging() {
  ina219.setCalibration_16V_400mA();               // finer range; use setCalibration_32V_1A if current exceeds ~400 mA
  // config: 16 V bus, +/-40 mV shunt, bus 12-bit, shunt 12-bit x128 averaging (~68 ms), continuous
  const uint16_t cfg = 0x01FF;
  Wire.beginTransmission(INA_ADDR);
  Wire.write(0x00);
  Wire.write((uint8_t)(cfg >> 8));
  Wire.write((uint8_t)(cfg & 0xFF));
  Wire.endTransmission();
}

float measureMotorCurrent() {
  analogWrite(MOTOR_PIN, CONTROLLED_PWM);
  delay(2000);                                     // let the motor reach steady speed
  float r[24];
  for (int j = 0; j < 24; j++) {
    float i_mA = fabsf(ina219.getCurrent_mA());
    float vBus = ina219.getBusVoltage_V();
    r[j] = (vBus > 3.0f) ? i_mA * (5.0f / vBus) : i_mA;   // same supply-sag normalisation as v3.0
    delay(80);                                     // INA219 averages ~68 ms per update
  }
  analogWrite(MOTOR_PIN, 0);
  for (int i = 1; i < 24; i++) {                   // insertion sort
    float key = r[i];
    int k = i - 1;
    while (k >= 0 && r[k] > key) { r[k + 1] = r[k]; k--; }
    r[k + 1] = key;
  }
  float sum = 0;
  for (int j = 4; j < 20; j++) sum += r[j];        // trimmed mean (drop 4 low, 4 high)
  return sum / 16.0f;
}

// ---------------- IR / liquid presence ----------------
bool liquidPresent() { return digitalRead(IR_PIN) == IR_LIQUID_LEVEL; }

bool waitForLiquid(bool wantPresent, uint32_t timeoutMs) {
  uint32_t t0 = millis();
  while (millis() - t0 < timeoutMs) {
    if (liquidPresent() == wantPresent) {
      delay(300);
      if (liquidPresent() == wantPresent) return true;
    }
    delay(50);
  }
  return false;
}

// ---------------- LoRa: ONE packet for all four quarters ----------------
struct QResult {
  bool valid;               // false = no sample was detected for this quarter
  bool phOk;                // false = pH could not be measured (no probe / impossible value)
  float ec, ph, visc, tC;
  uint16_t r, g, b, c;      // raw colour counts (Serial only)
  uint8_t rgb[3];           // 0-255 colour that is sent
  uint8_t flags;
};
QResult results[4];
const char *QNAMES[4] = {"LF", "RF", "LR", "RR"};
const size_t PKT_MAX = 255;  // the LoRa library carries at most 255 bytes per packet

// appends formatted text at buf+n; on overflow n becomes -1
#define APPEND(...) do { if (n < 0) break; int w_ = snprintf(buf + n, cap - n, __VA_ARGS__); \
  if (w_ < 0 || (size_t)(n + w_) >= cap) { n = -1; break; } n += w_; } while (0)

// Builds exactly:
//   {"type":"DigiCup","id":"C-118","LF":{"ec":4.1,"ph":6.50,"rgb":[245,245,220],"v":21.0},"RF":{...},"LR":{...},"RR":{...}}
// for quarters [from, to). Returns the length, or -1 if it does not fit in PKT_MAX.
int buildPayload(char *buf, size_t cap, const char *cowId, int from, int to) {
  int n = 0;
  APPEND("{\"type\":\"DigiCup\",\"id\":\"%s\"", cowId);
  for (int i = from; i < to; i++) {
    const QResult &q = results[i];
    APPEND(",\"%s\":{", QNAMES[i]);
    if (q.valid) APPEND("\"ec\":%.1f,", q.ec); else APPEND("\"ec\":%s,", MISSING);
    if (q.valid && q.phOk) APPEND("\"ph\":%.2f,", q.ph); else APPEND("\"ph\":%s,", MISSING);
    if (q.valid) APPEND("\"rgb\":[%u,%u,%u],\"v\":%.1f}", (unsigned)q.rgb[0], (unsigned)q.rgb[1], (unsigned)q.rgb[2], q.visc);
    else APPEND("\"rgb\":[%s,%s,%s],\"v\":%s}", MISSING, MISSING, MISSING, MISSING);
  }
  APPEND("}");
  if (n < 0 || (size_t)n > PKT_MAX) return -1;
  return n;
}

bool startLoRa() {
  LoRa.setSPI(SPI);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) return false;
  LoRa.setSpreadingFactor(LORA_SF);
  LoRa.setSignalBandwidth(LORA_BW);
  LoRa.setCodingRate4(LORA_CR);
  LoRa.setPreambleLength(LORA_PREAMBLE);
  LoRa.setTxPower(LORA_TX_DBM);
  LoRa.setSyncWord(LORA_SYNC);
  LoRa.enableCrc();
  return true;
}

void printLoRaSettings() {
  Serial.printf("LoRa: %ld Hz, SF%d, BW %ld Hz, CR 4/%d, preamble %d, sync 0x%02X, CRC on, %d dBm\n",
                LORA_FREQ, LORA_SF, LORA_BW, LORA_CR, LORA_PREAMBLE, (unsigned)LORA_SYNC, LORA_TX_DBM);
}

void sendPacket(const char *p) {
  if (!loraOk) {
    Serial.println(F("LoRa was not initialised - retrying..."));
    loraOk = startLoRa();
  }
  if (!loraOk) {
    Serial.println(F("!!! NOT SENT: the LoRa radio does not respond. Check its 3.3 V supply, SPI wiring, NSS/RST pins."));
    return;
  }
  LoRa.beginPacket();
  LoRa.print(p);
  LoRa.endPacket();                                 // blocks until the radio reports the packet is on air
  Serial.printf(">>> Sent %u bytes: %s\n", (unsigned)strlen(p), p);
}

void sendBatch(const char *cowId) {
  char buf[272];
  if (buildPayload(buf, sizeof(buf), cowId, 0, 4) > 0) { sendPacket(buf); return; }

  // Rare (very long id / very large values): two packets, each in the same format with two quarters.
  Serial.println(F("Payload too big for one packet - sending two halves"));
  for (int half = 0; half < 2; half++) {
    if (buildPayload(buf, sizeof(buf), cowId, half * 2, half * 2 + 2) > 0) { sendPacket(buf); delay(300); }
    else Serial.println(F("ERROR: payload still too large"));
  }
}

const char *cowIdFor(const String &uid, char *fallback, size_t cap) {
  for (size_t i = 0; i < sizeof(COWS) / sizeof(COWS[0]); i++)
    if (uid.equalsIgnoreCase(COWS[i].uid)) return COWS[i].id;
  snprintf(fallback, cap, "%s", uid.c_str());       // unknown tag: send the raw UID as the id
  return fallback;
}

// ---------------- calibration commands ----------------
void phCal(float bufferPh) {
  if (bufferPh < 1.0f || bufferPh > 13.0f) { Serial.println(F("Usage: phcal <buffer pH>, e.g. phcal 6.86")); return; }
  showMsg2("pH cal", String(bufferPh, 2));
  float v;
  uint8_t st = readPhStable(v, 90000);
  if (st == PH_NO_PROBE) {
    Serial.printf("Buffer %.2f -> %.4f V: implausible voltage - probe not in liquid, or check the Po/A1 wiring.\n", bufferPh, v);
    return;
  }
  Serial.printf("Buffer %.2f -> %.4f V (%s)\n", bufferPh, v, st == PH_OK ? "stable" : "NOT stable - rinse, wait, retry");
  if (st != PH_OK) return;
  calPhV[calN] = v;
  calPhVal[calN] = bufferPh;
  calN++;
  if (calN < 2) { Serial.println(F("Rinse the probe, put it in the 2nd buffer, run phcal again.")); return; }
  calN = 0;
  if (fabsf(calPhV[1] - calPhV[0]) < 0.05f || fabsf(calPhVal[1] - calPhVal[0]) < 1.0f) {
    Serial.println(F("Points too close together - start over."));
    return;
  }
  float s = (calPhVal[1] - calPhVal[0]) / (calPhV[1] - calPhV[0]);
  float i = calPhVal[0] - s * calPhV[0];
  Serial.printf("slope %.3f pH/V (%.0f mV/pH), intercept %.3f\n", s, 1000.0f / fabsf(s), i);
  if (s > -4.0f || s < -7.5f) {
    Serial.println(F("REJECTED: slope outside the expected 130-250 mV/pH. Check probe, buffers, offset trim."));
    return;
  }
  phSlope = s;
  phIntercept = i;
  phTcalK = readTempC() + 273.15f;
  prefs.begin("bg", false);
  prefs.putFloat("phSlope", phSlope);
  prefs.putFloat("phInt", phIntercept);
  prefs.putFloat("phTk", phTcalK);
  prefs.end();
  Serial.println(F("pH calibration saved."));
}

void phReset() {
  prefs.begin("bg", false);
  prefs.remove("phSlope");
  prefs.remove("phInt");
  prefs.remove("phTk");
  prefs.end();
  phSlope = -1.0f / 0.18f;
  phIntercept = 7.0f + 2.5f / 0.18f;
  phTcalK = 298.15f;
  calN = 0;
  Serial.println(F("pH calibration reset to defaults."));
}

void ecCal(float ec25) {
  if (ec25 <= 0) { Serial.println(F("Usage: eccal <mS/cm at 25C>, e.g. eccal 1.413")); return; }
  float tC = readTempC();
  showMsg2("EC cal", String(ec25, 3));
  ecOn();
  delay(EC_SETTLE_MS);
  float v = readVolts(EC_CH, 30);
  ecOff();
  if (v > 2.25f) Serial.println(F("WARNING: TDS output is at its ~2.3 V ceiling - this solution is beyond the module's range."));
  float actual = ec25 * (1.0f + EC_TEMP_COEF * (tC - 25.0f));   // conductivity at the temperature it was measured
  int pos = -1;
  for (int i = 0; i < ecN; i++) if (fabsf(ecV[i] - v) < 0.005f) pos = i;
  if (pos < 0) {
    if (ecN >= 8) { Serial.println(F("Table full (8 points). Run ecclear.")); return; }
    pos = ecN++;
    while (pos > 0 && ecV[pos - 1] > v) { ecV[pos] = ecV[pos - 1]; ecC[pos] = ecC[pos - 1]; pos--; }
  }
  ecV[pos] = v;
  ecC[pos] = actual;
  saveEc();
  Serial.printf("Added %.4f V -> %.3f mS/cm (%.1f C). Points stored: %d%s\n", v, actual, tC, ecN,
                ecN < 2 ? "  (need at least 2)" : "");
}

void ecClear() {
  ecN = 0;
  saveEc();
  Serial.println(F("EC table cleared."));
}

void viscBaseline() {
  showMsg("Baseline");
  viscBase = measureMotorCurrent();
  prefs.begin("bg", false);
  prefs.putFloat("vBase", viscBase);
  prefs.end();
  Serial.printf("Viscosity baseline stored: %.2f mA\n", viscBase);
}

void whiteCal() {
  showMsg("White cal");
  uint16_t r, g, b, c;
  readColor(r, g, b, c);
  if (c >= TCS_SAT) Serial.println(F("WARNING: colour sensor saturated - reduce light or move the reference away."));
  if (r < 20 || g < 20 || b < 20) { Serial.println(F("Reading too dark - is the white reference in place?")); return; }
  whiteR = r; whiteG = g; whiteB = b;
  prefs.begin("bg", false);
  prefs.putFloat("wR", whiteR);
  prefs.putFloat("wG", whiteG);
  prefs.putFloat("wB", whiteB);
  prefs.end();
  Serial.printf("White reference stored: R %u  G %u  B %u (these now read as 255,255,255)\n", r, g, b);
}

void whiteClear() {
  prefs.begin("bg", false);
  prefs.remove("wR"); prefs.remove("wG"); prefs.remove("wB");
  prefs.end();
  whiteR = whiteG = whiteB = 0;
  Serial.println(F("White reference cleared (colour is scaled by its brightest channel)."));
}

void showLive() {
  float tC = readTempC();
  float vPh = readVolts(PH_CH, 16);
  float vEc;
  bool inR;
  float ec25 = measureEc(tC, vEc, inR);
  Serial.printf("T=%.1f C%s | pH: %.4f V -> %.2f | EC: %.4f V -> %.2f mS/cm @25C%s\n",
                tC, tempOk ? "" : " (no sensor, assumed)", vPh, phFromVolts(vPh, tC), vEc, ec25,
                inR ? "" : "  [uncalibrated/out of range/saturated]");
  Serial.printf("pH cal: slope %.3f pH/V, intercept %.3f | viscosity baseline %.2f mA | EC points: %d\n",
                phSlope, phIntercept, viscBase, ecN);
  if (whiteR > 0) Serial.printf("colour white reference: %.0f/%.0f/%.0f\n", whiteR, whiteG, whiteB);
  else Serial.println(F("colour white reference: not set (run whitecal)"));
  for (int i = 0; i < ecN; i++) Serial.printf("  EC pt %d: %.4f V -> %.3f mS/cm\n", i + 1, ecV[i], ecC[i]);
}

void printHelp() {
  Serial.println(F("Commands: help | show | phcal <pH> | phreset | eccal <mS/cm@25C> | ecclear | viscbase | visc | whitecal | whiteclear | loratest | lorainfo | irtest | motoron | motoroff | econ | ecoff"));
}

void handleSerial() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toLowerCase();
  if (cmd == "help") printHelp();
  else if (cmd == "show") showLive();
  else if (cmd.startsWith("phcal ")) phCal(cmd.substring(6).toFloat());
  else if (cmd == "phreset") phReset();
  else if (cmd.startsWith("eccal ")) ecCal(cmd.substring(6).toFloat());
  else if (cmd == "ecclear") ecClear();
  else if (cmd == "viscbase") viscBaseline();
  else if (cmd == "visc") Serial.printf("Motor current: %.2f mA (baseline %.2f)\n", measureMotorCurrent(), viscBase);
  else if (cmd == "loratest") {
    static uint16_t pingN = 0;
    char m[48];
    snprintf(m, sizeof(m), "{\"type\":\"ping\",\"n\":%u}", (unsigned)++pingN);
    sendPacket(m);
  }
  else if (cmd == "lorainfo") {
    printLoRaSettings();
    Serial.println(loraOk ? F("radio: started OK") : F("radio: NOT started"));
    if (loraOk) LoRa.dumpRegisters(Serial);
  }
  else if (cmd == "whitecal") whiteCal();
  else if (cmd == "whiteclear") whiteClear();
  else if (cmd == "irtest") {
    for (int i = 0; i < 10; i++) {
      Serial.printf("IR pin = %d -> %s\n", digitalRead(IR_PIN), liquidPresent() ? "liquid" : "empty");
      delay(300);
    }
  }
  else if (cmd == "motoron") analogWrite(MOTOR_PIN, CONTROLLED_PWM);
  else if (cmd == "motoroff") analogWrite(MOTOR_PIN, 0);
  else if (cmd == "econ") ecOn();
  else if (cmd == "ecoff") ecOff();
  else if (cmd.length()) Serial.println(F("Unknown command. Type 'help'."));
}

// ---------------- idle screen ----------------
void idleScreen() {
  if (millis() - lastIdle < 500) return;
  lastIdle = millis();
  float t = readTempC();
  float ph = phFromVolts(readVolts(PH_CH, 8), t);   // EC stays OFF while idle
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(F("SMART CUP"));
  display.println(F("Tap RFID"));
  display.println(F("to start"));
  display.print(F("pH "));
  if (ph < 0.0f || ph > 14.0f) display.println(F("--")); else display.println(ph, 2);
  display.print(F("T  ")); display.println(t, 1);
  display.display();
}

// ---------------- full 4-quarter test ----------------
void runTest(const String &uid) {
  char idBuf[24];
  const char *cowId = cowIdFor(uid, idBuf, sizeof(idBuf));
  Serial.printf("\n[EVENT] RFID: %s -> id %s\n", uid.c_str(), cowId);
  int validCount = 0;

  for (int q = 0; q < 4; q++) {
    QResult &res = results[q];
    memset(&res, 0, sizeof(res));
    uint8_t flags = 0;
    if (!(adsOk && tcsOk && inaOk)) flags |= F_SENSOR_FAULT;

    showMsg2(String("Quarter ") + QNAMES[q], "Add milk");
#ifdef USE_IR_GATING
    bool hasSample = waitForLiquid(true, 90000);
#else
    delay(5000);
    bool hasSample = true;
#endif
    if (!hasSample) {
      flags |= F_NO_SAMPLE;
      res.valid = false;
      res.flags = flags;
      Serial.printf("%s: no sample detected\n", QNAMES[q]);
      continue;
    }

    delay(3000);                                    // bubbles settle, cup positioned
    float tC = readTempC();
    if (!tempOk) flags |= F_NO_TEMP;

    showMsg2(QNAMES[q], "pH...");
    float vPh;
    uint8_t phStatus = readPhStable(vPh, PH_TIMEOUT_MS);
    if (phStatus == PH_UNSTABLE) flags |= F_PH_UNSTABLE;
    float ph = phFromVolts(vPh, tC);                // EC board is OFF here
    bool phOk = true;
    if (phStatus == PH_NO_PROBE || ph < 0.0f || ph > 14.0f) {
      flags |= F_PH_INVALID;                        // physically impossible: send MISSING instead
      phOk = false;
    }

    showMsg2(QNAMES[q], "EC...");
    float vEc;
    bool ecInRange;
    float ec25 = measureEc(tC, vEc, ecInRange);
    if (!ecInRange) flags |= F_EC_UNCAL;

    showMsg2(QNAMES[q], "Colour...");
    uint16_t r, g, b, c;
    readColor(r, g, b, c);
    if (c >= TCS_SAT) flags |= F_COLOR_SAT;

    showMsg2(QNAMES[q], "Viscosity...");
    float mA = measureMotorCurrent();

    res.valid = true;
    res.phOk = phOk;
    res.ec = ec25; res.ph = ph; res.visc = mA; res.tC = tC;
    res.r = r; res.g = g; res.b = b; res.c = c;
    toRgb8(r, g, b, res.rgb);
    res.flags = flags;
    validCount++;

    Serial.printf("%s: EC %.2f  pH %.2f (%.3f V)  RGB %u/%u/%u -> %u,%u,%u  C %u  motor %.1f mA  flags %u\n",
                  QNAMES[q], ec25, ph, vPh, (unsigned)r, (unsigned)g, (unsigned)b,
                  (unsigned)res.rgb[0], (unsigned)res.rgb[1], (unsigned)res.rgb[2], (unsigned)c, mA, (unsigned)flags);
    showMsg3(String(QNAMES[q]) + " pH " + (phOk ? String(ph, 2) : String("--")), "EC " + String(ec25, 2), flags ? "check flags" : "OK");
    delay(1500);

#ifdef USE_IR_GATING
    if (q < 3) {                                    // no need to wait after the last quarter
      showMsg2("Empty and", "rinse cup");
      waitForLiquid(false, 60000);
    }
#else
    delay(3000);
#endif
    delay(500);
  }

  if (validCount == 0) {
    showMsg2("No samples", "Nothing sent");
    Serial.println(F("No quarter had a sample - nothing transmitted."));
    return;
  }
  showMsg("Sending...");
  sendBatch(cowId);                                 // all four quarters in one packet
  showMsg2("Data sent", "Tap next cow");
}

// ---------------- setup / loop ----------------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println(F("\nBovineGuard firmware v3.5"));

  Wire.begin(SDA_PIN, SCL_PIN);
  pinMode(MOTOR_PIN, OUTPUT);
  analogWrite(MOTOR_PIN, 0);
  pinMode(IR_PIN, INPUT);
  pinMode(EC_PWR_PIN, OUTPUT);
  ecOff();

  pinMode(RFID_SS_PIN, OUTPUT);
  digitalWrite(RFID_SS_PIN, HIGH);
  pinMode(LORA_SS, OUTPUT);
  digitalWrite(LORA_SS, HIGH);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setRotation(1);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  showMsg2("BovineGuard", "v3.5");

  adsOk = ads1115.begin();
  ads1115.setGain(GAIN_TWOTHIRDS);
  tcsOk = tcs.begin();
  inaOk = ina219.begin();
  if (inaOk) inaUseAveraging();
  Serial.printf("Sensors: ADS1115 %s, TCS34725 %s, INA219 %s\n",
                adsOk ? "ok" : "FAIL", tcsOk ? "ok" : "FAIL", inaOk ? "ok" : "FAIL");

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  mfrc522.PCD_Init();

  loraOk = startLoRa();
  if (loraOk) {
    Serial.println(F("LoRa ready."));
    printLoRaSettings();
  } else {
    Serial.println(F("LoRa FAILED to start - packets will NOT be sent. Check the module's 3.3 V, SPI wires and NSS/RST pins."));
  }

  loadCal();
  printHelp();
}

void loop() {
  handleSerial();
  idleScreen();

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      uid += (mfrc522.uid.uidByte[i] < 0x10) ? "0" : "";
      uid += String(mfrc522.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    digitalWrite(RFID_SS_PIN, HIGH);
    runTest(uid);
  }
  delay(20);
}

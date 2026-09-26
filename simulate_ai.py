#!/usr/bin/env python3
"""
NANDI AI Service Simulation Suite
Tests the live XGBoost ML inference pipeline and ESP32 telemetry ingestion.
Works directly with standard Python 3 (no third-party dependencies required).
"""

import json
import time
import urllib.request
import urllib.error

# Change this if testing locally (e.g., http://localhost:8000)
AI_SERVICE_URL = "http://16.176.145.91:8000"
DEVICE_KEY = "esp32_hardware_key_1234"

SCENARIOS = {
    "1": {
        "title": "Healthy Cow (Normal Baseline)",
        "cow_id": "COW-101-HEALTHY",
        "description": "Normal body temperature (38.5 C), standard rumination, clear milk, low EC",
        "payload": {
            "cow_id": "COW-101-HEALTHY",
            "collar_metrics": {
                "cow_body_temp": 38.5,
                "rumination_delta": 0.5
            },
            "hub_metrics": {
                "shed_thi": 68.0
            },
            "quarter_readings": {
                "LF": {"ec": 4.10, "ph": 6.55, "color": "Normal", "viscosity": 20.0},
                "RF": {"ec": 4.05, "ph": 6.52, "color": "Normal", "viscosity": 20.5},
                "LR": {"ec": 4.12, "ph": 6.50, "color": "Normal", "viscosity": 19.8},
                "RR": {"ec": 4.08, "ph": 6.54, "color": "Normal", "viscosity": 20.2}
            }
        }
    },
    "2": {
        "title": "Subclinical Mastitis (Early Warning on Left-Front Teat)",
        "cow_id": "COW-102-EARLY-STAGE",
        "description": "Mild temperature rise (39.1 C), Left-Front (LF) EC elevated to 5.75 mS/cm, milk slightly salty/alkaline",
        "payload": {
            "cow_id": "COW-102-EARLY-STAGE",
            "collar_metrics": {
                "cow_body_temp": 39.1,
                "rumination_delta": -4.5
            },
            "hub_metrics": {
                "shed_thi": 73.0
            },
            "quarter_readings": {
                "LF": {"ec": 5.85, "ph": 6.82, "color": "Normal", "viscosity": 26.0},
                "RF": {"ec": 4.15, "ph": 6.55, "color": "Normal", "viscosity": 20.0},
                "LR": {"ec": 4.20, "ph": 6.50, "color": "Normal", "viscosity": 20.5},
                "RR": {"ec": 4.10, "ph": 6.52, "color": "Normal", "viscosity": 20.1}
            }
        }
    },
    "3": {
        "title": "Severe Clinical Mastitis & Heat Stress",
        "cow_id": "COW-103-CRITICAL",
        "description": "Fever (39.9 C), Rumination collapsed (-12 min), High THI (81), Clotted/Flaky milk in LF & RF",
        "payload": {
            "cow_id": "COW-103-CRITICAL",
            "collar_metrics": {
                "cow_body_temp": 39.9,
                "rumination_delta": -12.0
            },
            "hub_metrics": {
                "shed_thi": 81.0
            },
            "quarter_readings": {
                "LF": {"ec": 7.40, "ph": 7.25, "color": "Flaky", "viscosity": 38.0},
                "RF": {"ec": 6.90, "ph": 7.10, "color": "Flaky", "viscosity": 34.0},
                "LR": {"ec": 4.60, "ph": 6.65, "color": "Normal", "viscosity": 22.0},
                "RR": {"ec": 4.50, "ph": 6.60, "color": "Normal", "viscosity": 21.5}
            }
        }
    }
}


def send_ingest(payload):
    """Sends ESP32 sensor telemetry packet to FastAPI /api/sensors/ingest"""
    url = f"{AI_SERVICE_URL}/api/sensors/ingest"
    headers = {
        "Content-Type": "application/json",
        "x-device-key": DEVICE_KEY
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, {"error": body}
    except Exception as e:
        return 0, {"error": str(e)}


def query_prediction(cow_id):
    """Queries latest AI inference evaluation for cow from /api/cow/{cow_id}/predict"""
    url = f"{AI_SERVICE_URL}/api/cow/{cow_id}/predict"
    req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, {"error": body}
    except Exception as e:
        return 0, {"error": str(e)}


def run_scenario(scenario_key):
    sc = SCENARIOS[scenario_key]
    print("\n" + "=" * 65)
    print(f" SIMULATING: {sc['title']}")
    print(f" Target Animal: {sc['cow_id']}")
    print(f" Details: {sc['description']}")
    print("=" * 65)

    print("\n[Step 1] Transmitting simulated ESP32 hardware packet to AI ingest...")
    status, ingest_resp = send_ingest(sc["payload"])
    
    if status != 200:
        print(f"[FAIL] Ingest failed with status {status}: {ingest_resp}")
        return

    print(f"[OK] Telemetry ingested successfully! Status: {status}")
    print(f"     Backend Overall Risk: {ingest_resp.get('overall_risk_score')}%")

    time.sleep(0.5)

    print("\n[Step 2] Querying XGBoost ML model prediction for this animal...")
    status, pred_resp = query_prediction(sc["cow_id"])

    if status != 200:
        print(f"[FAIL] Prediction query failed with status {status}: {pred_resp}")
        return

    print("\n" + "-" * 65)
    print(f" AI INFERENCE REPORT: {sc['cow_id']}")
    print("-" * 65)
    print(f" Risk Category       : {pred_resp.get('risk_category')}")
    print(f" Overall Risk Score  : {pred_resp.get('overall_risk_score')}%")
    print(f" Body Temp           : {pred_resp.get('cow_body_temp')} C")
    print(f" Rumination Delta    : {pred_resp.get('rumination_delta')} min/day")
    print(f" Shed THI Index      : {pred_resp.get('shed_thi')}")
    print(f" Recommended Action  : {pred_resp.get('recommended_action')}")
    print("\n Individual Quarter (Teat) Breakdown:")
    
    quarter_results = pred_resp.get("quarter_results", {})
    for q_name in ["LF", "RF", "LR", "RR"]:
        q_info = quarter_results.get(q_name, {})
        metrics = q_info.get("metrics", {})
        status_label = q_info.get("ai_prediction", "unknown").upper()
        risk_pct = q_info.get("risk_pct", 0)

        alert_mark = "[ALERT]" if risk_pct >= 50 or status_label != "HEALTHY" else "[OK]   "
        print(f"   {alert_mark} Quarter {q_name}: {status_label:<10} (Risk: {risk_pct:>5.1f}%) | "
              f"EC: {metrics.get('ec')} mS/cm | pH: {metrics.get('ph')} | Visc: {metrics.get('viscosity')}")

    print("=" * 65)


def main():
    import sys
    print("""
===========================================================
      NANDI - ESP32 & XGBoost AI Pipeline Simulator
===========================================================
Endpoint: """ + AI_SERVICE_URL + """
""")
    
    if len(sys.argv) > 1:
        choice = sys.argv[1].strip()
    else:
        print("Select a simulation scenario:")
        print("  1. Simulate Healthy Cow (Baseline test)")
        print("  2. Simulate Subclinical Mastitis (Early warning test)")
        print("  3. Simulate Acute Clinical Mastitis (Emergency test)")
        print("  4. Run All 3 Scenarios sequentially")
        print("  Q. Quit")
        try:
            choice = input("\nEnter choice [1-4 or Q] (default=4): ").strip()
        except EOFError:
            choice = "4"
    
    if not choice:
        choice = "4"

    if choice.lower() == 'q':
        return
    elif choice in ["1", "2", "3"]:
        run_scenario(choice)
    else:
        for k in ["1", "2", "3"]:
            run_scenario(k)
            time.sleep(1)


if __name__ == "__main__":
    main()

import os
import json
import psycopg2
from psycopg2.extras import Json, RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import numpy as np
import pandas as pd
import joblib

app = FastAPI(title="DairyGuard Backend")

# Enable CORS for React/Vite frontend (usually port 5173 or 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# POSTGRESQL CONFIGURATION
# -----------------------------------------------------------------------------
DB_CONFIG = {
    "dbname": "dairyguard",
    "user": "postgres",
    "password": "Delta_Boom",
    "host": "localhost",
    "port": 5432,
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

# -----------------------------------------------------------------------------
# LOAD TRAINED MODEL ARTIFACTS
# -----------------------------------------------------------------------------
MODEL_FILE = "bovineguard_model.pkl"
CALIB_FILE = "bovineguard_probability_calibrator.pkl"
THRESH_FILE = "bovineguard_threshold.pkl"

if not os.path.exists(MODEL_FILE):
    raise RuntimeError(f"Missing {MODEL_FILE}. Make sure final.py was run in this folder.")

model = joblib.load(MODEL_FILE)
calibrator = joblib.load(CALIB_FILE)
decision_threshold = float(joblib.load(THRESH_FILE))

# Quarter mapping: UI names (LF, RF, LR, RR) <-> Model names (Q1_FL, Q2_FR, etc.)
QUARTER_MAP_TO_MODEL = {"LF": "Q1_FL", "RF": "Q2_FR", "LR": "Q3_RL", "RR": "Q4_RR"}
QUARTER_MAP_TO_UI = {v: k for k, v in QUARTER_MAP_TO_MODEL.items()}
MODEL_QUARTERS = ["Q1_FL", "Q2_FR", "Q3_RL", "Q4_RR"]

FEATURE_NAMES = [
    "delta_ec", "delta_temp", "delta_yield", "delta_ph",
    "absolute_ec", "absolute_temp", "absolute_yield", "absolute_ph",
    "viscosity_cmt", "ec_reference_deviation", "ph_reference_deviation",
    "temp_reference_deviation", "ec_trend_3reading",
    "rumination_3day_trend", "motility_drop", "thi_stress"
]

# Hardware fallback baselines for missing / noisy sensors
FALLBACK_TEMP = 34.0
FALLBACK_YIELD = 2.0
MOTOR_IDLE_BASELINE = 45.0
HEALTHY_EC_REF = 4.40
HEALTHY_PH_REF = 6.55
HEALTHY_TEMP_REF = 34.0

def sanitize_readings(readings: dict) -> dict:
    cleaned = {}
    for ui_key, model_key in QUARTER_MAP_TO_MODEL.items():
        vals = readings.get(ui_key, {}) if isinstance(readings.get(ui_key, {}), dict) else {}

        # Support both old and new ESP32 field names.
        temp_val = vals.get("temp", FALLBACK_TEMP)
        yield_val = vals.get("yield_val", vals.get("yield", FALLBACK_YIELD))
        if temp_val is None or float(temp_val) <= 0:
            temp_val = FALLBACK_TEMP
        if yield_val is None or float(yield_val) <= 0:
            yield_val = FALLBACK_YIELD

        raw_ma = float(vals.get("raw_motor_ma", MOTOR_IDLE_BASELINE))
        motor_ma = MOTOR_IDLE_BASELINE if raw_ma < 10.0 else raw_ma

        viscosity_val = vals.get("viscosity", max(0.0, motor_ma - MOTOR_IDLE_BASELINE))
        if viscosity_val is None:
            viscosity_val = max(0.0, motor_ma - MOTOR_IDLE_BASELINE)

        cleaned[model_key] = {
            "ec": max(0.1, float(vals.get("ec", HEALTHY_EC_REF))),
            "ph": float(vals.get("ph", HEALTHY_PH_REF)),
            "temp": float(temp_val),
            "yield": float(yield_val),
            "viscosity": float(viscosity_val),
            "color": vals.get("color") or "Normal",
        }
    return cleaned

# -----------------------------------------------------------------------------
# 1. ESP32 INGESTION ENDPOINT (ESP32 -> Postgres)
# -----------------------------------------------------------------------------
class QuarterSensorPayload(BaseModel):
    ec: Optional[float] = None
    ph: Optional[float] = None
    temp: Optional[float] = None
    yield_val: Optional[float] = None
    yield_: Optional[float] = None
    raw_motor_ma: Optional[float] = None
    color: Optional[str] = None
    viscosity: Optional[float] = None


class IngestPayload(BaseModel):
    cow_id: str
    shed_thi: Optional[float] = None
    ambient_temp: Optional[float] = None
    ambient_humidity: Optional[float] = None
    cow_temp: Optional[float] = None
    rumination_delta: Optional[float] = None
    readings: Dict[str, QuarterSensorPayload]

@app.get("/api/sensors/ingest")
def ingest_telemetry_info():
    return {
        "status": "ok",
        "message": "This endpoint accepts POST sensor payloads.",
        "method": "POST",
        "expected_fields": ["cow_id", "readings"]
    }

@app.post("/api/sensors/ingest")
def ingest_telemetry(payload: IngestPayload):
    try:
        live_thi = payload.shed_thi
        if live_thi is None and payload.ambient_temp is not None and payload.ambient_humidity is not None:
            live_thi = round(
                0.8 * payload.ambient_temp + (payload.ambient_humidity / 100.0) * (payload.ambient_temp - 14.4) + 46.4,
                1
            )

        telemetry_record = {
            quarter: values.model_dump(exclude_none=True)
            for quarter, values in payload.readings.items()
        }
        if payload.cow_temp is not None:
            telemetry_record["cow_temperature"] = float(payload.cow_temp)
        if payload.rumination_delta is not None:
            telemetry_record["rumination_delta"] = float(payload.rumination_delta)
        if live_thi is not None:
            telemetry_record["shed_thi"] = float(live_thi)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO fastapi_sensor_telemetry
              (cow_id, readings, cow_temperature, rumination_delta, shed_thi)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, recorded_at;
            """,
            (
                payload.cow_id,
                Json(telemetry_record),
                payload.cow_temp,
                payload.rumination_delta,
                live_thi,
            )
        )
        record = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return {
            "status": "stored",
            "id": record[0],
            "timestamp": str(record[1]),
            "cow_temperature": payload.cow_temp,
            "rumination_delta": payload.rumination_delta,
            "shed_thi": live_thi,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 2. DASHBOARD PREDICTION ENDPOINT (Postgres -> XGBoost -> Dashboard UI)
# -----------------------------------------------------------------------------
@app.post("/api/cow/{cow_id}/predict")
def predict_cow(cow_id: str):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        SELECT readings, cow_temperature, rumination_delta, shed_thi
          FROM fastapi_sensor_telemetry
         WHERE cow_id = %s
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1;
        """,
        (cow_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"No telemetry found for cow {cow_id}")

    stored_telemetry = row["readings"] or {}
    raw_readings = sanitize_readings(stored_telemetry)
    real_thi = float(row["shed_thi"] or stored_telemetry.get("shed_thi", 71.0))
    cow_temp = row["cow_temperature"] or stored_telemetry.get("cow_temperature")
    rumination_delta = row["rumination_delta"] or stored_telemetry.get("rumination_delta", -12.0)

    normalized_rows = []
    for q in MODEL_QUARTERS:
        others = [oq for oq in MODEL_QUARTERS if oq != q]
        avg_ec_other = np.mean([raw_readings[oq]["ec"] for oq in others])
        avg_temp_other = np.mean([raw_readings[oq]["temp"] for oq in others])
        avg_yield_other = np.mean([raw_readings[oq]["yield"] for oq in others])
        avg_ph_other = np.mean([raw_readings[oq]["ph"] for oq in others])
        curr = raw_readings[q]

        normalized_rows.append({
            "delta_ec": (curr["ec"] - avg_ec_other) / max(avg_ec_other, 1e-6),
            "delta_temp": curr["temp"] - avg_temp_other,
            "delta_yield": curr["yield"] / max(avg_yield_other, 1e-6),
            "delta_ph": curr["ph"] - avg_ph_other,
            "absolute_ec": curr["ec"],
            "absolute_temp": curr["temp"],
            "absolute_yield": curr["yield"],
            "absolute_ph": curr["ph"],
            "viscosity_cmt": curr["viscosity"],
            "ec_reference_deviation": (curr["ec"] - HEALTHY_EC_REF) / HEALTHY_EC_REF,
            "ph_reference_deviation": curr["ph"] - HEALTHY_PH_REF,
            "temp_reference_deviation": curr["temp"] - HEALTHY_TEMP_REF,
            "ec_trend_3reading": 0.0,
            "rumination_3day_trend": float(rumination_delta),
            "motility_drop": 0.0,
            "thi_stress": real_thi,
        })

    feat_df = pd.DataFrame(normalized_rows)[FEATURE_NAMES]
    raw_probs = model.predict_proba(feat_df)[:, 1]
    calibrated_probs = calibrator.transform(raw_probs)

    quarter_cards = {}
    affected = []
    for idx, q_model in enumerate(MODEL_QUARTERS):
        ui_key = QUARTER_MAP_TO_UI[q_model]
        prob = float(calibrated_probs[idx])
        curr_row = normalized_rows[idx]

        if prob >= decision_threshold or curr_row["absolute_ec"] > 5.50:
            affected.append(ui_key)

        status = "Healthy"
        if prob >= max(decision_threshold, 0.8) or curr_row["absolute_ec"] > 6.50:
            status = "Clinical Mastitis"
        elif prob >= decision_threshold or curr_row["absolute_ec"] >= 5.50:
            status = "Subclinical Mastitis"

        color = raw_readings[q]["color"]
        if curr_row["absolute_ec"] > 5.50:
            color = color if color != "Normal" else "Watery"
        if curr_row["absolute_ec"] > 6.50:
            color = color if color not in ("Normal", "Watery") else "Bloody"

        if prob < 0.20:
            quarter_risk_category = "No Risk"
        elif prob < 0.45:
            quarter_risk_category = "Low Risk"
        elif prob < 0.70:
            quarter_risk_category = "Moderate Risk"
        else:
            quarter_risk_category = "High Risk"

        quarter_cards[ui_key] = {
            "ec": round(curr_row["absolute_ec"], 2),
            "ph": round(curr_row["absolute_ph"], 2),
            "color": color,
            "viscosity": round(curr_row["viscosity_cmt"], 2),
            "status": status,
            "risk_probability": round(prob, 4),
            "risk_category": quarter_risk_category,
            "ec_delta_pct": f"{curr_row['delta_ec'] * 100:+.1f}%",
            "temp_delta_c": f"{curr_row['delta_temp']:+.2f}°C",
            "yield_delta_pct": f"{(curr_row['delta_yield'] - 1.0) * 100:+.0f}%",
        }

    max_prob = float(np.max(calibrated_probs))
    score_pct = int(round(max_prob * 100))

    if score_pct < 20:
        risk_category = "No Risk"
    elif score_pct < 45:
        risk_category = "Low Risk"
    elif score_pct < 70:
        risk_category = "Moderate Risk"
    else:
        risk_category = "High Risk"

    if len(affected) == 1:
        action = "Post-milking chlorhexidine teat dip; milk this cow last to avoid cross-transmission via the milker's hands."
        profile = "Subclinical / Contagious"
    elif len(affected) >= 2:
        action = "Immediate veterinary examination; supportive anti-inflammatory therapy; replace bedding in this stall."
        profile = "Acute / Environmental"
    else:
        action = "Parameters within acceptable physiological ranges. No action required."
        profile = "Healthy"

    prediction_response = {
        "cow_id": cow_id,
        "risk_score_pct": score_pct,
        "risk_category": risk_category,
        "alert_dispatch": score_pct >= 45,
        "shed_thi": round(real_thi, 1),
        "cow_temperature": round(float(cow_temp), 2) if cow_temp is not None else round(float(np.mean([raw_readings[q]["temp"] for q in MODEL_QUARTERS])), 2),
        "rumination_delta_pct": float(rumination_delta),
        "pathogen_profile": profile,
        "recommended_action": action,
        "quarters": quarter_cards,
        "30_day_trend": [
            {"date": f"Aug {i}", "risk": int(15 + i * 1.2)} for i in range(18, 32)
        ] + [
            {"date": f"Sep {i}", "risk": int(32 + i * 2.0)} for i in range(1, 13)
        ]
    }

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO fastapi_prediction_runs
          (cow_id, overall_risk_score, risk_category, quarters)
        VALUES (%s, %s, %s, %s);
        """,
        (cow_id, score_pct, risk_category, Json(quarter_cards)),
    )
    conn.commit()
    cur.close()
    conn.close()
    return prediction_response
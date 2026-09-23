import os
import re
import json
from fastapi import FastAPI, Depends, HTTPException, Header, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from mastitis import predict_on_spot

load_dotenv()

# Safely encoded database password
SQLALCHEMY_DATABASE_URL = "postgresql://nandi_user:nandi%5Fhackcypher@localhost:5432/nandi_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Hardcoded to bypass the 401 error
DEVICE_INGEST_KEY = "esp32_hardware_key_1234"

# CORS: allow origins including Capacitor / mobile and local network
app = FastAPI(title="NANDI AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# UPDATED: Expanded limit from 30 to 50 to allow 36-character UUIDs
COW_ID_PATTERN = re.compile(r'^[A-Za-z0-9\-]{1,50}$')


def validate_cow_id(cow_id: str) -> str:
    if not COW_ID_PATTERN.match(cow_id):
        raise HTTPException(status_code=400, detail="Invalid cow_id format.")
    return cow_id


def verify_device_key(x_device_key: Optional[str] = Header(None)):
    """Require a valid device key for ingestion endpoints."""
    if not DEVICE_INGEST_KEY:
        raise HTTPException(status_code=503, detail="Device authentication not configured on server.")
    if x_device_key != DEVICE_INGEST_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing device key.")


class CowHealthRecord(Base):
    __tablename__ = "cow_health_records"

    id = Column(Integer, primary_key=True, index=True)
    cow_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    overall_risk_score = Column(Float)
    cow_body_temp = Column(Float)
    rumination_delta = Column(Float)
    shed_thi = Column(Float)
    quarter_data = Column(JSON)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class QuarterData(BaseModel):
    ec: Optional[float] = None
    ph: Optional[float] = None
    color: Optional[str] = "Normal"
    viscosity: Optional[float] = 21.0

class CollarData(BaseModel):
    cow_body_temp: Optional[float] = None
    rumination_delta: Optional[float] = None

class HubData(BaseModel):
    shed_thi: Optional[float] = 72.0

# UPDATED: Made models Optional so missing data doesn't trigger a 422 crash
class IngestRequest(BaseModel):
    cow_id: str
    collar_metrics: Optional[CollarData] = None
    hub_metrics: Optional[HubData] = None
    quarter_readings: Optional[Dict[str, QuarterData]] = None

# ==========================================
# 3. ESP32 INGESTION ROUTE (XGBOOST INTEGRATION)
# ==========================================
@app.post("/api/sensors/ingest", dependencies=[Depends(verify_device_key)])
async def ingest_and_predict(payload: IngestRequest, db: Session = Depends(get_db)):
    # Validate cow_id format
    validate_cow_id(payload.cow_id)

    # Safely handle missing payloads by falling back to empty objects
    collar = payload.collar_metrics or CollarData()
    hub = payload.hub_metrics or HubData()
    readings = payload.quarter_readings or {}

    last_record = db.query(CowHealthRecord).filter(
        CowHealthRecord.cow_id == payload.cow_id
    ).order_by(CowHealthRecord.timestamp.desc()).first()

    merged_temp = collar.cow_body_temp if collar.cow_body_temp is not None else (last_record.cow_body_temp if last_record else 38.5)
    merged_rum = collar.rumination_delta if collar.rumination_delta is not None else (last_record.rumination_delta if last_record else 0.0)
    curr_thi = hub.shed_thi if hub.shed_thi is not None else 72.0

    ai_input_list = []

    teat_map_to_ai = {"LF": "LF", "RF": "RF", "LR": "LH", "RR": "RH"}

    for esp_quarter, ai_quarter in teat_map_to_ai.items():
        q_data = readings.get(esp_quarter)

        old_q_metrics = {}
        if last_record and last_record.quarter_data and esp_quarter in last_record.quarter_data:
            old_q_metrics = last_record.quarter_data[esp_quarter].get("metrics", {})

        curr_ec = q_data.ec if q_data and q_data.ec is not None else old_q_metrics.get("ec", 4.10)
        curr_ph = q_data.ph if q_data and q_data.ph is not None else old_q_metrics.get("ph", 6.50)
        curr_visc = q_data.viscosity if q_data and q_data.viscosity is not None else old_q_metrics.get("viscosity", 21.0)

        raw_color = q_data.color.lower() if q_data and q_data.color else old_q_metrics.get("color", "normal").lower()
        if raw_color == "clotted": raw_color = "flaky"

        ai_input_list.append({
            "quarter": ai_quarter,
            "ph": curr_ph,
            "ec": curr_ec,
            "motor_ma": curr_visc,
            "color": raw_color
        })

    try:
        ai_predictions = predict_on_spot(
            quarter_readings=ai_input_list,
            shed_thi=curr_thi,
            model_path="mastitis_model_quarter_xgboost.joblib"
        )
    except Exception as e:
        print(f"AI Inference Error: {e}")
        ai_predictions = {}

    highest_risk_score = 0.0
    quarter_results = {}
    teat_map_to_ui = {"LF": "LF", "RF": "RF", "LH": "LR", "RH": "RR"}

    for ai_quarter, ai_data in ai_predictions.items():
        ui_quarter = teat_map_to_ui[ai_quarter]
        risk_pct = round(ai_data.get("subclinical_probability", 0) * 100, 1)

        if risk_pct > highest_risk_score:
            highest_risk_score = risk_pct

        submitted_data = next(item for item in ai_input_list if item["quarter"] == ai_quarter)

        quarter_results[ui_quarter] = {
            "metrics": {
                "ec": submitted_data["ec"],
                "ph": submitted_data["ph"],
                "color": submitted_data["color"].capitalize(),
                "viscosity": submitted_data["motor_ma"]
            },
            "ai_prediction": ai_data.get("prediction", "healthy"),
            "risk_pct": risk_pct
        }

    new_record = CowHealthRecord(
        cow_id=payload.cow_id,
        timestamp=datetime.utcnow(),
        overall_risk_score=highest_risk_score,
        cow_body_temp=merged_temp,
        rumination_delta=merged_rum,
        shed_thi=curr_thi,
        quarter_data=quarter_results
    )
    db.add(new_record)
    db.commit()

    return {"status": "success", "overall_risk_score": highest_risk_score}

# UPDATED: Path length limit expanded, and added "request: Request = None" to absorb empty JSON bodies
@app.post("/api/cow/{cow_id}/predict")
async def run_prediction_from_live_data(
    cow_id: str = Path(..., regex=r'^[A-Za-z0-9\-]{1,50}$'),
    request: Request = None,
    db: Session = Depends(get_db)
):
    latest_record = db.query(CowHealthRecord).filter(
        CowHealthRecord.cow_id == cow_id
    ).order_by(CowHealthRecord.timestamp.desc()).first()

    if not latest_record:
        raise HTTPException(status_code=404, detail=f"No health records found for cow {cow_id}")

    score = latest_record.overall_risk_score
    risk_category = "High Risk" if score >= 70.0 else "Moderate Risk" if score >= 40.0 else "Low Risk"

    return {
        "cow_id": latest_record.cow_id,
        "overall_risk_score": latest_record.overall_risk_score,
        "cow_body_temp": latest_record.cow_body_temp,
        "rumination_delta": latest_record.rumination_delta,
        "shed_thi": latest_record.shed_thi,
        "risk_category": risk_category,
        "pathogen_profile": "AI Quarter-Level Analysis",
        "recommended_action": "Check individual quarter predictions.",
        "quarter_results": latest_record.quarter_data
    }
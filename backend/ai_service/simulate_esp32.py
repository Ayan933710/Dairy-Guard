import requests
import json

# The local URL of your FastAPI ingest route
URL = "http://127.0.0.1:8000/api/sensors/ingest"

# The exact JSON structure your main.py expects from the hardware
payload = {
    "cow_id": "C-118", 
    "collar_metrics": {
        "cow_body_temp": 38.9,    
        "rumination_delta": -4.0  
    },
    "hub_metrics": {
        "shed_thi": 72.0
    },
"quarter_readings": {
        
        "LF": {"ec": 5.65, "ph": 6.78, "color": "Normal", "viscosity": 24.5}, 
        
        
        "RF": {"ec": 6.10, "ph": 6.85, "color": "Normal", "viscosity": 28.0}, 
        
        
        "LR": {"ec": 4.40, "ph": 6.50, "color": "Normal", "viscosity": 20.8},
        "RR": {"ec": 4.60, "ph": 6.60, "color": "Normal", "viscosity": 21.0}
    }
}

print("Transmitting 'Cliff Edge' virtual ESP32 packet for C-118...")

try:
    response = requests.post(URL, json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error Details:", response.text)
except requests.exceptions.RequestException as e:
    print(f"Connection failed: {e}")
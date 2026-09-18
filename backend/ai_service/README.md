# BovineGuard AI service

This service wraps `BOVINEGUARD_AI_V2_2_CALIBRATED.py` for the Node backend.
The model script and four saved artifacts can remain in Downloads or be copied
to a deployment model directory.

```powershell
cd backend
python -m pip install -r ai_service/requirements.txt
$env:MODEL_SCRIPT = 'C:\Users\harsh\Downloads\BOVINEGUARD_AI_V2_2_CALIBRATED.py'
$env:MODEL_DIR = 'C:\Users\harsh\Downloads'
python -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8000
```

Then set `AI_SERVICE_ENABLED=true` in the backend environment.
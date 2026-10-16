import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

ML_PORT = int(os.getenv("ML_PORT", "8000"))
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(ROOT / "models" / "model.pkl")))
if not MODEL_PATH.is_absolute():
    MODEL_PATH = ROOT / MODEL_PATH
METADATA_PATH = Path(os.getenv("METADATA_PATH", str(ROOT / "models" / "feature_metadata.json")))
if not METADATA_PATH.is_absolute():
    METADATA_PATH = ROOT / METADATA_PATH
ML_ENABLED = os.getenv("ML_ENABLED", "true").lower() in ("1", "true", "yes")
MIN_ACCURACY_TO_PROMOTE = 0.80

# Shared secret for service-to-service calls (header X-Internal-Token).
# Empty = not configured: /train, /retrain and /evaluate are then disabled (503),
# while /predict and /model/* stay open for local development only.
ML_INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN", "")

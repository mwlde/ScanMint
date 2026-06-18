import base64

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.scan_pipeline import scan_document

app = FastAPI(title="SmartScan CV Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _encode_png(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    data = await file.read()
    nparr = np.frombuffer(data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse(status_code=400, content={"error": "Could not decode image"})

    result = scan_document(image)

    return {
        "document_found": result.document_found,
        "original": _encode_png(result.original),
        "enhanced": _encode_png(result.enhanced),
        "detected_overlay": _encode_png(result.detected_overlay),
        "warped": _encode_png(result.warped),
        "scan": _encode_png(result.scan),
        "region_overlay": _encode_png(result.region_overlay),
        "regions": [{"x": x, "y": y, "w": w, "h": h} for x, y, w, h in result.regions],
        "timings_ms": result.timings_ms,
        "total_ms": result.total_ms,
    }

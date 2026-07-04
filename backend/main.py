import base64
import logging

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.scan_pipeline import scan_document

log = logging.getLogger("scanmint.backend")

app = FastAPI(title="ScanMint CV Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 𓆝 𓆟 𓆞 𓆟 𓆝 upload validation

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png"})
MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 mb
MAX_DIMENSION  = 10_000             # px per side, stops decompression bombs (tiny file but huge decoded size)

# magic bytes are more reliable than content type which the client can fake
# jpeg starts with ff d8 ff, png starts with the 8 byte png signature
_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff",       "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
]

# just peeks at the first few bytes of the file to confirm it's actually what it claims to be
def _check_magic(data: bytes) -> bool:
    return any(data[:len(sig)] == sig for sig, _ in _MAGIC)


# runs 3 checks before we touch the image: file size, mime type, and actual byte content
# returns a json error response if anything looks wrong, or none if its fine
def _validate_upload(data: bytes, content_type: str | None) -> JSONResponse | None:
    if len(data) > MAX_FILE_BYTES:
        return JSONResponse(status_code=413, content={"error": "File too large. Maximum is 10 MB."})
    if content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(status_code=415, content={"error": "Only JPEG and PNG images are accepted."})
    if not _check_magic(data):
        return JSONResponse(status_code=415, content={"error": "File content does not match a recognised image format."})
    return None


# converts a cv2 image (numpy array) to a base64 png string so we can send it over json
def _encode_png(img: np.ndarray) -> str:
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode()


@app.get("/health")
def health():
    return {"status": "ok"}


# quality thingy maps to the work height used during document detection
# lower = faster but misses fine edges, higher = slower but better on detailed docs
_QUALITY_MAP = {"low": 350, "medium": 500, "high": 800}

# 𓆝 𓆟 𓆞 𓆟 𓆝 routes

# main endpoint, takes an uploaded image and runs the full cv pipeline on it
# returns 6 versions of the image (original, enhanced, detected, warped, scan, region overlay) as base64 pngs
# also returns the detected text region boxes and timing info
@app.post("/scan")
async def scan(file: UploadFile = File(...), quality: str = Form("medium")):
    data = await file.read()

    err = _validate_upload(data, file.content_type)
    if err:
        return err

    nparr = np.frombuffer(data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse(status_code=400, content={"error": "Could not decode image."})

    h, w = image.shape[:2]
    if h > MAX_DIMENSION or w > MAX_DIMENSION:
        return JSONResponse(
            status_code=400,
            content={"error": f"Image dimensions too large. Maximum is {MAX_DIMENSION}×{MAX_DIMENSION} px."},
        )

    # resize to max 1000px on longest side, large imgs hang on 0.1 cpu
    if max(h, w) > 1000:
        scale = 1000 / max(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)))

    work_height = _QUALITY_MAP.get(quality.lower(), 500)

    try:
        result = scan_document(image, work_height=work_height)
    except Exception:
        log.exception("scan_document raised an unhandled error")
        return JSONResponse(status_code=500, content={"error": "Image processing failed."})

    return {
        "document_found":   result.document_found,
        "original":         _encode_png(result.original),
        "enhanced":         _encode_png(result.enhanced),
        "detected_overlay": _encode_png(result.detected_overlay),
        "warped":           _encode_png(result.warped),
        "scan":             _encode_png(result.scan),
        "region_overlay":   _encode_png(result.region_overlay),
        "regions":          [{"x": rx, "y": ry, "w": rw, "h": rh} for rx, ry, rw, rh in result.regions],
        "timings_ms":       result.timings_ms,
        "total_ms":         result.total_ms,
    }

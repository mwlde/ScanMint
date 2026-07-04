import io
import logging

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from classification_core import classify_document

log = logging.getLogger("scanmint.classifier")

app = FastAPI(title="ScanMint Document Classifier")

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

# 𓆝 𓆟 𓆞 𓆟 𓆝 routes

@app.get("/health")
def health():
    return {"status": "ok"}


# takes an uploaded image, validates it, then runs the classifier model on it
# pil is used here because classification_core expects a pil image
# we check dimensions before fully decoding to avoid loading a massive image into memory for no reason
@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    data = await file.read()

    err = _validate_upload(data, file.content_type)
    if err:
        return err

    try:
        image = Image.open(io.BytesIO(data))
        w, h = image.size  # reads header only, no full pixel decode yet
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Could not decode image."})

    if w > MAX_DIMENSION or h > MAX_DIMENSION:
        return JSONResponse(
            status_code=400,
            content={"error": f"Image dimensions too large. Maximum is {MAX_DIMENSION}×{MAX_DIMENSION} px."},
        )

    try:
        label, confidence = classify_document(image, model_path="document_classifier_v2.pt")
        return {"label": label, "confidence": confidence}
    except Exception:
        log.exception("classify_document raised an unhandled error")
        return JSONResponse(status_code=500, content={"error": "Classification failed."})

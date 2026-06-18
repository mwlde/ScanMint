# SmartScan

A mobile document scanner that detects, deskews, and classifies document images using computer vision and deep learning.

## What it does

1. **Scan** — detects the document boundary in a photo, applies a four-point perspective transform, binarises the result into a clean "scanned" image, and identifies text regions.
2. **Classify** — runs the corrected image through a MobileNetV2 model to label it as one of: `handwritten`, `invoice`, `form`, or `printed_page`.

## Architecture

| Service | Host | Responsibility |
|---------|------|----------------|
| `backend/` | Koyeb | CV pipeline (OpenCV) — `POST /scan` |
| `classifier/` | Hugging Face Spaces | ML classifier (PyTorch) — `POST /classify` |
| `frontend/` | Cloudflare Pages | Next.js 14 mobile web app |

Data persistence uses **Supabase** (storage + auth — coming soon).

## Project structure

```
smartscan/
├── backend/                  # FastAPI + OpenCV scan service (Koyeb)
│   ├── src/                  # Core CV modules (unchanged)
│   ├── main.py               # FastAPI entry — POST /scan
│   ├── requirements.txt
│   └── Dockerfile
├── classifier/               # FastAPI + PyTorch classifier (Hugging Face Spaces)
│   ├── classification_core.py
│   ├── csci435_version1.ipynb  # training notebook
│   ├── document_classifier_v2.pt  # not in git — place here manually
│   ├── app.py               # FastAPI entry — POST /classify
│   └── requirements.txt
├── frontend/                 # Next.js 14 App Router (Cloudflare Pages)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Home screen
│   │   ├── camera/page.tsx   # Camera screen (getUserMedia)
│   │   ├── processing/page.tsx  # POST /scan → POST /classify
│   │   └── results/page.tsx  # Results + stats
│   ├── components/
│   │   └── BottomNav.tsx
│   ├── lib/utils.ts
│   ├── next.config.js
│   ├── wrangler.toml         # Cloudflare Pages config
│   └── .env.local            # API URLs (gitignored)
├── .gitignore
└── README.md
```

## Running locally

### Backend (CV pipeline)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`POST http://localhost:8000/scan` — multipart `file` field. Returns JSON with base64 fields: `original`, `enhanced`, `detected_overlay`, `warped`, `scan`, `region_overlay`, plus `document_found`, `regions`, `total_ms`.

### Classifier

```bash
cd classifier
# Place document_classifier_v2.pt in this directory first
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

`POST http://localhost:8001/classify` — multipart `file` field. Returns `{"label": "invoice", "confidence": 0.97}`.

### Frontend

```bash
cd frontend
npm install
# Edit .env.local with your API URLs (or leave defaults for deployed services)
npm run dev        # dev server on http://localhost:3000
```

For Cloudflare Pages deployment:
```bash
npm run pages:build   # runs @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static
```

Cloudflare Pages build settings (in dashboard):
- **Build command:** `npm run pages:build`
- **Output directory:** `.vercel/output/static`
- **Root directory:** `frontend`

## Model weights

`document_classifier_v2.pt` is gitignored. Place it in `classifier/` for local use. Upload it directly to Hugging Face Spaces for deployment.

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SCAN_API` | `frontend/.env.local` | Koyeb backend URL |
| `NEXT_PUBLIC_CLASSIFY_API` | `frontend/.env.local` | Hugging Face Space URL |
| `SUPABASE_URL` | frontend + backend | Supabase project URL (coming soon) |
| `SUPABASE_KEY` | frontend + backend | Supabase anon/service key (coming soon) |

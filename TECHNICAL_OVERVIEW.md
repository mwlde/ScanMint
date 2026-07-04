# ScanMint — Technical Overview

**Version:** v0.16  
**Course:** CSCI435 — Computer Vision Algorithms and Systems  
**University:** University of Wollongong in Dubai

---

## Table of Contents

1. [Computer Vision Pipeline](#1-computer-vision-pipeline)
2. [Machine Learning Classifier](#2-machine-learning-classifier)
3. [Security Measures](#3-security-measures)
4. [System Architecture](#4-system-architecture)
5. [Known Limitations](#5-known-limitations)
6. [Constants Reference](#6-constants-reference)

---

## 1. Computer Vision Pipeline

The CV pipeline lives entirely in `backend/src/` and is orchestrated by `scan_document()` in `scan_pipeline.py`. All stages run sequentially with per-step millisecond timings.

### 1.1 Orchestration — `src/scan_pipeline.py`

`scan_document(image, work_height=500)` is the single entry point. It returns a `ScanResult` dataclass with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `original` | `np.ndarray` | Raw input image |
| `enhanced` | `np.ndarray` | After `enhance()` |
| `detected_overlay` | `np.ndarray` | Input with detected quad drawn on top |
| `corners` | `np.ndarray` | (4, 2) corner array used for warp |
| `document_found` | `bool` | `False` when fell back to full-frame corners |
| `warped` | `np.ndarray` | Perspective-corrected image (colour) |
| `scan` | `np.ndarray` | Final binarised "scanned" image |
| `regions` | `list` | `[(x, y, w, h), ...]` content region boxes |
| `region_overlay` | `np.ndarray` | `scan` with numbered region boxes drawn |
| `timings_ms` | `dict` | Per-step timing in ms |

**Pipeline step order:**

```
enhance()  →  find_document_contour()  →  four_point_transform()
    →  to_scan()  →  segment_regions()
```

The `total_ms` property sums all entries in `timings_ms`.

---

### 1.2 Document Detection — `src/document_detection.py`

Detection is a **five-pass fallback cascade**. Each pass is tried in order; the first one that returns a valid quad wins. If all five fail, `full_frame_corners()` is returned and `document_found` is set to `False`.

Before any pass runs, the image is resized to `work_height` on its short axis and a `PAD = 10` pixel white border is added to prevent edge-clipped contours.

#### Detection Passes (in fallback order)

**Pass 1 — `_detect_fixed_canny(gray, min_area_frac, frame_area)`**  
Target: clean, well-lit images on plain backgrounds.  
- `cv2.GaussianBlur` kernel (5, 5)  
- `cv2.Canny(75, 200)` — fixed thresholds  
- `cv2.morphologyEx(MORPH_CLOSE)` with (5, 5) kernel  
- Top 5 contours by area considered  

**Pass 2 — `_detect_auto_canny(gray, min_area_frac, frame_area)`**  
Target: images where fixed thresholds over- or under-fire.  
- `cv2.GaussianBlur` kernel (9, 9) — heavier blur  
- `_auto_canny()` computes adaptive thresholds from the pixel intensity median:  
  - `lower = max(0, (1 - 0.33) × median)`  
  - `upper = min(255, (1 + 0.33) × median)`  
- Top 8 contours considered  

**Pass 3 — LAB L-channel** (implicit in the cascade)  
Target: images where luminance contrast is higher in perceptual space than BGR.  
- Converts to LAB colour space and operates on the L channel.  

**Pass 4 — `_detect_white_document(small, min_area_frac, frame_area)`**  
Target: white/light-coloured documents on dark or cluttered backgrounds.  
- Converts to HSV, thresholds V-channel at 190 (isolates bright regions)  
- `cv2.erode` with (15, 15) kernel, 2 iterations — breaks thin connections between overlapping white objects (e.g. an envelope sitting on top of a letter), separating them into distinct blobs before contour finding  
- For each candidate blob: draws it onto an isolated mask and `cv2.dilate` (same kernel, same iterations) to restore the area lost to erosion before fitting a quad  
- Uses `cv2.minAreaRect` instead of polygon approximation — handles slightly curved pages  

**Pass 5 — `_detect_otsu(gray, min_area_frac, frame_area)`**  
Target: last resort for high-contrast documents where all edge detectors fail.  
- `cv2.morphologyEx(MORPH_CLOSE)` with (15, 15) kernel — largest kernel in the pipeline  
- `cv2.threshold(OTSU)` for automatic threshold selection  
- `cv2.dilate` with (5, 5) kernel, 2 iterations  
- Also generates a `cv2.Canny(75, 200)` edge map (via a (5, 5) Gaussian blur) purely for edge support validation — Otsu itself doesn't use Canny, but the same `_edge_support` check still runs on the candidate quad  

#### Quad Validation — `_is_valid_quad(quad, frame_area, edge_map=None)`

Every candidate contour is tested against six geometric rules before being accepted:

| Check | Implementation | Threshold |
|-------|---------------|-----------|
| **Convexity** | `cv2.isContourConvex()` | Must be convex |
| **Parallelism** | `_sides_are_parallel(pts, max_angle_diff=35)` | Opposite side pairs must differ by ≤ 35° |
| **Corner angles** | Dot-product angle at each vertex | Must be in range [50°, 130°] |
| **Area cap** | `cv2.contourArea(quad) / frame_area` | Must be ≤ 0.90 |
| **Aspect ratio** | `max(w/h, h/w)` | Must be ≤ 8.0 |
| **Edge support** | `_edge_support(edge_map, p1, p2)` on all 4 sides | All sides must have ≥ 60% real Canny edge support (only when `edge_map` is provided) |

`_sides_are_parallel()` computes the angle of each of the four sides and verifies that both pairs of opposite sides agree within the threshold. A perspective projection of a rectangle always preserves rough parallelism, so this rejects non-document quads (e.g., a tilted desk edge).

**Edge support — `_edge_support(edge_map, p1, p2, n_samples=20, radius=3)`**  
Samples 20 evenly-spaced points along each side of the quad and checks whether any raw Canny edge pixel falls within a 3 px radius of each sample point. A side where fewer than 60% of samples find a real edge was likely bridged by `MORPH_CLOSE` across an occlusion gap rather than being a real document boundary. This is the primary check that rejects quads where an overlapping object (e.g. an envelope) causes one side to straddle both objects.

The `edge_map` passed in is always the **pre-close** Canny output — the map computed before `MORPH_CLOSE` is applied to the edge image. Checking the post-close map would give ~100% support even on fake bridged sides, since morph close fills in exactly those gaps.

#### Contour-to-Quad Conversion — `_approx_to_quad(contour, frame_area, edge_map=None)`

Attempts polygon approximation with eight epsilon values `[0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08]` (as fractions of the perimeter), tried tightest-first. Tighter epsilons produce less aggressive simplification and are less likely to absorb stray segments from nearby objects into a side of the quad. If no value produces a valid 4-point quad, falls back to convex hull approximation with epsilons `[0.05, 0.08, 0.10, 0.15]`. The `edge_map` is passed through to `_is_valid_quad` for the edge support check.

`_min_area_rect_quad(contour, frame_area, edge_map=None)` is used as an alternative for curved/crumpled pages — it fits a minimum-area bounding rectangle to the contour rather than approximating the polygon.

#### Corner Self-Correction — `_fix_bad_corner(quad, frame_h, frame_w)`

After detection, each corner's interior angle is computed. If any corner is badly displaced (e.g., pulled off-document by a nearby edge), the **parallelogram rule** reconstructs it:

```
D = A + C - B
```

where A, B, C are the three well-placed corners and D is the reconstructed one. The correction is only applied if it improves the total rectangularity score (sum of |90° − corner_angle|) by more than **40 degrees**.

---

### 1.3 Perspective Transform — `src/perspective.py`

**`order_points(pts)`** reorders the raw 4-point array into a canonical `[TL, TR, BR, BL]` order:
- Top-left: point with the minimum sum of coordinates  
- Bottom-right: point with the maximum sum  
- Top-right: point with the maximum `(x − y)`  
- Bottom-left: point with the minimum `(x − y)`  

**`four_point_transform(image, corners)`** computes the output canvas size by taking the maximum of the two horizontal edge lengths (for width) and the two vertical edge lengths (for height). This preserves the document's natural aspect ratio. The actual warp is `cv2.warpPerspective()`.

---

### 1.4 Preprocessing & Enhancement — `src/preprocessing.py`

**`enhance(image, denoise=True, clahe=True)`**  
Returns a BGR image. Both steps are individually toggleable.

- **Denoise:** `cv2.bilateralFilter(d=9, sigmaColor=75, sigmaSpace=75)` — edge-preserving smoothing that reduces sensor noise without blurring text edges.  
- **CLAHE:** Applied to the L-channel of LAB colour space only (not to colour channels), preventing colour shift. Parameters: `clipLimit=2.0`, `tileGridSize=(8, 8)`.

**`to_scan(image, block_size=25, c=15)`**  
Produces the final binarised "scanned look" output.

1. Convert to greyscale  
2. `cv2.medianBlur(3)` — removes salt-and-pepper noise  
3. `cv2.adaptiveThreshold(ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY, block_size=25, C=15)` — local thresholding handles uneven illumination across the page  

The `block_size` is forced to an odd value; if an even value is passed it is incremented by 1.

---

### 1.5 Segmentation — `src/segmentation.py`

**`segment_regions(image, min_area_frac=0.0008, merge_kernel=(25, 5))`**

Finds axis-aligned bounding boxes around content regions (text blocks, diagrams).

1. `cv2.adaptiveThreshold(BINARY_INV, block_size=25, C=15)` — text becomes white on a black background  
2. `cv2.morphologyEx(MORPH_OPEN, (2, 2))` — removes specks smaller than 2 × 2 px  
3. `cv2.dilate(merge_kernel=(25, 5), iterations=2)` — horizontally wide kernel glues individual characters into word/line blobs; narrow vertically to keep lines separate  
4. Area filter: `min_area_frac × page_area` ≤ region area ≤ `0.95 × page_area`  
5. Sort: `(y // 20, x)` — reading order (top-to-bottom, left-to-right within 20 px bands)  

`draw_regions(image, boxes, color=(255, 0, 0), thickness=2)` renders numbered bounding boxes on the image.

---

## 2. Machine Learning Classifier

### 2.1 Model Architecture

**File:** `classifier/classification_core.py`

**Base model:** `torchvision.models.mobilenet_v2(weights=None)`  
The ImageNet-pretrained weights are loaded separately; the backbone is then **frozen** (no gradient updates during training). Only the classifier head is trained.

**Custom head** (replaces `model.classifier`):

```python
nn.Sequential(
    nn.Dropout(p=0.3),
    nn.Linear(1280, 4)   # 1280 = MobileNetV2 last_channel
)
```

Trainable parameters: **5,124** (1280 × 4 weights + 4 biases).

**Inference transform:**

```python
transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])
```

**Inference entry point:** `classify_document(image, model_path='document_classifier_v2.pt')`  
- Accepts PIL Image, numpy array (RGB or BGR), or a file path string  
- Model is loaded once and cached as a module-level singleton (`_get_model()`)  
- Returns `(class_name: str, confidence: float)`, e.g. `('invoice', 0.97)`

**Classes:** `['handwritten', 'invoice', 'form', 'printed_page']`

---

### 2.2 Training — `classifier/csci435_version1.ipynb`

#### Datasets

| Source | Split folder | Class | Train | Val | Test |
|--------|-------------|-------|-------|-----|------|
| senju14 (Kaggle) | `document/` | handwritten | 1,231 | 155 | 153 |
| senju14 (Kaggle) | `invoice/` | invoice | 778 | 97 | 98 |
| senju14 (Kaggle) | `form/` | form | 159 | 19 | 21 |
| suvroo (Kaggle) | `Report/` | printed_page | 213 | 27 | 27 |
| **Total** | | | **2,381** | **298** | **299** |

The `suvroo` dataset had no pre-built splits and was divided 80/10/10 manually.

#### Data Augmentation (training only)

```python
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.4, contrast=0.4),
    transforms.RandomAffine(degrees=0, shear=5, scale=(0.9, 1.1)),   # simulates handheld perspective skew
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),         # simulates camera focus/motion blur
    transforms.ToTensor(),
    transforms.RandomErasing(p=0.1, scale=(0.02, 0.08)),              # simulates smudges/partial occlusion
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])
```

#### Class Weighting

`form` and `printed_page` are significantly underrepresented. Weighted `CrossEntropyLoss` is used:

```
weight_c = total_samples / (num_classes × count_c)
```

| Class | Count | Weight |
|-------|-------|--------|
| handwritten | 1,231 | 0.483 |
| invoice | 778 | 0.765 |
| form | 159 | 3.742 |
| printed_page | 213 | 2.807 |

#### Hyperparameters

| Parameter | Value |
|-----------|-------|
| `img_size` | 224 |
| `batch_size` | 32 |
| `epochs` | 10 |
| `learning_rate` | 0.001 |
| Optimizer | Adam |
| `dropout` | 0.3 |
| Device | CUDA if available, else CPU |

Best checkpoint is saved when validation accuracy improves.

#### Results

**Test accuracy: 98.33%**  
**Best validation accuracy: 96.6%** (epoch 9)  
**Average inference latency: 0.16 ms/image** (CPU)  
**Average confidence score: 93.94%**

| Class | Precision | Recall | F1 | Support | Avg Confidence |
|-------|-----------|--------|----|---------|----------------|
| handwritten | 1.00 | 1.00 | 1.00 | 153 | 97.70% |
| invoice | 1.00 | 0.99 | 0.99 | 98 | 88.89% |
| form | 0.95 | 0.86 | 0.90 | 21 | 90.78% |
| printed_page | 0.87 | 0.96 | 0.91 | 27 | 93.12% |

#### Bonus 10-Class Model (v0.3 — research extension)

An extended model trained on the RVL-CDIP-inspired class set:  
`advertisement, email, form, letter, memo, news, note, report, resume, scientific_paper`  
Test accuracy: **67.6%**. Not used in the production pipeline; deployed as a secondary optional endpoint.

---

## 3. Security Measures

### 3.1 File Upload Validation (`backend/main.py`, `classifier/app.py`)

Both services share identical validation logic via `_validate_upload(data, content_type)`:

**Step 1 — File size check:**  
`len(data) > MAX_FILE_BYTES (10 MB)` → HTTP 413

**Step 2 — MIME type check:**  
`file.content_type not in {"image/jpeg", "image/png"}` → HTTP 415  
(Client-supplied header; checked first but not trusted alone.)

**Step 3 — Magic byte check:**  
More reliable than Content-Type. Verified against:
- JPEG: first 3 bytes == `\xff\xd8\xff`  
- PNG: first 8 bytes == `\x89PNG\r\n\x1a\n`  

Any mismatch → HTTP 415

**Step 4 — Decode check:**  
- Backend: `cv2.imdecode()` returning `None` → HTTP 400  
- Classifier: `PIL.Image.open()` raising any exception → HTTP 400  

**Step 5 — Dimension check (decompression bomb defence):**  
After decoding, `h > MAX_DIMENSION or w > MAX_DIMENSION` (10,000 px per side) → HTTP 400.  
This catches PNG bombs: a 50,000 × 50,000 all-white PNG may be only kilobytes compressed but gigabytes in memory — the file size limit alone does not stop it.

### 3.2 Error Handling

All processing logic is wrapped in `try/except Exception`. On failure:
- `log.exception()` records the full traceback server-side (stderr only)
- Client receives a generic HTTP 500 with `{"error": "Image processing failed."}` or `{"error": "Classification failed."}`
- No stack trace, file path, or internal variable is exposed in the response

### 3.3 Database Security (Supabase RLS)

**Table:** `feedback`  
**RLS:** Enabled

| Policy | Operation | Rule | Rationale |
|--------|-----------|------|-----------|
| "anyone can insert feedback" | INSERT | `WITH CHECK (true)` | Guest submissions require no user_id |
| "anyone can read feedback" | SELECT | `USING (true)` | Academic demo, no PII in feedback |

**Column-level constraints:**

```sql
predicted_label text not null
  check (predicted_label in ('handwritten','invoice','form','printed_page'))

correct_label text
  check (correct_label in ('handwritten','invoice','form','printed_page'))
  -- NULL allowed: means was_correct = true
```

These CHECK constraints reject invalid label strings at the database layer, independently of application validation.

**`user_id`** is nullable and references `auth.users(id) ON DELETE SET NULL`. Guest rows carry `NULL`; this is intentional, not a gap.

### 3.4 Password Validation (`frontend/app/auth/page.tsx`)

Applied **on signup only** (login enforces only the max to prevent bcrypt truncation surprises):

| Rule | Implementation |
|------|---------------|
| Minimum 8 characters | `pw.length >= 8` |
| Maximum 72 characters | `pw.length <= 72` — bcrypt's effective input limit |
| At least one uppercase | `/[A-Z]/.test(pw)` |
| At least one lowercase | `/[a-z]/.test(pw)` |
| At least one digit | `/[0-9]/.test(pw)` |

All five rules are evaluated on every keystroke via `checkPassword(pw): PwRules` and displayed as real-time green check / grey × indicators. The submit button is blocked until `allValid(rules)` returns `true` and passwords match.

Email field: `maxLength={255}` prevents oversized payloads.  
Password fields: `maxLength={72}` on both password inputs — the browser hard-stops at the bcrypt limit.

### 3.5 Supabase Storage Security (`feedback-images`)

The `feedback-images` bucket is configured as **public** (Supabase serves objects via public CDN URLs without requiring auth headers). RLS policies on `storage.objects` restrict writes to the bucket path:

| Policy | Operation | Role | Rule |
|--------|-----------|------|------|
| "public read feedback images" | SELECT | public | `bucket_id = 'feedback-images'` |
| "anyone can upload feedback images" | INSERT | public | `bucket_id = 'feedback-images'` |

No UPDATE or DELETE policies exist — uploaded images are immutable. The filename is always a UUID (`{feedback_id}.jpg`), making enumeration impractical.

Images are compressed client-side before upload (max 800 px on the longest side, JPEG quality 0.8) to limit per-object storage size to roughly 50–150 KB.

### 3.6 Input Sanitisation

- `quality` parameter in `POST /scan` is looked up via `_QUALITY_MAP.get(quality.lower(), 500)` — unknown values silently fall back to the medium work-height (500 px); no shell execution or path interpolation occurs  
- All file reads are in-memory (no temp files written to disk)  
- `email.trim()` before Supabase auth calls

---

## 4. System Architecture

### 4.1 Service Topology

```
Browser (Next.js 15, App Router)
    │
    ├─ POST /scan  ──────────────────────► Backend  (FastAPI, port 8000)
    │   multipart/form-data                  └─ OpenCV pipeline
    │   file + quality                       └─ Returns 6 base64 images + metadata
    │
    └─ POST /classify  ─────────────────► Classifier  (FastAPI, port 8001 / HF Spaces)
        multipart/form-data                  └─ MobileNetV2 inference
        file (warped image)                  └─ Returns label + confidence
```

**Environment variables (frontend):**

```
NEXT_PUBLIC_SCAN_API       = http://localhost:8000          # or Koyeb URL
NEXT_PUBLIC_CLASSIFY_API   = https://mwlde-scanmint-classifier.hf.space
NEXT_PUBLIC_SUPABASE_URL   = https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <publishable key>
```

### 4.2 Full Data Flow

```
1. Camera / Upload (app/camera or file input)
   └─ Stores raw image as base64 data URL in sessionStorage['ss_image']
   └─ router.push('/processing')

2. Processing screen (app/processing/page.tsx)
   └─ Reads sessionStorage['ss_image']
   └─ Step indicators: Enhance → Detect → Warp → Classify
   
   a. POST /scan  (quality from localStorage['ss_scan_quality'], default 'medium')
      ← ScanResult: {original, enhanced, detected_overlay, warped, scan,
                     region_overlay, regions, timings_ms, document_found}
      → stored in scanStore (in-memory module; survives client-side nav)
      → thumbnail = createThumbnail(scan, maxDim=600) → stored in history
   
   b. POST /classify  (sends warped image)
      ← {label, confidence}
      → stored in scanStore
   
   └─ addHistoryItem({id, timestamp, label, confidence, document_found,
                      thumbnail, saved:false, quality})
   └─ router.push('/results')

3. Results screen (app/results/page.tsx)
   └─ Reads scanStore.getScan() + scanStore.getClassify()
   └─ Image carousel: Final → Warped → Original → Detected → Regions
   └─ Stat chips: confidence %, region count, document_found
   └─ FeedbackCard shown if !isFeedbackOptedOut()
      → on submit: compresses warped image (max 800 px, JPEG 0.8)
      → uploads to Supabase Storage `feedback-images/${id}.jpg`
      → stores public URL as `image_url` in feedback row
      → upload failure is silent — row is inserted with `image_url = null`
   └─ Save sheet → toggleSaved(id) + optional folder assignment
```

### 4.3 Frontend State Management

| Storage | Key | Contents | Lifetime |
|---------|-----|----------|----------|
| `sessionStorage` | `ss_image` | Raw captured/uploaded image (base64) | Until tab closes |
| Module variable | `scanStore` | Full 6-image ScanResult + ClassifyResult | Until hard refresh |
| `localStorage` | `ss_history` | `HistoryItem[]`, max 50 entries | Persistent |
| `localStorage` | `ss_folders` | `Folder[]` with `itemIds[]` | Persistent |
| `localStorage` | `ss_feedback_log` | `FeedbackEntry[]`, max 200 entries | Persistent |
| `localStorage` | `ss_feedback_opt_out` | `'true'` if opted out | Persistent |
| `localStorage` | `ss_scan_quality` | `'low' \| 'medium' \| 'high'` | Persistent |
| `localStorage` | `ss_doge_mode` | `'true'` if enabled | Persistent |

**Why `scanStore` is not `sessionStorage`:** The 6 base64 images from the scan pipeline would exceed the ~5 MB `sessionStorage` quota. Module-level variables survive client-side navigation (Next.js client router does not unmount the module), but are cleared on a hard refresh/tab close.

### 4.4 Database Schema

#### Table: `feedback`

```sql
id              uuid        PRIMARY KEY DEFAULT gen_random_uuid()
created_at      timestamptz NOT NULL DEFAULT now()
user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL  -- nullable
predicted_label text        NOT NULL
                            CHECK (predicted_label IN ('handwritten','invoice','form','printed_page'))
confidence      real        NOT NULL
was_correct     boolean     NOT NULL
correct_label   text        CHECK (correct_label IN ('handwritten','invoice','form','printed_page'))
                            -- NULL when was_correct = true
image_url       text        -- nullable; public URL of the compressed warped image in Supabase Storage
```

No other tables are defined in this repository; scan history and folders are stored client-side in `localStorage`.

#### Storage bucket: `feedback-images`

```sql
-- bucket: public = true (public URLs work without auth)
insert into storage.buckets (id, name, public) values ('feedback-images', 'feedback-images', true);

-- RLS on storage.objects
"public read feedback images"    SELECT  to public  using  (bucket_id = 'feedback-images')
"anyone can upload feedback images"  INSERT  to public  with check  (bucket_id = 'feedback-images')
```

Objects are write-once (no UPDATE/DELETE policies). The `image_url` stored in the feedback row is the Supabase public URL returned by `getPublicUrl()`.

### 4.5 Authentication Flow

```
App launch
    └─ supabase.auth.getUser()          # via useAuth() hook
    └─ onAuthStateChange subscription   # reactive to login/logout

Guest path (default):
    └─ user = null
    └─ All scan, history, folder, feedback features work normally
    └─ feedback.user_id = null on Supabase insert

Authenticated path:
    └─ Settings → "Log In / Sign Up" → /auth page
    └─ supabase.auth.signInWithPassword() or signUp()
    └─ On success: router.back() (returns to Settings)
    └─ user_id attached to all new feedback submissions
    └─ Settings card shows email + green "Signed in" + "Log Out" link

Log out:
    └─ supabase.auth.signOut()
    └─ onAuthStateChange fires → user = null
    └─ UI reverts to guest state
```

**Key design decisions:**
- Login is never required — the app is fully functional as a guest
- Auth state is propagated via `useAuth()` hook (`supabase.auth.onAuthStateChange`) rather than prop drilling
- `useDogeMode()` follows the same pattern for the easter egg toggle, listening to `StorageEvent` for cross-component sync within a tab

### 4.6 Folder System

The "All Scans" folder is a **virtual folder** — never persisted, constructed at render time:

```typescript
const ALL_SCANS_ID = '__all__'
const allScansFolder = { id: ALL_SCANS_ID, itemIds: history.map(h => h.id) }
```

It cannot be deleted. User-created folders are stored in `localStorage['ss_folders']` as `Folder[]` objects with a colour pair cycled from 6 options.

---

## 5. Known Limitations

The following limitations are documented in code comments or are implied by fallback behaviors:

### CV Pipeline

- **Detection fails on patterned/wooden backgrounds** — addressed in v0.4 by extending to 5 passes and adding quad validation, but complex backgrounds can still produce false positives.

- **`_fix_bad_corner` is heuristic** — the parallelogram rule only fires if it improves the total angle score by > 40°. There is no guarantee it chooses the correct corner when two or more are displaced.

- **Work-height resize to 1000 px before processing** (`main.py`): "large images hang on 0.1 CPU" — this comment documents that the resize is a performance workaround for the constrained Koyeb deployment, not a pipeline design choice.

- **Segmentation uses fixed block sizes** — `segment_regions()` uses `block_size=25` and `merge_kernel=(25, 5)`. These are tuned for A4-scale documents at typical processing resolution. Very dense or very sparse documents (e.g., full-page single-image, or sparse letterheads) may produce over- or under-segmented region counts.

### Classifier

- **`form` and `printed_page` lower F1** — 0.90 and 0.91 respectively, vs 1.00 for `handwritten`. Both classes have small test support (21 and 27 samples). Form precision (0.95) and printed_page recall (0.96) are the weakest individual metrics.

- **`invoice` average confidence 88.89%** — noticeably lower than other classes (93–97%). Invoices vary widely in layout, which increases uncertainty even when the label is correct.

- **Bonus 10-class model (67.6% accuracy)** — the extended classifier is substantially less accurate. Code comments note it as a "research extension, not core" and it is not exposed in the production UI.

- **Re-training requires manual export** — `backend/scripts/export_corrections.py` downloads all rows where `was_correct = false` and `image_url IS NOT NULL`, organises them into `corrections/{label}/` folders, and prints a per-class breakdown. Run it manually; it is not triggered by any user action. The next training iteration would merge these into the existing dataset and retrain from scratch.

### Frontend / Storage

- **`scanStore` cleared on hard refresh** — if the user hard-refreshes on `/results`, `scanStore` is empty and the page shows nothing. There is no recovery mechanism; the scan must be re-run.

- **localStorage quota ~5 MB** — `QUOTA_BYTES = 5 * 1024 * 1024` is used for display only; it is not enforced. If history fills the quota, `JSON.stringify` in `addHistoryItem` will silently fail. The `createThumbnail` call is wrapped in a try/catch for this reason, but the outer history write is not.

- **History capped at 50 items, feedback at 200** — older entries are silently dropped.

- **`quality` badge undefined for old history entries** — `quality?: string` is optional; items saved before v0.9 have no quality field.

### Security

- **CORS allow_origins=`["*"]`** — both services allow requests from any origin. Appropriate for a demo/development deployment but should be restricted to the frontend domain in production.

- **No rate limiting** — the `/scan` and `/classify` endpoints have no per-IP or per-session request rate limiting. A malicious client could submit many requests concurrently to exhaust server CPU.

- **RLS policies use `true`** — feedback rows are publicly readable and writable by anyone with the anon key. This is intentional for the guest-first design but means any holder of the published anon key can read all feedback rows.

- **Auth is email + password only** — no OAuth providers, no MFA, no email domain restriction.

---

## 6. Constants Reference

| Location | Constant | Value | Purpose |
|----------|----------|-------|---------|
| `backend/main.py` | `MAX_FILE_BYTES` | `10 MB` | Upload size limit |
| `backend/main.py` | `MAX_DIMENSION` | `10,000 px` | Max dimension per side |
| `backend/main.py` | `_QUALITY_MAP` | `{low:350, medium:500, high:800}` | Work-height for detection |
| `backend/main.py` | Resize limit | `1000 px` | Max longest side before `scan_document()` |
| `src/document_detection.py` | `PAD` | `10 px` | Border added before detection |
| `src/document_detection.py` | Epsilon values | `[0.01…0.08]` | Polygon approximation steps (8 values, tightest-first) |
| `src/document_detection.py` | Parallelism threshold | `35°` | `max_angle_diff` in `_sides_are_parallel` |
| `src/document_detection.py` | Corner angle range | `[50°, 130°]` | Valid interior angles |
| `src/document_detection.py` | Area cap | `0.90` | Max quad as fraction of frame |
| `src/document_detection.py` | Aspect ratio cap | `8.0` | Max `max(w/h, h/w)` |
| `src/document_detection.py` | Edge support `n_samples` | `20` | Sample points per quad side |
| `src/document_detection.py` | Edge support `radius` | `3 px` | Lookup radius around each sample point |
| `src/document_detection.py` | Edge support `MIN_SUPPORT` | `0.60` | Min fraction of side with real Canny edges |
| `src/document_detection.py` | Corner fix threshold | `40°` | Min improvement for parallelogram rule |
| `src/preprocessing.py` | Bilateral d | `9` | `bilateralFilter` diameter |
| `src/preprocessing.py` | CLAHE clipLimit | `2.0` | |
| `src/preprocessing.py` | CLAHE tileGridSize | `(8, 8)` | |
| `src/preprocessing.py` | `block_size` | `25` | Adaptive threshold block |
| `src/preprocessing.py` | `c` | `15` | Adaptive threshold constant |
| `src/segmentation.py` | `min_area_frac` | `0.0008` | Min region as fraction of page |
| `src/segmentation.py` | `merge_kernel` | `(25, 5)` | Dilation kernel |
| `classifier/csci435_version1.ipynb` | `img_size` | `224` | Model input (px) |
| `classifier/csci435_version1.ipynb` | `batch_size` | `32` | Training batch |
| `classifier/csci435_version1.ipynb` | `epochs` | `10` | Training epochs |
| `classifier/csci435_version1.ipynb` | `learning_rate` | `0.001` | Adam LR |
| `classifier/csci435_version1.ipynb` | `dropout` | `0.3` | Classifier head dropout |
| `classifier/csci435_version1.ipynb` | Trainable params | `5,124` | Head only |
| `frontend/lib/history.ts` | `MAX_ITEMS` | `50` | History entries kept |
| `frontend/lib/history.ts` | Thumbnail `maxDim` | `600 px` | JPEG thumbnail max dimension |
| `frontend/lib/history.ts` | Thumbnail quality | `0.7` | JPEG quality factor |
| `frontend/lib/feedback.ts` | `MAX_ITEMS` | `200` | Feedback log entries kept |
| `frontend/lib/feedback.ts` | Upload `maxDim` | `800 px` | Max dimension before JPEG compress |
| `frontend/lib/feedback.ts` | Upload JPEG quality | `0.8` | Compression quality for Storage upload |
| `backend/scripts/export_corrections.py` | `PAGE_SIZE` | `1000` | Supabase rows per paginated request |
| `backend/scripts/export_corrections.py` | `OUTPUT_ROOT` | `corrections/` | Local folder for downloaded images |
| `frontend/app/auth/page.tsx` | `PW_MIN` | `8` | Min password length |
| `frontend/app/auth/page.tsx` | `PW_MAX` | `72` | Max password length (bcrypt limit) |
| `frontend/app/settings/page.tsx` | `QUOTA_BYTES` | `5 MB` | localStorage display quota |

# WardrobeWise – AI & Smart Outfit Recommendation Module (Member 3)

Welcome to the **Member 3 AI Module** for **WardrobeWise – AI-Powered Digital Wardrobe and Virtual Dressing Room**.

This module is completely self-contained, independent, and provides real, production-ready AI vision and recommendation capabilities without relying on paid APIs or fake hardcoded responses.

---

## 1. Module Overview & Responsibilities

As Member 3, this module delivers:
1. **Clothing Image Recognition**: Analyzes clothing photos across 14 supported fashion categories with confidence scores and alternatives.
2. **Dominant & Secondary Color Detection**: Uses OpenCV K-Means pixel clustering and CIELAB/Euclidean distance to map pixels to human-readable fashion color names.
3. **Pattern Detection**: Identifies Plain, Striped, Checked, Floral, and Printed patterns (or flags `Unknown` when inconclusive).
4. **Structured JSON Output**: Returns a standardized schema ready for MongoDB storage and frontend rendering.
5. **Smart Outfit Recommendation Engine**: A JavaScript rule-based engine that generates complete outfits strictly from the user's available wardrobe.
6. **Occasion & Season Suitability**: Recommends outfits matching 7 occasions (College, Office, Casual outing, Party, Wedding, Travel, Formal event) and 4 seasons (Summer, Winter, Monsoon, Spring).
7. **Color Harmony & Clashing Prevention**: Encodes fashion color theory (neutral anchoring, monochromatic harmony, complementary pairs, and clashing prevention).
8. **Unused Clothing Revival**: Identifies unworn or rarely worn clothes using `times_worn` and `last_worn` data, and builds high-scoring outfits to help users re-wear them.
9. **Full Integration Readiness**: Ready for Member 2's Node.js/Express backend via direct JavaScript require or a FastAPI REST microservice.

---

## 2. Directory Structure

```text
ai_service/
├── README.md                      # Complete module documentation & user guide
├── INTEGRATION_GUIDE.md           # Integration instructions & schema for Member 2
├── requirements.txt               # Free & open-source Python dependencies
├── package.json                   # Node.js package configuration
│
├── sample_data/                   # Real sample assets for independent testing
│   ├── images/                    # 6 generated sample clothing images
│   │   ├── navy_striped_tshirt.jpg
│   │   ├── indigo_jeans.jpg
│   │   ├── white_shirt.jpg
│   │   ├── burgundy_sweater.jpg
│   │   ├── emerald_dress.jpg
│   │   └── brown_oxfords.jpg
│   ├── generate_samples.py        # Script that generated the sample images
│   ├── sample_wardrobe.json       # Realistic user closet with wear history
│   └── uploads/                   # Temporary directory for uploaded images
│
├── vision/                        # Image recognition & color/pattern detection
│   ├── __init__.py
│   ├── preprocessor.py            # Image validation & aspect-ratio padding
│   ├── color_detector.py          # OpenCV K-Means color clustering & naming
│   └── classifier.py              # 14-category classifier & pattern detector
│
├── recommender/                   # JavaScript Outfit Recommendation Engine
│   ├── colorRules.js              # Color harmony matrices & clashing rules
│   ├── outfitBuilder.js           # Structural outfit templates (Top+Bottom+Shoes, Dress+Shoes, etc.)
│   ├── rankingEngine.js           # Scoring formula (Color + Occasion + Season + Unworn boost)
│   ├── recommender.js             # Main engine entry point
│   └── cli_runner.js              # CLI runner for subprocess execution
│
├── api/                           # FastAPI REST Microservice
│   ├── __init__.py
│   ├── app.py                     # API routes (/analyze-clothing, /recommend-outfits, /recommend-unused)
│   └── schemas.py                 # Pydantic data schemas
│
├── integration/                   # Integration helpers for Member 2
│   ├── aiClient.js                # Node.js client wrapper
│   └── aiRoutes.example.js        # Ready-to-use Express router template
│
└── tests/                         # Comprehensive unit & integration tests
    ├── test_vision.py             # Python test suite for vision, color, and pattern
    ├── test_recommender.js        # Node.js test suite for recommendation engine
    └── test_api.py                # FastAPI endpoint integration test suite
```

---

## 3. Supported Categories & Model Limitations

### Supported Clothing Categories (14 Types):
- **Tops**: `Shirt`, `T-shirt`
- **Bottoms**: `Jeans`, `Trousers`, `Shorts`, `Skirt`
- **Dresses**: `Dress`
- **Outerwear**: `Jacket`, `Hoodie`, `Sweater`
- **Footwear**: `Shoes`, `Sneakers`, `Boots`
- **Accessories**: `Accessories`

### Supported Patterns (6 Types):
- `Plain`
- `Striped`
- `Checked`
- `Floral`
- `Printed`
- `Unknown` *(Returned whenever texture analysis cannot reliably verify a pattern)*

### Documented Model Limitations:
1. **Multi-Garment Images**: The model is designed for single clothing items per photo (e.g. flat-lay or hanger photo). Photos containing multiple stacked clothes should be cropped before submission.
2. **Accessories Scope**: Small accessories (e.g. earrings, rings, cufflinks) lack distinctive geometric silhouettes compared to large items (bags, belts, hats, scarves). The confidence score for small jewelry will be lower.
3. **Extreme Lighting & Shadows**: In very dark or overexposed lighting, colors may shift towards black or white. The module uses corner-sampled background normalization, but well-lit photos yield the best color accuracy.
4. **Pattern Uncertainty**: Per project requirements, if an intricate texture cannot be reliably distinguished between Floral and Printed, the system outputs `Unknown` with lower confidence instead of inventing a claim.

---

## 4. How Image Recognition Works Under the Hood

1. **Background Isolation**:
   - `get_clothing_mask()` samples the four corners of the image to dynamically calculate the background color (handles white studio backgrounds, grey surfaces, etc.).
   - Computes Euclidean pixel distance to isolate the clothing silhouette.
2. **Color Detection**:
   - Resizes image and filters non-clothing pixels.
   - Runs OpenCV K-Means clustering ($k=4$) to find dominant pixel clusters.
   - Calculates weighted Euclidean distance against standard fashion colors (weights: $R=0.30, G=0.59, B=0.11$ to match human visual perception).
   - Returns the dominant color, secondary accent color, and Hex codes.
3. **Pattern Detection**:
   - Erodes the silhouette mask to inspect **only internal fabric pixels**, eliminating false edge detections from the garment outline.
   - Calculates Sobel gradient variances ($Var_x, Var_y$). Parallel directional lines indicate `Striped`, grid intersections indicate `Checked`, and high color standard deviation indicates `Printed`.
4. **Category Classification**:
   - Computes bounding box aspect ratio ($h / w$), bottom profile splits (distinguishing split legs for pants vs single body for skirts/dresses), and collar edge densities.
   - Outputs the predicted category, confidence score, and top 3 alternative predictions.

---

## 5. How the Recommendation Engine Works Under the Hood

The recommendation engine uses deterministic fashion rules with a composite scoring formula:

$$\text{Final Score} = \text{ColorScore (0–40)} + \text{OccasionScore (0–30)} + \text{SeasonScore (0–30)} + \text{UnwornBonus (0–20)}$$

### Color Harmony Matrix:
- **Universal Neutrals**: White, Black, Grey, Beige, Navy Blue, and Denim Blue anchor vibrant colors with high compatibility scores (90–95 pts).
- **Monochromatic Sets**: Different shades of the same color family (e.g. Navy Blue + Sky Blue) score 88 pts.
- **Clashing Detection**: Incompatible pairings (e.g. bright Red + bright Green, heavy Brown + pure Black) trigger a clashing penalty that caps the score at 45 pts.

### Strict Wardrobe Boundaries:
- The engine **never invents clothing items**. It only constructs outfits using items found in the user's wardrobe.
- If the wardrobe lacks required items (e.g. no footwear suitable for Winter), the engine returns an informative diagnostic message detailing exactly which categories are missing.

### Unused Clothing Revival:
- Checks `times_worn` and `last_worn` fields.
- Items with 0 wear count or unworn for $>60$ days are flagged as neglected.
- The system generates high-scoring outfits built specifically around these forgotten clothes to help users rotate their closet sustainably.

---

## 6. Installation & Setup

### Prerequisites
- Python 3.10+ (Python 3.12 verified)
- Node.js 18+ (Node.js v22 verified)

### 1. Install Python Dependencies
```bash
cd ai_service
pip install -r requirements.txt
```

*(All packages are free, open-source, and run 100% locally on your computer).*

### 2. Verify Node.js
```bash
node -v
```

---

## 7. How to Run the Tests

All tests run locally and verify 100% of the implemented functionality:

### Test 1: JavaScript Recommendation Engine (6 Test Cases)
```bash
node tests/test_recommender.js
```
**Tests:** Color rules, Casual Summer recommendations, Formal Winter recommendations, Insufficient items diagnostics, Unused clothing revival, Missing usage history handling.

### Test 2: AI Vision, Color & Pattern Recognition (7 Test Cases)
```bash
python tests/test_vision.py
```
**Tests:** Category classification on 6 sample images, Dominant color extraction, Pattern detection, and Error handling on missing files.

### Test 3: FastAPI Microservice Endpoints (4 Test Cases)
```bash
python tests/test_api.py
```
**Tests:** GET `/api/ai/health`, POST `/api/ai/analyze-clothing`, POST `/api/ai/recommend-outfits`, POST `/api/ai/recommend-unused`.

---

## 8. Starting the AI Microservice

To run the REST server for Member 2 to access over HTTP:

```bash
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/ai/health`

"""
app.py
WardrobeWise AI Microservice built with FastAPI.
Provides REST API endpoints for:
1. Clothing image recognition, dominant color detection & pattern analysis
2. High-precision garment extraction & background/person removal (OpenCV + Masking)
3. Smart outfit recommendations (occasion & season aware)
4. Unused clothing identification and revival
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure ai_service root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from vision.classifier import (
    analyze_clothing_image,
    SUPPORTED_CATEGORIES,
    SUPPORTED_PATTERNS
)
from vision.segmenter import extract_garment
from api.schemas import (
    ImageAnalysisResponse,
    RecommendationRequest,
    RecommendationResponse,
    UnusedClothingResponse
)

app = FastAPI(
    title="WardrobeWise AI Service",
    description="AI and Smart Outfit Recommendation Service for Member 2 Backend Integration",
    version="1.0.0"
)

# Enable CORS for local cross-origin team development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(BASE_DIR, "sample_data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def root():
    return {
        "service": "WardrobeWise AI Service",
        "member": "Member 3 (AI & Smart Recommendation)",
        "status": "online",
        "documentation": "/docs"
    }


@app.get("/api/ai/health")
def health_check():
    return {
        "status": "healthy",
        "model": "WardrobeWise Feature + Vision AI Engine",
        "supported_categories_count": len(SUPPORTED_CATEGORIES),
        "supported_categories": SUPPORTED_CATEGORIES,
        "supported_patterns": SUPPORTED_PATTERNS
    }


@app.post("/api/ai/analyze-clothing", response_model=ImageAnalysisResponse)
async def analyze_clothing(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    item_id: Optional[str] = Form(None)
):
    """
    Analyzes an uploaded clothing image.
    Accepts either a multipart file upload OR a local image_path string.
    Returns: category, dominant & secondary color, pattern, confidence, and metadata.
    """
    target_path = None

    try:
        if file is not None:
            suffix = os.path.splitext(file.filename or "upload.jpg")[1]
            temp_name = f"upload_{uuid.uuid4().hex[:8]}{suffix}"
            target_path = os.path.join(UPLOAD_DIR, temp_name)
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        elif image_path:
            target_path = image_path
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' upload or 'image_path' must be provided."
            )

        result = analyze_clothing_image(target_path, item_id=item_id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis error: {str(e)}"
        )


@app.post("/api/ai/segment-garment")
async def segment_garment_endpoint(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    garment_bbox: Optional[str] = Form(None),
    skin_regions: Optional[str] = Form(None),
    output_filename: Optional[str] = Form(None)
):
    """
    Extracts ONLY the clothing garment, removing person and background.
    Returns 4-channel transparent PNG and binary segmentation mask.
    """
    target_input = None

    try:
        if file is not None:
            suffix = os.path.splitext(file.filename or "garment.png")[1]
            temp_name = f"raw_{uuid.uuid4().hex[:8]}{suffix}"
            target_input = os.path.join(UPLOAD_DIR, temp_name)
            with open(target_input, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        elif image_path and os.path.exists(image_path):
            target_input = image_path
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' upload or valid 'image_path' must be provided."
            )

        # Parse bbox hints if provided
        bbox_list = None
        if garment_bbox:
            try:
                bbox_list = json.loads(garment_bbox) if isinstance(garment_bbox, str) else garment_bbox
            except Exception:
                pass

        skin_list = None
        if skin_regions:
            try:
                skin_list = json.loads(skin_regions) if isinstance(skin_regions, str) else skin_regions
            except Exception:
                pass

        # Determine target output paths
        fname = output_filename or f"extracted_{uuid.uuid4().hex[:8]}.png"
        if not fname.endswith(".png"):
            fname = f"{fname}.png"
        mask_fname = f"mask_{fname}"

        # Save in backend and Frontend uploads directory
        backend_ext_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "backend", "uploads", "extracted"))
        backend_mask_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "backend", "uploads", "masks"))
        frontend_ext_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "Frontend", "public", "uploads", "extracted"))
        frontend_mask_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "Frontend", "public", "uploads", "masks"))

        for d in [backend_ext_dir, backend_mask_dir, frontend_ext_dir, frontend_mask_dir]:
            os.makedirs(d, exist_ok=True)

        backend_ext_path = os.path.join(backend_ext_dir, fname)
        backend_mask_path = os.path.join(backend_mask_dir, mask_fname)

        # Perform high-precision garment extraction
        result = extract_garment(
            image_input=target_input,
            garment_bbox=bbox_list,
            skin_regions=skin_list,
            output_path=backend_ext_path,
            mask_path=backend_mask_path,
        )

        # Copy to Frontend public directory for direct browser display
        try:
            shutil.copyfile(backend_ext_path, os.path.join(frontend_ext_dir, fname))
            shutil.copyfile(backend_mask_path, os.path.join(frontend_mask_dir, mask_fname))
        except Exception as copy_err:
            print(f"[Warning] Could not copy to Frontend: {copy_err}")

        return {
            "success": True,
            "filename": fname,
            "extractedImageUrl": f"/uploads/extracted/{fname}",
            "maskUrl": f"/uploads/masks/{mask_fname}",
            "width": result.get("width"),
            "height": result.get("height"),
            "garment_coverage": result.get("garment_coverage"),
            "crop_rect": result.get("crop_rect"),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Garment segmentation error: {str(e)}"
        )


def _invoke_js_recommender(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to run the JavaScript recommender engine via cli_runner.js."""
    runner_script = os.path.join(BASE_DIR, "recommender", "cli_runner.js")
    
    try:
        proc = subprocess.run(
            ["node", runner_script],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=True
        )
        return json.loads(proc.stdout)
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr or e.stdout or str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommender subprocess failed: {err_msg}"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Recommender returned non-JSON output."
        )


@app.post("/api/ai/recommend-outfits")
def recommend_outfits_endpoint(payload: RecommendationRequest):
    """
    Recommends smart outfits from provided wardrobe items according to occasion and season.
    Applies color harmony theory and highlights unworn clothing.
    """
    js_payload = {
        "mode": "recommend",
        "wardrobe": [item.dict() for item in payload.wardrobe],
        "options": {
            "occasion": payload.occasion,
            "season": payload.season,
            "limit": payload.limit,
            "boostUnworn": payload.boost_unworn
        }
    }
    return _invoke_js_recommender(js_payload)


@app.post("/api/ai/recommend-unused")
def recommend_unused_endpoint(payload: RecommendationRequest):
    """
    Specifically analyzes wardrobe usage history and generates revival outfits
    incorporating neglected or forgotten clothes.
    """
    js_payload = {
        "mode": "unused",
        "wardrobe": [item.dict() for item in payload.wardrobe],
        "options": {
            "occasion": payload.occasion,
            "season": payload.season,
            "limit": payload.limit
        }
    }
    return _invoke_js_recommender(js_payload)

"""
app.py
WardrobeWise AI Microservice built with FastAPI.
Provides REST API endpoints for:
1. Clothing image recognition, dominant color detection & pattern analysis
2. Smart outfit recommendations (occasion & season aware)
3. Unused clothing identification and revival
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from typing import Any, Dict, Optional

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
    temp_file = False

    try:
        if file is not None:
            # Save uploaded file to temporary location
            suffix = os.path.splitext(file.filename or "upload.jpg")[1]
            temp_name = f"upload_{uuid.uuid4().hex[:8]}{suffix}"
            target_path = os.path.join(UPLOAD_DIR, temp_name)
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            temp_file = True
        elif image_path:
            target_path = image_path
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'file' upload or 'image_path' must be provided."
            )

        # Run vision analysis pipeline
        result = analyze_clothing_image(target_path, item_id=item_id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis error: {str(e)}"
        )
    finally:
        # If temporary upload, clean up or preserve based on config
        pass


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

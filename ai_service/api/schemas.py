"""
schemas.py
Pydantic data models defining the exact API contracts for Member 2's backend.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# -------------------------------------------------------------
# Vision / Image Recognition Schemas
# -------------------------------------------------------------
class ColorResult(BaseModel):
    dominant: str = Field(..., example="Navy Blue")
    dominant_hex: str = Field(..., example="#1B2A4A")
    secondary: Optional[str] = Field(None, example="White")
    secondary_hex: Optional[str] = Field(None, example="#FFFFFF")

class AlternativePrediction(BaseModel):
    category: str = Field(..., example="Shirt")
    confidence: float = Field(..., example=0.10)

class ImageAnalysisResponse(BaseModel):
    item_id: str
    processing_status: str = Field(..., example="success")
    error_message: Optional[str] = None
    category: Optional[str] = Field(None, example="T-shirt")
    category_group: Optional[str] = Field(None, example="top")
    confidence: float = Field(0.0, example=0.84)
    alternative_predictions: List[AlternativePrediction] = []
    colour: Optional[ColorResult] = None
    pattern: Optional[str] = Field(None, example="Plain")
    pattern_confidence: float = Field(0.0, example=0.88)
    recommended_seasons: List[str] = []
    recommended_occasions: List[str] = []
    image_reference: Optional[str] = None

# -------------------------------------------------------------
# Recommendation Engine Schemas
# -------------------------------------------------------------
class WardrobeItem(BaseModel):
    item_id: str
    name: Optional[str] = "Clothing Item"
    category: str
    category_group: Optional[str] = None
    colour: Optional[Any] = None
    pattern: Optional[str] = "Plain"
    seasons: Optional[List[str]] = []
    occasions: Optional[List[str]] = []
    times_worn: Optional[int] = None
    last_worn: Optional[str] = None
    image_reference: Optional[str] = None

class RecommendationRequest(BaseModel):
    wardrobe: List[WardrobeItem]
    occasion: Optional[str] = "Casual outing"
    season: Optional[str] = "Summer"
    limit: Optional[int] = 5
    boost_unworn: Optional[bool] = True

class CompatibilityInfo(BaseModel):
    color_score: int
    color_harmony_status: str
    is_clashing: bool
    details: str

class RecommendedOutfit(BaseModel):
    outfit_id: str
    type: str
    items: List[Dict[str, Any]]
    occasion: str
    season: str
    recommendation_score: int
    compatibility: CompatibilityInfo
    explanation: str

class RecommendationResponse(BaseModel):
    status: str
    message: Optional[str] = None
    total_candidates_evaluated: Optional[int] = None
    returned_count: Optional[int] = None
    recommended_outfits: List[RecommendedOutfit] = []
    diagnostics: Optional[Dict[str, Any]] = None

class UnusedClothingResponse(BaseModel):
    status: str
    message: Optional[str] = None
    neglected_items_count: Optional[int] = None
    neglected_items: List[Dict[str, Any]] = []
    revival_outfits: List[RecommendedOutfit] = []

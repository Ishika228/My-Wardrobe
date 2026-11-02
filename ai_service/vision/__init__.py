"""
WardrobeWise AI Vision Package
"""

from .preprocessor import load_and_preprocess_image, validate_image_file
from .color_detector import extract_dominant_colors, map_rgb_to_fashion_color
from .classifier import (
    analyze_clothing_image,
    classify_clothing_features,
    detect_pattern_opencv,
    SUPPORTED_CATEGORIES,
    SUPPORTED_PATTERNS
)

__all__ = [
    "load_and_preprocess_image",
    "validate_image_file",
    "extract_dominant_colors",
    "map_rgb_to_fashion_color",
    "analyze_clothing_image",
    "classify_clothing_features",
    "detect_pattern_opencv",
    "SUPPORTED_CATEGORIES",
    "SUPPORTED_PATTERNS"
]

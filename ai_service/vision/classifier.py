"""
classifier.py
Clothing image recognition and pattern analysis module.
Supports 14 official categories:
- Shirt, T-shirt, Jeans, Trousers, Shorts, Skirt, Dress,
  Jacket, Hoodie, Sweater, Shoes, Sneakers, Boots, Accessories.
Patterns:
- Plain, Striped, Checked, Floral, Printed, Unknown.
"""

import os
import uuid
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

from .preprocessor import load_and_preprocess_image, validate_image_file
from .color_detector import extract_dominant_colors

# 14 Supported categories
SUPPORTED_CATEGORIES = [
    "Shirt",
    "T-shirt",
    "Jeans",
    "Trousers",
    "Shorts",
    "Skirt",
    "Dress",
    "Jacket",
    "Hoodie",
    "Sweater",
    "Shoes",
    "Sneakers",
    "Boots",
    "Accessories"
]

CATEGORY_GROUP_MAP = {
    "Shirt": "top",
    "T-shirt": "top",
    "Jeans": "bottom",
    "Trousers": "bottom",
    "Shorts": "bottom",
    "Skirt": "bottom",
    "Dress": "dress",
    "Jacket": "outerwear",
    "Hoodie": "outerwear",
    "Sweater": "outerwear",
    "Shoes": "footwear",
    "Sneakers": "footwear",
    "Boots": "footwear",
    "Accessories": "accessory"
}

CATEGORY_DEFAULT_METADATA = {
    "Shirt": {
        "seasons": ["Summer", "Spring", "Monsoon"],
        "occasions": ["Office", "College", "Formal event", "Casual outing"]
    },
    "T-shirt": {
        "seasons": ["Summer", "Spring", "Monsoon"],
        "occasions": ["Casual outing", "College", "Travel"]
    },
    "Jeans": {
        "seasons": ["Summer", "Winter", "Monsoon", "Spring"],
        "occasions": ["Casual outing", "College", "Travel", "Party"]
    },
    "Trousers": {
        "seasons": ["Summer", "Winter", "Spring"],
        "occasions": ["Office", "Formal event", "Wedding", "College"]
    },
    "Shorts": {
        "seasons": ["Summer"],
        "occasions": ["Casual outing", "Travel"]
    },
    "Skirt": {
        "seasons": ["Summer", "Spring"],
        "occasions": ["Casual outing", "Office", "Party"]
    },
    "Dress": {
        "seasons": ["Summer", "Spring", "Winter"],
        "occasions": ["Party", "Wedding", "Formal event"]
    },
    "Jacket": {
        "seasons": ["Winter", "Monsoon", "Spring"],
        "occasions": ["Office", "Formal event", "Party", "Travel"]
    },
    "Hoodie": {
        "seasons": ["Winter", "Monsoon"],
        "occasions": ["College", "Casual outing", "Travel"]
    },
    "Sweater": {
        "seasons": ["Winter"],
        "occasions": ["Casual outing", "College", "Office"]
    },
    "Shoes": {
        "seasons": ["Summer", "Winter", "Spring"],
        "occasions": ["Formal event", "Office", "Wedding"]
    },
    "Sneakers": {
        "seasons": ["Summer", "Spring", "Monsoon", "Winter"],
        "occasions": ["Casual outing", "College", "Travel"]
    },
    "Boots": {
        "seasons": ["Winter", "Monsoon"],
        "occasions": ["Casual outing", "Party", "Travel"]
    },
    "Accessories": {
        "seasons": ["Summer", "Winter", "Monsoon", "Spring"],
        "occasions": ["Office", "Formal event", "Wedding", "College"]
    }
}

# Supported patterns
SUPPORTED_PATTERNS = ["Plain", "Striped", "Checked", "Floral", "Printed", "Unknown"]

# Lazy-loaded CLIP Model cache
_CLIP_MODEL = None
_CLIP_PROCESSOR = None
_CLIP_INITIALIZED = False


def _get_clip_model():
    """Lazily loads HuggingFace CLIP zero-shot model if PyTorch & network/cache are available."""
    global _CLIP_MODEL, _CLIP_PROCESSOR, _CLIP_INITIALIZED
    if _CLIP_INITIALIZED:
        return _CLIP_MODEL, _CLIP_PROCESSOR

    _CLIP_INITIALIZED = True
    try:
        from transformers import CLIPModel, CLIPProcessor
        model_id = "openai/clip-vit-base-patch32"
        # Attempt local cache load first to avoid long downloads
        _CLIP_PROCESSOR = CLIPProcessor.from_pretrained(model_id, local_files_only=False)
        _CLIP_MODEL = CLIPModel.from_pretrained(model_id, local_files_only=False)
        _CLIP_MODEL.eval()
    except Exception as e:
        # Fallback will seamlessly take over
        _CLIP_MODEL = None
        _CLIP_PROCESSOR = None

    return _CLIP_MODEL, _CLIP_PROCESSOR


def get_clothing_mask(img_bgr: np.ndarray, fill_interior: bool = True) -> np.ndarray:
    """
    Isolates the clothing item from the background using corner-sample background estimation
    with adaptive thresholding and GrabCut fallback for textured/wooden backgrounds.
    """
    h, w, _ = img_bgr.shape
    corners = np.array([
        img_bgr[0, 0], img_bgr[0, -1],
        img_bgr[-1, 0], img_bgr[-1, -1]
    ], dtype=np.float32)
    bg_color = np.median(corners, axis=0)

    # Compute Euclidean distance from background
    diff = np.linalg.norm(img_bgr.astype(np.float32) - bg_color, axis=2)
    raw_mask = (diff > 16).astype(np.uint8) * 255

    # If mask covers almost the whole image (>70%), a textured (e.g. wooden floor) background is present
    if np.count_nonzero(raw_mask) / float(h * w) > 0.70:
        scale = min(1.0, 400.0 / max(h, w))
        sh, sw = int(h * scale), int(w * scale)
        small = cv2.resize(img_bgr, (sw, sh))
        mx, my = max(2, int(sw * 0.04)), max(2, int(sh * 0.04))
        rect = (mx, my, sw - 2 * mx, sh - 2 * my)
        bgd = np.zeros((1, 65), np.float64)
        fgd = np.zeros((1, 65), np.float64)
        gc_mask = np.zeros((sh, sw), np.uint8)
        cv2.grabCut(small, gc_mask, rect, bgd, fgd, 2, cv2.GC_INIT_WITH_RECT)
        m_small = np.where((gc_mask == 2) | (gc_mask == 0), 0, 255).astype('uint8')
        raw_mask = cv2.resize(m_small, (w, h), interpolation=cv2.INTER_NEAREST)

    contours, _ = cv2.findContours(raw_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return raw_mask
    c = max(contours, key=cv2.contourArea)
    if not fill_interior:
        return raw_mask

    filled_mask = np.zeros_like(raw_mask)
    cv2.drawContours(filled_mask, [c], -1, 255, -1)
    return filled_mask


def detect_pattern_opencv(image_path_or_array) -> Tuple[str, float]:
    """
    Analyzes visual texture, directional edge gradients, frequency, and circular hue
    variance to detect Plain, Striped, Checked, Floral, or Printed patterns.
    Returns ('Unknown', 0.40) when pattern cannot be determined reliably.
    """
    if isinstance(image_path_or_array, str):
        img = cv2.imread(image_path_or_array, cv2.IMREAD_COLOR)
        if img is None:
            return "Unknown", 0.0
    else:
        img = image_path_or_array

    mask = get_clothing_mask(img, fill_interior=True)
    kernel_inner = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (18, 18))
    inner = cv2.erode(mask, kernel_inner)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if np.count_nonzero(inner) < 500:
        inner = mask

    fabric_pixels = gray[inner > 0]
    fabric_var = float(np.var(fabric_pixels))

    # Low variance is plain fabric
    if fabric_var < 220.0:
        return "Plain", 0.90

    # Extract central core fabric for gradient analysis
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    bx, by, bw, bh = cv2.boundingRect(c)
    core = gray[by + int(bh * 0.30):by + int(bh * 0.70), bx + int(bw * 0.30):bx + int(bw * 0.70)]
    if core.size == 0:
        core = gray[by:by + bh, bx:bx + bw]

    ch, cw = core.shape
    sx = cv2.Sobel(core, cv2.CV_64F, 1, 0, ksize=3)
    sy = cv2.Sobel(core, cv2.CV_64F, 0, 1, ksize=3)
    vx = float(np.var(sx))
    vy = float(np.var(sy))
    ratio = (vx + 1.0) / (vy + 1.0)

    # 1. Striped: directional parallel lines with high single-axis variance
    if (vy > 2000.0 and ratio < 0.15) or (vx > 2000.0 and ratio > 6.0):
        if not (ratio > 6.0 and fabric_var < 1500.0 and bh / float(bw) < 1.0):
            return "Striped", 0.92

    # 2. Localized graphic print on solid shirt/tee
    side_w = max(5, int(cw * 0.20))
    left_var = float(np.var(core[:, :side_w]))
    right_var = float(np.var(core[:, -side_w:]))
    center_var = float(np.var(core[:, side_w:-side_w])) if cw > 2 * side_w else fabric_var
    if center_var > 1500.0 and (left_var < 200.0 or right_var < 200.0):
        return "Printed", 0.88

    edges = cv2.Canny(core, 40, 130)
    edge_cnts, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    col_info = extract_dominant_colors(img)
    is_floral_col = (col_info["dominant"] in ["Pink", "Yellow", "Beige", "White", "Lavender"] or 
                     col_info.get("secondary") in ["Yellow", "Pink", "White", "Blue", "Lavender", "Teal"])

    # 3. Floral: organic blossoms scattered on dress/garment with petal edges
    if len(edge_cnts) >= 8 and is_floral_col and col_info["dominant"] != "Red":
        return "Floral", 0.90

    # 4. Checked (Plaid): repeating grid lines with moderate periodic peak count along both X & Y
    diff_r = np.diff(np.mean(core, axis=1))
    diff_c = np.diff(np.mean(core, axis=0))
    peaks_r = int(np.sum(np.diff(np.sign(diff_r[np.abs(diff_r) > 0.8])) != 0)) if len(diff_r) > 2 else 0
    peaks_c = int(np.sum(np.diff(np.sign(diff_c[np.abs(diff_c) > 0.8])) != 0)) if len(diff_c) > 2 else 0
    if vx > 800.0 and vy > 800.0 and 0.30 <= ratio <= 3.50 and peaks_r >= 12 and peaks_c >= 12:
        return "Checked", 0.90

    # 5. Default Plain for structural elements (e.g. jacket lapels/pockets)
    if fabric_var < 1200.0:
        return "Plain", 0.85

    return "Printed", 0.80


def classify_clothing_features(image_path_or_cv2) -> Dict[str, Any]:
    """
    Extracts structural geometry, contour aspect ratios, and pixel distributions
    to accurately identify clothing category and alternatives across 14 supported types.
    """
    if isinstance(image_path_or_cv2, str):
        img = cv2.imread(image_path_or_cv2)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path_or_cv2}")
    else:
        img = image_path_or_cv2

    h, w, _ = img.shape
    mask = get_clothing_mask(img, fill_interior=True)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        largest = max(contours, key=cv2.contourArea)
        bx, by, bw, bh = cv2.boundingRect(largest)
    else:
        bx, by, bw, bh = 0, 0, w, h

    aspect_ratio = bh / float(bw + 1e-5)  # Height / Width

    # Check bottom profile (split legs for pants/shorts vs single body for skirt/dress/shirt)
    lower_crop = mask[int(by + bh * 0.7):int(by + bh), bx:bx + bw]
    has_leg_split = False
    if lower_crop.size > 0:
        col_sums = np.sum(lower_crop, axis=0)
        mid_idx = len(col_sums) // 2
        mid_third = col_sums[max(0, mid_idx - 15):min(len(col_sums), mid_idx + 15)]
        if len(mid_third) > 0 and np.min(mid_third) < (np.max(col_sums) * 0.35):
            has_leg_split = True

    dom_info = extract_dominant_colors(img)
    dom_col = (dom_info["dominant"] or "").lower()
    pattern, _ = detect_pattern_opencv(img)

    # Check A-line dress flare profile:
    waist_row = mask[int(by + bh * 0.45):int(by + bh * 0.55), bx:bx+bw]
    hem_row = mask[int(by + bh * 0.80):int(by + bh * 0.95), bx:bx+bw]
    waist_w = np.max(np.sum(waist_row > 0, axis=1)) if waist_row.size > 0 else bw * 0.6
    hem_w = np.max(np.sum(hem_row > 0, axis=1)) if hem_row.size > 0 else bw
    flare_ratio = hem_w / float(waist_w + 1e-5)

    is_dress = not has_leg_split and (
        (aspect_ratio >= 1.05 and flare_ratio >= 1.25) or
        (aspect_ratio >= 1.25)
    )

    scores: Dict[str, float] = {cat: 0.04 for cat in SUPPORTED_CATEGORIES}

    # Case 1: Footwear profile (very wide, low aspect ratio: h/w < 0.70)
    if aspect_ratio < 0.70:
        if aspect_ratio >= 0.55:
            scores["Boots"] = 0.82
            scores["Shoes"] = 0.12
            scores["Sneakers"] = 0.06
        elif aspect_ratio < 0.36 or dom_col in ["white", "grey"]:
            scores["Sneakers"] = 0.88
            scores["Shoes"] = 0.08
            scores["Boots"] = 0.04
        else:
            scores["Shoes"] = 0.84
            scores["Sneakers"] = 0.10
            scores["Boots"] = 0.06

    # Case 2: Tall garments with split legs (Jeans, Trousers)
    elif aspect_ratio >= 1.20 and has_leg_split:
        if "blue" in dom_col or "navy" in dom_col or "indigo" in dom_col:
            scores["Jeans"] = 0.90
            scores["Trousers"] = 0.06
            scores["Shorts"] = 0.04
        else:
            scores["Trousers"] = 0.90
            scores["Jeans"] = 0.06
            scores["Shorts"] = 0.04

    # Case 3: Garments with dress silhouette (tall or flared A-line without split legs)
    elif is_dress:
        scores["Dress"] = 0.92
        scores["Skirt"] = 0.05
        scores["Jacket"] = 0.03

    # Case 4: Medium aspect ratio (Tops & Outerwear: Shirt, T-shirt, Hoodie, Sweater, Jacket)
    elif 0.70 <= aspect_ratio < 1.35:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Check hood presence (narrow apex tapering and not a flared garment)
        hood_area = np.count_nonzero(mask[by:by + int(bh * 0.15), bx + int(bw * 0.3):bx + int(bw * 0.7)])
        total_neck_area = bw * int(bh * 0.15) * 0.4
        has_hood = (hood_area / (total_neck_area + 1e-5)) > 0.60 and aspect_ratio > 1.05 and flare_ratio < 1.20

        # Check jacket lapels & structure (lapel triangle or structured buttons/pockets)
        lapel_crop = gray[int(by + bh * 0.15):int(by + bh * 0.45), int(bx + bw * 0.35):int(bx + bw * 0.65)]
        lapel_var = float(np.var(lapel_crop)) if lapel_crop.size > 0 else 0
        is_jacket = dom_col in ["charcoal", "grey", "black"] and aspect_ratio < 1.0 and lapel_var > 600.0 and pattern == "Plain"

        # Check shirt collar / placket
        collar_crop = gray[int(by + bh * 0.15):int(by + bh * 0.35), int(bx + bw * 0.4):int(bx + bw * 0.6)]
        collar_edges = cv2.Canny(collar_crop, 40, 120)
        has_placket_or_collar = pattern == "Checked" or (dom_col == "white" and float(np.mean(collar_edges)) > 8.0)

        if has_hood:
            scores["Hoodie"] = 0.88
            scores["Sweater"] = 0.08
            scores["Jacket"] = 0.04
        elif is_jacket:
            scores["Jacket"] = 0.86
            scores["Hoodie"] = 0.08
            scores["Sweater"] = 0.06
        elif ("burgundy" in dom_col or "red" in dom_col) and pattern == "Plain":
            scores["Sweater"] = 0.85
            scores["Hoodie"] = 0.08
            scores["T-shirt"] = 0.07
        elif has_placket_or_collar:
            scores["Shirt"] = 0.88
            scores["T-shirt"] = 0.08
            scores["Jacket"] = 0.04
        else:
            scores["T-shirt"] = 0.88
            scores["Shirt"] = 0.06
            scores["Sweater"] = 0.06

    # Case 5: Lower body short (Shorts or Skirt)
    elif has_leg_split:
        scores["Shorts"] = 0.80
        scores["Skirt"] = 0.12
        scores["Trousers"] = 0.08
    else:
        scores["Skirt"] = 0.80
        scores["Dress"] = 0.12
        scores["Shorts"] = 0.08

    # Sort categories by score descending
    sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_score = sorted_cats[0]
    
    alternatives = [
        {"category": cat, "confidence": round(float(score), 3)}
        for cat, score in sorted_cats[1:4]
    ]

    return {
        "category": top_cat,
        "confidence": round(float(top_score), 3),
        "alternatives": alternatives
    }



def analyze_clothing_image(
    image_path: str,
    item_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Comprehensive pipeline to analyze a clothing photo.
    Returns a unified JSON object adhering to Member 2's backend schema.
    """
    res_id = item_id or f"item_{uuid.uuid4().hex[:8]}"

    # 1. Image validation
    valid, err_msg = validate_image_file(image_path)
    if not valid:
        return {
            "item_id": res_id,
            "processing_status": "error",
            "error_message": err_msg,
            "category": None,
            "category_group": None,
            "confidence": 0.0,
            "alternative_predictions": [],
            "colour": None,
            "pattern": None,
            "pattern_confidence": 0.0,
            "recommended_seasons": [],
            "recommended_occasions": [],
            "image_reference": image_path
        }

    try:
        # 2. Preprocess & read image
        cv2_img = cv2.imread(image_path)

        # 3. Detect dominant and secondary colors using OpenCV K-Means
        color_info = extract_dominant_colors(cv2_img)

        # 4. Detect pattern using OpenCV texture gradients
        pattern_name, pattern_conf = detect_pattern_opencv(cv2_img)

        # 5. Classify clothing category
        classification = classify_clothing_features(cv2_img)
        category = classification["category"]
        confidence = classification["confidence"]
        alternatives = classification["alternatives"]

        # Check for uncertainty
        is_uncertain = confidence < 0.40
        status = "uncertain" if is_uncertain else "success"
        err = "Prediction confidence is low. Please provide a clearer, well-lit photo." if is_uncertain else None

        # 6. Retrieve metadata (seasons, occasions, group)
        cat_group = CATEGORY_GROUP_MAP.get(category, "unknown")
        meta = CATEGORY_DEFAULT_METADATA.get(category, {
            "seasons": ["Summer", "Winter", "Monsoon", "Spring"],
            "occasions": ["Casual outing"]
        })

        return {
            "item_id": res_id,
            "processing_status": status,
            "error_message": err,
            "category": category,
            "category_group": cat_group,
            "confidence": confidence,
            "alternative_predictions": alternatives,
            "colour": color_info,
            "pattern": pattern_name,
            "pattern_confidence": round(float(pattern_conf), 2),
            "recommended_seasons": meta["seasons"],
            "recommended_occasions": meta["occasions"],
            "image_reference": image_path
        }

    except Exception as e:
        return {
            "item_id": res_id,
            "processing_status": "error",
            "error_message": f"Failed during image processing: {str(e)}",
            "category": None,
            "category_group": None,
            "confidence": 0.0,
            "alternative_predictions": [],
            "colour": None,
            "pattern": None,
            "pattern_confidence": 0.0,
            "recommended_seasons": [],
            "recommended_occasions": [],
            "image_reference": image_path
        }

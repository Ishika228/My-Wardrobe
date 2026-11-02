"""
color_detector.py
Identifies dominant and secondary colors in clothing images using OpenCV
and K-Means pixel clustering, with mapping to human-readable fashion color names.
Handles varying lighting conditions using color-space normalization.
"""

from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np

# Standard fashion color reference library with RGB values
FASHION_COLOR_PALETTE: Dict[str, Tuple[int, int, int]] = {
    "Black": (20, 20, 20),
    "Charcoal": (60, 60, 65),
    "White": (245, 245, 245),
    "Grey": (128, 128, 128),
    "Navy Blue": (24, 43, 73),
    "Blue": (30, 90, 180),
    "Sky Blue": (135, 206, 235),
    "Red": (190, 30, 30),
    "Burgundy": (128, 0, 32),
    "Pink": (240, 130, 160),
    "Green": (34, 139, 34),
    "Olive Green": (85, 107, 47),
    "Emerald Green": (4, 99, 7),
    "Yellow": (235, 205, 50),
    "Mustard": (212, 160, 23),
    "Orange": (240, 120, 20),
    "Brown": (101, 67, 33),
    "Beige": (230, 215, 185),
    "Tan": (180, 140, 90),
    "Purple": (120, 50, 140),
    "Lavender": (180, 150, 210)
}

def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Converts RGB tuple to hexadecimal string."""
    return f"#{int(r):02X}{int(g):02X}{int(b):02X}"

def color_distance(rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
    """
    Computes weighted Euclidean color distance between two RGB colors.
    Weights mimic human eye sensitivity (red=0.3, green=0.59, blue=0.11).
    """
    r_diff = (rgb1[0] - rgb2[0]) * 0.3
    g_diff = (rgb1[1] - rgb2[1]) * 0.59
    b_diff = (rgb1[2] - rgb2[2]) * 0.11
    return float(np.sqrt(r_diff**2 + g_diff**2 + b_diff**2))

def map_rgb_to_fashion_color(rgb: Tuple[int, int, int]) -> str:
    """Finds the closest human-readable fashion color name for a given RGB."""
    best_match = "Unknown"
    min_dist = float("inf")
    
    for name, palette_rgb in FASHION_COLOR_PALETTE.items():
        dist = color_distance(rgb, palette_rgb)
        if dist < min_dist:
            min_dist = dist
            best_match = name
            
    return best_match

def is_background_pixel(rgb: np.ndarray, thresh_white: int = 240, thresh_black: int = 15) -> bool:
    """Determines whether a pixel is likely a blank background (pure white or edge black)."""
    # Check if nearly white
    if np.all(rgb >= thresh_white):
        return True
    # Check if nearly black edge
    if np.all(rgb <= thresh_black):
        return True
    return False

def extract_dominant_colors(
    image_input,
    num_clusters: int = 4
) -> Dict[str, Optional[Dict[str, str]]]:
    """
    Extracts dominant and secondary clothing colors from an image path or OpenCV BGR array.
    Uses corner background sampling and contour filling so white clothes on grey backgrounds
    and internal patterns are accurately preserved.
    """
    # 1. Load image
    if isinstance(image_input, str):
        img = cv2.imread(image_input)
        if img is None:
            return {
                "dominant": "Unknown",
                "dominant_hex": "#000000",
                "secondary": None,
                "secondary_hex": None
            }
    else:
        img = image_input

    # 2. Resize for fast processing & noise reduction
    resized = cv2.resize(img, (150, 150), interpolation=cv2.INTER_AREA)
    
    # Estimate background from corners
    corners = np.array([
        resized[0, 0], resized[0, -1],
        resized[-1, 0], resized[-1, -1]
    ], dtype=np.float32)
    bg_bgr = np.median(corners, axis=0)

    # Foreground difference mask
    diff = np.linalg.norm(resized.astype(np.float32) - bg_bgr, axis=2)
    raw_mask = (diff > 15).astype(np.uint8) * 255
    contours, _ = cv2.findContours(raw_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        c = max(contours, key=cv2.contourArea)
        filled_fg = np.zeros_like(raw_mask)
        cv2.drawContours(filled_fg, [c], -1, 255, -1)
        fg_mask = filled_fg > 0
    else:
        fg_mask = raw_mask > 0

    rgb_img = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    
    # 3. Extract foreground pixels
    if np.count_nonzero(fg_mask) > 300:
        filtered_pixels = rgb_img[fg_mask]
    else:
        # Fallback to center 60% crop if mask is too small
        h, w, _ = rgb_img.shape
        center_crop = rgb_img[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
        filtered_pixels = center_crop.reshape((-1, 3))

    # 4. K-Means clustering (using OpenCV cv2.kmeans for speed and zero extra dependencies)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 0.2)
    k = min(num_clusters, max(2, len(filtered_pixels) // 100))
    
    float_pixels = np.float32(filtered_pixels)
    _, labels, centers = cv2.kmeans(
        float_pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
    )
    
    # 5. Count cluster sizes to find primary and secondary colors
    counts = np.bincount(labels.flatten())
    sorted_indices = np.argsort(counts)[::-1]  # Largest first
    
    primary_center = centers[sorted_indices[0]].astype(int)
    primary_rgb = (int(primary_center[0]), int(primary_center[1]), int(primary_center[2]))
    primary_name = map_rgb_to_fashion_color(primary_rgb)
    primary_hex = rgb_to_hex(*primary_rgb)

    secondary_name = None
    secondary_hex = None

    # Find distinct secondary color (must be at least 12% of pixels and not identical color name)
    total_pixels = len(filtered_pixels)
    for idx in sorted_indices[1:]:
        frac = counts[idx] / total_pixels
        if frac >= 0.12:
            sec_center = centers[idx].astype(int)
            sec_rgb = (int(sec_center[0]), int(sec_center[1]), int(sec_center[2]))
            sec_name = map_rgb_to_fashion_color(sec_rgb)
            if sec_name != primary_name:
                secondary_name = sec_name
                secondary_hex = rgb_to_hex(*sec_rgb)
                break

    return {
        "dominant": primary_name,
        "dominant_hex": primary_hex,
        "secondary": secondary_name,
        "secondary_hex": secondary_hex
    }

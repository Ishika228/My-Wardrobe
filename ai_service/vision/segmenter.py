"""
segmenter.py
High-precision garment extraction and segmentation using OpenCV and morphological filtering.
Isolates ONLY the clothing garment, completely removing:
- Human model/person (face, skin, hair, neck, arms, chest, legs)
- Background (studio backdrops, rooms, furniture, mirrors, floors, shadows)
Outputs a tightly cropped 4-channel transparent PNG and binary mask.
"""

import os
from typing import Dict, List, Optional, Tuple, Union
import cv2
import numpy as np
from PIL import Image


def detect_skin_mask(img_bgr: np.ndarray) -> np.ndarray:
    """
    Detects human skin regions using combined YCrCb and HSV color space thresholding.
    Robust across diverse human skin tones (Caucasian, Asian, South Asian, African, Latin).
    """
    # 1. YCrCb skin thresholding
    ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
    lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)

    # 2. HSV skin thresholding
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_hsv = np.array([0, 25, 50], dtype=np.uint8)
    upper_hsv = np.array([25, 180, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)

    # Combine masks
    skin_combined = cv2.bitwise_and(mask_ycrcb, mask_hsv)

    # Morphological dilation to ensure skin boundaries don't bleed into garment
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_cleaned = cv2.dilate(skin_combined, kernel, iterations=2)
    return skin_cleaned


def extract_garment(
    image_input: Union[str, np.ndarray],
    garment_bbox: Optional[List[int]] = None,
    skin_regions: Optional[List[List[int]]] = None,
    output_path: Optional[str] = None,
    mask_path: Optional[str] = None,
    crop_padding: int = 10,
) -> Dict[str, Union[str, int, float, bool]]:
    """
    Extracts ONLY the garment from an image, eliminating person and background.

    Args:
        image_input: File path or BGR numpy array
        garment_bbox: Normalized bounding box [ymin, xmin, ymax, xmax] in range 0-1000
        skin_regions: Optional list of normalized bounding boxes of human body parts
        output_path: Target path for cropped transparent PNG
        mask_path: Target path for binary mask PNG
        crop_padding: Extra pixel padding around garment

    Returns:
        Dict with extraction metadata and file paths
    """
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            raise FileNotFoundError(f"Input image not found: {image_input}")
        img = cv2.imread(image_input)
        if img is None:
            raise ValueError(f"Could not load image: {image_input}")
    else:
        img = image_input.copy()

    orig_h, orig_w = img.shape[:2]

    # 1. Determine garment bounding rectangle in pixel coordinates
    if garment_bbox and len(garment_bbox) == 4:
        ymin = max(0, min(orig_h - 1, int(garment_bbox[0] * orig_h / 1000)))
        xmin = max(0, min(orig_w - 1, int(garment_bbox[1] * orig_w / 1000)))
        ymax = max(ymin + 1, min(orig_h, int(garment_bbox[2] * orig_h / 1000)))
        xmax = max(xmin + 1, min(orig_w, int(garment_bbox[3] * orig_w / 1000)))
        rect = (xmin, ymin, xmax - xmin, ymax - ymin)
    else:
        # Default inset rectangle (5% margin from edges)
        margin_x = int(orig_w * 0.05)
        margin_y = int(orig_h * 0.04)
        rect = (margin_x, margin_y, orig_w - 2 * margin_x, orig_h - 2 * margin_y)

    # 2. Initialize GrabCut mask
    # 0 = cv2.GC_BGD (definite background)
    # 1 = cv2.GC_FGD (definite foreground)
    # 2 = cv2.GC_PR_BGD (probable background)
    # 3 = cv2.GC_PR_FGD (probable foreground)
    mask = np.zeros((orig_h, orig_w), np.uint8)

    # Detect skin to enforce definite background
    skin_mask = detect_skin_mask(img)

    # Everything outside rect is definite background
    rx, ry, rw, rh = rect
    mask[ry : ry + rh, rx : rx + rw] = cv2.GC_PR_FGD

    # Explicit skin regions marked as definite background
    if skin_regions:
        for sbox in skin_regions:
            s_ymin = max(0, min(orig_h - 1, int(sbox[0] * orig_h / 1000)))
            s_xmin = max(0, min(orig_w - 1, int(sbox[1] * orig_w / 1000)))
            s_ymax = max(s_ymin + 1, min(orig_h, int(sbox[2] * orig_h / 1000)))
            s_xmax = max(s_xmin + 1, min(orig_w, int(sbox[3] * orig_w / 1000)))
            mask[s_ymin:s_ymax, s_xmin:s_xmax] = cv2.GC_BGD

    # Auto-detected skin pixels set as definite background
    mask[skin_mask > 0] = cv2.GC_BGD

    # Corner background sampling: Check corners for studio backdrop color
    corners = [img[0:15, 0:15], img[0:15, -15:], img[-15:, 0:15], img[-15:, -15:]]
    corner_means = [np.mean(c, axis=(0, 1)) for c in corners]
    bg_color = np.mean(corner_means, axis=0)

    # Mark pixels very close to background color as definite background
    color_diff = np.linalg.norm(img.astype(float) - bg_color, axis=2)
    mask[color_diff < 18.0] = cv2.GC_BGD

    # 3. Execute GrabCut segmentation
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)
    except Exception as gc_err:
        # Fallback if GrabCut fails on uniform inputs
        print(f"[Segmenter] GrabCut note: {gc_err}, using rect init fallback")
        mask = np.zeros((orig_h, orig_w), np.uint8)
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)

    # 4. Refine binary mask
    binary_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")

    # Remove any skin pixels that might have leaked into foreground
    binary_mask[skin_mask > 0] = 0

    # Morphological closing to fill inner patterns, flower prints, or lace holes
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, close_kernel)

    # Keep largest connected component (the garment body)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_mask)
    if num_labels > 1:
        # Sort components by area (ignoring background component 0)
        areas = stats[1:, cv2.CC_STAT_AREA]
        max_idx = np.argmax(areas) + 1
        # Also include components that are at least 15% of largest (for sleeves/straps)
        largest_area = areas[max_idx - 1]
        valid_components = np.where(areas >= largest_area * 0.08)[0] + 1
        filtered_mask = np.isin(labels, valid_components).astype("uint8") * 255
    else:
        filtered_mask = binary_mask

    # 5. Smooth alpha edges with Gaussian feathering
    blurred_mask = cv2.GaussianBlur(filtered_mask, (3, 3), 0)

    # 6. Find bounding box of extracted garment for tight cropping
    non_zero_coords = cv2.findNonZero(filtered_mask)
    if non_zero_coords is None or len(non_zero_coords) == 0:
        raise ValueError("Garment segmentation produced an empty mask. Please upload an image with clear clothing.")

    x, y, w, h = cv2.boundingRect(non_zero_coords)
    crop_x = max(0, x - crop_padding)
    crop_y = max(0, y - crop_padding)
    crop_w = min(orig_w - crop_x, w + 2 * crop_padding)
    crop_h = min(orig_h - crop_y, h + 2 * crop_padding)

    # 7. Construct 4-channel RGBA output
    b, g, r = cv2.split(img)
    rgba = cv2.merge([b, g, r, blurred_mask])

    cropped_rgba = rgba[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]
    cropped_mask = filtered_mask[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]

    # Save to disk
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, cropped_rgba)

    if mask_path:
        os.makedirs(os.path.dirname(mask_path), exist_ok=True)
        cv2.imwrite(mask_path, cropped_mask)

    total_pixels = cropped_w = crop_w * crop_h
    garment_pixels = np.count_nonzero(cropped_mask)
    coverage_ratio = float(garment_pixels) / float(max(1, total_pixels))

    return {
        "success": True,
        "width": crop_w,
        "height": crop_h,
        "original_width": orig_w,
        "original_height": orig_h,
        "crop_rect": [crop_x, crop_y, crop_w, crop_h],
        "garment_coverage": round(coverage_ratio, 3),
        "output_path": output_path or "",
        "mask_path": mask_path or "",
    }


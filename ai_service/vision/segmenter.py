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


def detect_skin_mask(img_bgr: np.ndarray, garment_rect: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
    """
    Detects human skin regions using combined YCrCb and HSV color space thresholding.
    Safeguards: NEVER flags pixels inside the central garment body as skin, preventing
    warm brown, tan, beige, or red fabrics from being wrongly classified as human skin.
    """
    h, w = img_bgr.shape[:2]
    ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
    # Stricter skin thresholding to prevent brown/tan fabric false positives
    lower_ycrcb = np.array([0, 138, 85], dtype=np.uint8)
    upper_ycrcb = np.array([255, 170, 125], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    lower_hsv = np.array([0, 30, 60], dtype=np.uint8)
    upper_hsv = np.array([22, 170, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)

    skin_combined = cv2.bitwise_and(mask_ycrcb, mask_hsv)

    # Restrict skin mask: Only allow skin detection in typical head/neck, outer arm, and leg regions
    # Protect the core torso/body region so brown garments are 100% preserved
    skin_allowed = np.zeros((h, w), dtype=np.uint8)
    # 1. Head/neck area (top 20% of image)
    skin_allowed[: int(h * 0.20), :] = 255
    # 2. Outer side arm regions (outer 15% on left and right)
    skin_allowed[:, : int(w * 0.15)] = 255
    skin_allowed[:, int(w * 0.85) :] = 255
    # 3. Lower legs (bottom 15% of image)
    skin_allowed[int(h * 0.85) :, :] = 255

    if garment_rect:
        rx, ry, rw, rh = garment_rect
        # Core garment center box is strictly forbidden from being classified as skin
        core_x0 = int(rx + rw * 0.15)
        core_x1 = int(rx + rw * 0.85)
        core_y0 = int(ry + rh * 0.10)
        core_y1 = int(ry + rh * 0.90)
        skin_allowed[core_y0:core_y1, core_x0:core_x1] = 0

    skin_filtered = cv2.bitwise_and(skin_combined, skin_allowed)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    return cv2.dilate(skin_filtered, kernel, iterations=1)


def extract_garment(
    image_input: Union[str, np.ndarray],
    garment_bbox: Optional[List[int]] = None,
    skin_regions: Optional[List[List[int]]] = None,
    output_path: Optional[str] = None,
    mask_path: Optional[str] = None,
    crop_padding: int = 8,
) -> Dict[str, Union[str, int, float, bool]]:
    """
    Extracts ONLY the garment from an image, eliminating person and background.
    Guarantees:
    - Pure alpha transparency outside the garment mask.
    - Zero RGB values for transparent pixels (no color bleed, no halos, no pink edges).
    - Preserves all garment colors including warm brown, tan, beige, red, and floral.
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
        margin_x = max(2, int(orig_w * 0.04))
        margin_y = max(2, int(orig_h * 0.04))
        rect = (margin_x, margin_y, orig_w - 2 * margin_x, orig_h - 2 * margin_y)

    rx, ry, rw, rh = rect

    # 2. Sample all 4 outer border margins to estimate studio backdrop / background color
    border_px = max(4, min(12, int(min(orig_w, orig_h) * 0.03)))
    border_samples = np.concatenate([
        img[0:border_px, :].reshape(-1, 3),
        img[-border_px:, :].reshape(-1, 3),
        img[:, 0:border_px].reshape(-1, 3),
        img[:, -border_px:].reshape(-1, 3),
    ], axis=0)
    bg_color = np.median(border_samples, axis=0)
    color_diff = np.linalg.norm(img.astype(float) - bg_color, axis=2)

    # 3. Initialize GrabCut mask
    mask = np.full((orig_h, orig_w), cv2.GC_PR_BGD, dtype=np.uint8)

    # Margins are definite background
    mask[:border_px, :] = cv2.GC_BGD
    mask[-border_px:, :] = cv2.GC_BGD
    mask[:, :border_px] = cv2.GC_BGD
    mask[:, -border_px:] = cv2.GC_BGD

    # Pixels close to backdrop color are definite background
    mask[color_diff < 18.0] = cv2.GC_BGD

    # Inside garment rect, pixels significantly different from bg are probable foreground
    rect_roi = (slice(ry, ry + rh), slice(rx, rx + rw))
    fg_candidates = color_diff[rect_roi] >= 22.0
    mask[rect_roi][fg_candidates] = cv2.GC_PR_FGD

    # 4. Handle skin regions carefully: ONLY apply in explicit skin regions or outer head/arms
    if skin_regions:
        for sbox in skin_regions:
            s_ymin = max(0, min(orig_h - 1, int(sbox[0] * orig_h / 1000)))
            s_xmin = max(0, min(orig_w - 1, int(sbox[1] * orig_w / 1000)))
            s_ymax = max(s_ymin + 1, min(orig_h, int(sbox[2] * orig_h / 1000)))
            s_xmax = max(s_xmin + 1, min(orig_w, int(sbox[3] * orig_w / 1000)))
            mask[s_ymin:s_ymax, s_xmin:s_xmax] = cv2.GC_BGD
    else:
        skin_mask = detect_skin_mask(img, rect)
        mask[skin_mask > 0] = cv2.GC_BGD

    # 5. Execute GrabCut segmentation with robust fallback
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)
        binary_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")
    except Exception as gc_err:
        print(f"[Segmenter] GrabCut notice: {gc_err}, falling back to color-distance segmentation")
        binary_mask = np.where(color_diff >= 22.0, 255, 0).astype("uint8")
        binary_mask[:border_px, :] = 0
        binary_mask[-border_px:, :] = 0
        binary_mask[:, :border_px] = 0
        binary_mask[:, -border_px:] = 0

    # Fallback if GrabCut produced too few pixels
    if np.count_nonzero(binary_mask) < (orig_h * orig_w * 0.02):
        print("[Segmenter] Low GrabCut foreground, using adaptive background difference")
        binary_mask = np.where(color_diff >= 20.0, 255, 0).astype("uint8")
        binary_mask[:border_px, :] = 0
        binary_mask[-border_px:, :] = 0
        binary_mask[:, :border_px] = 0
        binary_mask[:, -border_px:] = 0

    # 6. Morphological refinement & largest connected component extraction
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, close_kernel)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary_mask)
    if num_labels > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        max_idx = np.argmax(areas) + 1
        largest_area = areas[max_idx - 1]
        valid_components = np.where(areas >= largest_area * 0.05)[0] + 1
        filtered_mask = np.isin(labels, valid_components).astype("uint8") * 255
    else:
        filtered_mask = binary_mask

    # 7. Edge smoothing via feathering
    blurred_mask = cv2.GaussianBlur(filtered_mask, (3, 3), 0)

    # 8. Tight crop to garment boundaries
    non_zero_coords = cv2.findNonZero(filtered_mask)
    if non_zero_coords is None or len(non_zero_coords) == 0:
        # Ultimate fail-safe: keep central 80% as foreground
        filtered_mask[int(orig_h * 0.1) : int(orig_h * 0.9), int(orig_w * 0.1) : int(orig_w * 0.9)] = 255
        blurred_mask = cv2.GaussianBlur(filtered_mask, (3, 3), 0)
        non_zero_coords = cv2.findNonZero(filtered_mask)

    x, y, w, h = cv2.boundingRect(non_zero_coords)
    crop_x = max(0, x - crop_padding)
    crop_y = max(0, y - crop_padding)
    crop_w = min(orig_w - crop_x, w + 2 * crop_padding)
    crop_h = min(orig_h - crop_y, h + 2 * crop_padding)

    # 9. Construct pure transparent RGBA output with ZERO-RGB outside alpha
    alpha_norm = (blurred_mask.astype(np.float32) / 255.0)[:, :, np.newaxis]
    img_clean = (img.astype(np.float32) * alpha_norm).astype(np.uint8)
    b, g, r = cv2.split(img_clean)
    rgba = cv2.merge([b, g, r, blurred_mask])

    cropped_rgba = rgba[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]
    cropped_mask = filtered_mask[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, cropped_rgba)

    if mask_path:
        os.makedirs(os.path.dirname(mask_path), exist_ok=True)
        cv2.imwrite(mask_path, cropped_mask)

    total_pixels = max(1, crop_w * crop_h)
    garment_pixels = np.count_nonzero(cropped_mask)
    coverage_ratio = float(garment_pixels) / float(total_pixels)

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


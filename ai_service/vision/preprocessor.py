"""
preprocessor.py
Handles image loading, format validation, aspect-ratio preserving padding,
and resizing for clothing recognition models.
"""

import os
from typing import Optional, Tuple, Union
from PIL import Image, ImageOps
import cv2
import numpy as np

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

def validate_image_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Checks if the file exists, is non-empty, supported format, and readable with valid dimensions."""
    if not file_path:
        return False, "No image file path provided."

    if not os.path.exists(file_path):
        return False, f"Image file not found: {file_path}"
    
    if os.path.getsize(file_path) == 0:
        return False, "Empty image file (0 bytes)."
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return False, f"Unsupported image format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    
    try:
        with Image.open(file_path) as img:
            img.verify()
        
        # Check minimum dimensions for vision analysis
        with Image.open(file_path) as img:
            w, h = img.size
            if w < 32 or h < 32:
                return False, f"Image resolution too small ({w}x{h}). Minimum required resolution is 32x32 pixels."

        return True, None
    except Exception as e:
        return False, f"Corrupted or invalid image file: {str(e)}"

def load_and_preprocess_image(
    image_input: Union[str, Image.Image],
    target_size: Tuple[int, int] = (224, 224)
) -> Image.Image:
    """
    Loads an image from path or PIL Image, converts to RGB, and pads/resizes
    to the target size while preserving original aspect ratio.
    """
    if isinstance(image_input, str):
        valid, err = validate_image_file(image_input)
        if not valid:
            raise ValueError(err)
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise TypeError(f"Expected str path or PIL.Image, got {type(image_input)}")

    # Resize with aspect ratio preserved using letterboxing (neutral grey/white padding)
    img.thumbnail(target_size, Image.Resampling.LANCZOS)
    
    # Create canvas of target size
    canvas = Image.new("RGB", target_size, (245, 245, 245))
    offset = ((target_size[0] - img.size[0]) // 2, (target_size[1] - img.size[1]) // 2)
    canvas.paste(img, offset)
    
    return canvas

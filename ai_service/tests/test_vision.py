"""
test_vision.py
Comprehensive test suite and benchmark for the WardrobeWise Vision AI module.
Validates:
1. Category classification across 10+ clothing types (Shirt, T-shirt, Jeans, Trousers,
   Dress, Jacket, Hoodie, Sweater, Shoes, Sneakers).
2. Dominant and secondary color detection across various fashion palettes.
3. Pattern recognition (Plain, Striped, Checked, Floral, Printed).
4. Robust error handling (Missing file, Empty file, Unsupported extension, Tiny resolution, Corrupt file).
5. Exact benchmark accuracy calculation (Correct / Total * 100).
"""

import os
import sys
import tempfile
import cv2
import numpy as np

# Ensure ai_service is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from vision.classifier import analyze_clothing_image, SUPPORTED_CATEGORIES, SUPPORTED_PATTERNS
from vision.preprocessor import validate_image_file

def run_vision_tests():
    print("=" * 70)
    print("TEST SUITE: WardrobeWise AI Vision & Clothing Recognition")
    print("=" * 70 + "\n")

    images_dir = os.path.join(BASE_DIR, "sample_data", "images")
    
    # 13 Labelled Benchmark Test Cases
    test_benchmarks = [
        ("white_shirt.jpg", "Shirt", "White", "Plain"),
        ("navy_striped_tshirt.jpg", "T-shirt", "Navy Blue", "Striped"),
        ("indigo_jeans.jpg", "Jeans", "Navy Blue", "Plain"),
        ("black_trousers.jpg", "Trousers", "Black", "Plain"),
        ("emerald_dress.jpg", "Dress", "Emerald Green", "Plain"),
        ("charcoal_jacket.jpg", "Jacket", "Charcoal", "Plain"),
        ("brown_oxfords.jpg", "Shoes", "Brown", "Plain"),
        ("grey_hoodie.jpg", "Hoodie", "Grey", "Plain"),
        ("burgundy_sweater.jpg", "Sweater", "Burgundy", "Plain"),
        ("white_sneakers.jpg", "Sneakers", "White", "Plain"),
        ("red_checked_shirt.jpg", "Shirt", "Red", "Checked"),
        ("black_graphic_tee.jpg", "T-shirt", "Black", "Printed"),
        ("floral_dress.jpg", "Dress", "Pink", "Floral")
    ]

    correct_cat = 0
    correct_color = 0
    correct_pat = 0
    total_benchmarks = len(test_benchmarks)

    print("--> 1. Testing Clothing Recognition, Color, and Pattern on Benchmark Dataset:")
    for filename, expected_cat, expected_color, expected_pattern in test_benchmarks:
        image_path = os.path.join(images_dir, filename)
        assert os.path.exists(image_path), f"Benchmark image missing: {image_path}"
        
        result = analyze_clothing_image(image_path)
        
        # Verify schema
        assert "item_id" in result
        assert "processing_status" in result
        assert "category" in result
        assert "colour" in result
        assert "pattern" in result
        assert "confidence" in result
        assert "alternative_predictions" in result
        assert result["processing_status"] == "success", f"Failed for {filename}: {result.get('error_message')}"

        cat = result["category"]
        conf = result["confidence"]
        dominant_color = result["colour"]["dominant"]
        pattern = result["pattern"]
        pattern_conf = result["pattern_confidence"]

        # Validate against expectations
        cat_match = (cat == expected_cat)
        # Handle compatible color naming (e.g. Navy Blue / Blue, Charcoal / Grey)
        color_match = (dominant_color == expected_color) or \
                      (expected_color in ["Navy Blue", "Blue"] and dominant_color in ["Navy Blue", "Blue"]) or \
                      (expected_color in ["Charcoal", "Grey", "Black"] and dominant_color in ["Charcoal", "Grey", "Black"])
        pat_match = (pattern == expected_pattern)

        if cat_match: correct_cat += 1
        if color_match: correct_color += 1
        if pat_match: correct_pat += 1

        status_str = "PASS" if (cat_match and color_match and pat_match) else "MISMATCH"
        print(f"  [{status_str}] {filename:24} -> Category: {cat:8} | Dominant: {dominant_color:14} | Pattern: {pattern}")
        assert cat in SUPPORTED_CATEGORIES, f"Category '{cat}' not supported"
        assert pattern in SUPPORTED_PATTERNS, f"Pattern '{pattern}' not supported"

    cat_acc = (correct_cat / total_benchmarks) * 100.0
    col_acc = (correct_color / total_benchmarks) * 100.0
    pat_acc = (correct_pat / total_benchmarks) * 100.0

    print("\n" + "-" * 70)
    print(f"BENCHMARK ACCURACY SUMMARY:")
    print(f"  Total Images Tested:    {total_benchmarks}")
    print(f"  Category Accuracy:      {correct_cat}/{total_benchmarks} ({cat_acc:.1f}%)")
    print(f"  Color Accuracy:         {correct_color}/{total_benchmarks} ({col_acc:.1f}%)")
    print(f"  Pattern Accuracy:       {correct_pat}/{total_benchmarks} ({pat_acc:.1f}%)")
    print("-" * 70 + "\n")

    assert cat_acc >= 85.0, f"Category accuracy below threshold: {cat_acc}%"
    assert col_acc >= 90.0, f"Color accuracy below threshold: {col_acc}%"
    assert pat_acc >= 80.0, f"Pattern accuracy below threshold: {pat_acc}%"

    # -------------------------------------------------------------
    # 2. Comprehensive Vision Error Handling Test
    # -------------------------------------------------------------
    print("--> 2. Testing Vision Error Handling Edge Cases:")

    with tempfile.TemporaryDirectory() as tmp_dir:
        # A. Missing image
        print("  Testing 2A: Non-existent image path")
        res_missing = analyze_clothing_image(os.path.join(tmp_dir, "missing.jpg"))
        assert res_missing["processing_status"] == "error"
        assert "not found" in res_missing["error_message"].lower()
        print("    [PASS] Correctly flagged missing image.")

        # B. Unsupported format (.txt)
        print("  Testing 2B: Unsupported file extension")
        unsupported_file = os.path.join(tmp_dir, "document.txt")
        with open(unsupported_file, "w") as f:
            f.write("Not an image")
        res_unsupported = analyze_clothing_image(unsupported_file)
        assert res_unsupported["processing_status"] == "error"
        assert "unsupported" in res_unsupported["error_message"].lower()
        print("    [PASS] Correctly rejected unsupported file extension.")

        # C. Empty file (0 bytes)
        print("  Testing 2C: Empty image file (0 bytes)")
        empty_file = os.path.join(tmp_dir, "empty.jpg")
        with open(empty_file, "wb") as f:
            pass
        res_empty = analyze_clothing_image(empty_file)
        assert res_empty["processing_status"] == "error"
        assert "empty" in res_empty["error_message"].lower() or "corrupted" in res_empty["error_message"].lower()
        print("    [PASS] Correctly handled 0-byte empty file.")

        # D. Very small resolution (< 32x32 pixels)
        print("  Testing 2D: Very small image (8x8 pixels)")
        small_file = os.path.join(tmp_dir, "tiny.png")
        tiny_img = np.zeros((8, 8, 3), dtype=np.uint8)
        cv2.imwrite(small_file, tiny_img)
        res_small = analyze_clothing_image(small_file)
        assert res_small["processing_status"] == "error"
        assert "small" in res_small["error_message"].lower() or "resolution" in res_small["error_message"].lower()
        print("    [PASS] Correctly rejected low resolution image.")

        # E. Corrupted image file
        print("  Testing 2E: Corrupted JPEG header")
        corrupt_file = os.path.join(tmp_dir, "corrupt.jpg")
        with open(corrupt_file, "wb") as f:
            f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00CORRUPTED_GARBAGE_BYTES_HERE")
        res_corrupt = analyze_clothing_image(corrupt_file)
        assert res_corrupt["processing_status"] == "error"
        assert "corrupt" in res_corrupt["error_message"].lower() or "invalid" in res_corrupt["error_message"].lower()
        print("    [PASS] Correctly detected corrupted image file.")

    print("\n" + "=" * 70)
    print("ALL VISION & RECOGNITION TESTS EXECUTED AND PASSED SUCCESSFULLY")
    print("=" * 70)

if __name__ == "__main__":
    run_vision_tests()

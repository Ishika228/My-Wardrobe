"""
test_api.py
Integration test for the FastAPI endpoints using TestClient.
Tests:
1. GET /api/ai/health
2. POST /api/ai/analyze-clothing
3. POST /api/ai/recommend-outfits
4. POST /api/ai/recommend-unused
"""

import json
import os
import sys
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from api.app import app

client = TestClient(app)

def test_api_endpoints():
    print("=" * 65)
    print("TEST SUITE: WardrobeWise FastAPI Endpoints")
    print("=" * 65 + "\n")

    # 1. Health check
    print("--> Testing GET /api/ai/health")
    res = client.get("/api/ai/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print("    Health response:", health_data["status"])
    print(f"    Supported Categories: {health_data['supported_categories_count']}")
    assert health_data["status"] == "healthy"
    print("    [PASS] Health check passed.\n")

    # 2. Image Analysis endpoint
    print("--> Testing POST /api/ai/analyze-clothing (Image Upload)")
    image_path = os.path.join(BASE_DIR, "sample_data", "images", "navy_striped_tshirt.jpg")
    with open(image_path, "rb") as f:
        res = client.post(
            "/api/ai/analyze-clothing",
            files={"file": ("test_tee.jpg", f, "image/jpeg")}
        )
    assert res.status_code == 200, f"Image upload failed: {res.text}"
    analysis = res.json()
    print("    Category: ", analysis["category"])
    print("    Colour:   ", analysis["colour"])
    print("    Status:   ", analysis["processing_status"])
    assert analysis["processing_status"] == "success"
    assert analysis["category"] is not None
    print("    [PASS] Image analysis endpoint passed.\n")

    # 3. Recommendations endpoint
    print("--> Testing POST /api/ai/recommend-outfits")
    wardrobe_file = os.path.join(BASE_DIR, "sample_data", "sample_wardrobe.json")
    with open(wardrobe_file, "r") as f:
        wardrobe_data = json.load(f)

    req_body = {
        "wardrobe": wardrobe_data,
        "occasion": "Casual outing",
        "season": "Summer",
        "limit": 3
    }
    res = client.post("/api/ai/recommend-outfits", json=req_body)
    assert res.status_code == 200, f"Recommendation failed: {res.text}"
    rec_data = res.json()
    print("    Status:   ", rec_data["status"])
    print("    Outfits:  ", rec_data.get("returned_count", 0))
    assert rec_data["status"] == "success"
    assert len(rec_data["recommended_outfits"]) > 0
    print("    [PASS] Recommend outfits endpoint passed.\n")

    # 4. Unused items endpoint
    print("--> Testing POST /api/ai/recommend-unused")
    res = client.post("/api/ai/recommend-unused", json=req_body)
    assert res.status_code == 200, f"Unused recommendation failed: {res.text}"
    unused_data = res.json()
    print("    Status:          ", unused_data["status"])
    print("    Neglected Items: ", unused_data.get("neglected_items_count", 0))
    print("    Revival Outfits: ", len(unused_data.get("revival_outfits", [])))
    assert unused_data["status"] == "success"
    assert unused_data["neglected_items_count"] > 0
    print("    [PASS] Recommend unused items endpoint passed.\n")

    print("=" * 65)
    print("ALL API ENDPOINT TESTS PASSED SUCCESSFULLY (4/4)")
    print("=" * 65)

if __name__ == "__main__":
    test_api_endpoints()

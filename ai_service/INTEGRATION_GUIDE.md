# WardrobeWise – Member 3 AI Module Integration Guide

This guide is prepared specifically for **Member 2 (Backend & Database)** and **Member 1 (Frontend)** to seamlessly integrate the **AI Clothing Vision** and **Smart Outfit Recommendation Engine** into the main WardrobeWise application.

---

## Architecture Summary

```text
[ Member 1: React / 3D Virtual Room ]
                 │
                 │ HTTP (User requests)
                 ▼
[ Member 2: Node.js / Express Backend + MongoDB ]
   ├── Clothing CRUD & Image Uploads (multer)
   │
   ├── (Option A - Direct JS Import)
   │   └── require('./ai_service/recommender/recommender') -> Outfit Recommendations
   │
   └── (Option B - REST HTTP Call)
       └── POST http://127.0.0.1:8000/api/ai/analyze-clothing -> Vision Analysis
```

---

## 1. How to Send a Clothing Image for Recognition

### Endpoint
`POST http://127.0.0.1:8000/api/ai/analyze-clothing`

### Request Format
Send the image as `multipart/form-data` with a `file` field, or pass an existing server file path via form-data `image_path`:

```http
POST /api/ai/analyze-clothing HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="striped_shirt.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundary--
```

### Expected JSON Response
```json
{
  "item_id": "item_9f3b12a8",
  "processing_status": "success",
  "error_message": null,
  "category": "T-shirt",
  "category_group": "top",
  "confidence": 0.84,
  "alternative_predictions": [
    { "category": "Shirt", "confidence": 0.08 },
    { "category": "Sweater", "confidence": 0.04 }
  ],
  "colour": {
    "dominant": "Navy Blue",
    "dominant_hex": "#1B2A4A",
    "secondary": "White",
    "secondary_hex": "#F4F6F8"
  },
  "pattern": "Striped",
  "pattern_confidence": 0.85,
  "recommended_seasons": ["Summer", "Spring", "Monsoon"],
  "recommended_occasions": ["Casual outing", "College", "Travel"],
  "image_reference": "sample_data/uploads/upload_9f3b12a8.jpg"
}
```

---

## 2. Recommended MongoDB / Mongoose Schema for Member 2

To ensure seamless compatibility with the AI recommendation engine, Member 2 should define the clothing item schema as follows:

```javascript
// models/ClothingItem.js
const mongoose = require('mongoose');

const ClothingItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Shirt', 'T-shirt', 'Jeans', 'Trousers', 'Shorts', 'Skirt',
      'Dress', 'Jacket', 'Hoodie', 'Sweater', 'Shoes', 'Sneakers',
      'Boots', 'Accessories'
    ]
  },
  category_group: {
    type: String,
    enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory']
  },
  colour: {
    dominant: { type: String, required: true },
    dominant_hex: { type: String },
    secondary: { type: String, default: null },
    secondary_hex: { type: String, default: null }
  },
  pattern: {
    type: String,
    enum: ['Plain', 'Striped', 'Checked', 'Floral', 'Printed', 'Unknown'],
    default: 'Plain'
  },
  seasons: [{
    type: String,
    enum: ['Summer', 'Winter', 'Monsoon', 'Spring']
  }],
  occasions: [{
    type: String,
    enum: ['College', 'Office', 'Casual outing', 'Party', 'Wedding', 'Travel', 'Formal event']
  }],
  image_url: {
    type: String,
    required: true
  },
  times_worn: {
    type: Number,
    default: 0
  },
  last_worn: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClothingItem', ClothingItemSchema);
```

---

## 3. How to Pass Wardrobe Data to the Recommendation Engine

### Direct JavaScript Usage (Fastest & Zero Network Overhead)
In Member 2's Express backend:

```javascript
const { recommendOutfits } = require('./ai_service/recommender/recommender');

// Fetch items from MongoDB for the logged-in user
const userItems = await ClothingItem.find({ user: req.user._id });

// Format for AI engine
const wardrobe = userItems.map(item => ({
  item_id: item._id.toString(),
  name: item.name,
  category: item.category,
  category_group: item.category_group,
  colour: item.colour,
  pattern: item.pattern,
  seasons: item.seasons,
  occasions: item.occasions,
  times_worn: item.times_worn,
  last_worn: item.last_worn ? item.last_worn.toISOString() : null,
  image_reference: item.image_url
}));

// Generate smart recommendations
const result = recommendOutfits(wardrobe, {
  occasion: 'Casual outing', // Options: College, Office, Casual outing, Party, Wedding, Travel, Formal event
  season: 'Summer',          // Options: Summer, Winter, Monsoon, Spring
  limit: 5,
  boostUnworn: true
});

res.json(result);
```

### Alternatively via HTTP Microservice:
`POST http://127.0.0.1:8000/api/ai/recommend-outfits`

Body:
```json
{
  "wardrobe": [ ...array of items... ],
  "occasion": "Casual outing",
  "season": "Summer",
  "limit": 3
}
```

---

## 4. Expected Recommendation Response Format

```json
{
  "status": "success",
  "total_candidates_evaluated": 24,
  "returned_count": 3,
  "filters_applied": {
    "occasion": "Casual outing",
    "season": "Summer"
  },
  "recommended_outfits": [
    {
      "outfit_id": "outfit_item001_item008_item013",
      "type": "top_bottom_footwear",
      "items": [
        {
          "item_id": "item001",
          "name": "Classic White Linen Shirt",
          "category": "Shirt",
          "colour": { "dominant": "White", "dominant_hex": "#FFFFFF" }
        },
        {
          "item_id": "item008",
          "name": "Beige Slim Chinos Trousers",
          "category": "Trousers",
          "colour": { "dominant": "Beige", "dominant_hex": "#F5F5DC" }
        },
        {
          "item_id": "item013",
          "name": "White Minimalist Leather Sneakers",
          "category": "Sneakers",
          "colour": { "dominant": "White", "dominant_hex": "#F8F9FA" }
        }
      ],
      "occasion": "Casual outing",
      "season": "Summer",
      "recommendation_score": 100,
      "compatibility": {
        "color_score": 95,
        "color_harmony_status": "excellent",
        "is_clashing": false,
        "details": "Timeless high-contrast neutral harmony (white with beige). Clean monochromatic neutral set (white on white)."
      },
      "unworn_bonus": 16,
      "explanation": "Timeless high-contrast neutral harmony (white with beige). Clean monochromatic neutral set (white on white). Well-suited for Casual outing wear in Summer. Sustainable pick: Helps you re-wear forgotten clothes (Beige Slim Chinos Trousers (Unworn for 202 days))."
    }
  ]
}
```

---

## 5. Unused Clothing Revival Endpoint

### Endpoint
`POST http://127.0.0.1:8000/api/ai/recommend-unused`

### Or Direct JavaScript:
```javascript
const { recommendUnusedItemOutfits } = require('./ai_service/recommender/recommender');
const revivalResult = recommendUnusedItemOutfits(wardrobe, { limit: 5 });
```

### Response Example:
```json
{
  "status": "success",
  "neglected_items_count": 2,
  "neglected_items": [
    {
      "item_id": "item_004",
      "name": "Burgundy Knit Turtleneck Sweater",
      "category": "Sweater",
      "times_worn": 0,
      "neglect_reason": "Never worn yet"
    }
  ],
  "revival_outfits": [
    {
      "outfit_id": "outfit_...",
      "items": [ ... ],
      "recommendation_score": 95,
      "explanation": "Harmonious tonal pairing. Sustainable pick: Helps you re-wear forgotten clothes (Burgundy Knit Turtleneck Sweater (Never worn))."
    }
  ]
}
```

---

## 6. Error Handling Contracts

| Error Scenario | HTTP Code | Status Code in JSON | Handling Recommendation |
| :--- | :---: | :--- | :--- |
| Missing/Corrupted Image | 400 | `"processing_status": "error"` | Prompt user to upload a valid JPG/PNG. |
| Blurry/Uncertain Image | 200 | `"processing_status": "uncertain"` | Display prediction but allow user to manually adjust the dropdown. |
| Empty Wardrobe | 200 | `"status": "error"` | Tell user to add at least 1 top, 1 bottom, and 1 footwear item. |
| Missing Categories for Context | 200 | `"status": "insufficient_items"` | Displays detailed diagnostics of missing items (e.g. "Missing bottoms"). |
| No Usage Data Available | 200 | `"status": "no_usage_history"` | Informs user that logging wear history is required for unused clothing revival. |

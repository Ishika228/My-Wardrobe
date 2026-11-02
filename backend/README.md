# WardrobeWise Backend API

WardrobeWise is an AI-powered digital wardrobe management platform designed to support a 3D virtual dressing room, intelligent outfit recommendations, and computer-vision-based garment cataloging.

## Technology Stack

- **Runtime**: Node.js (v24+)
- **Framework**: Express.js (ES Modules `"type": "module"`)
- **Database**: MongoDB Community Edition (Local)
- **ODM**: Mongoose
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Multer (Disk storage, free & local)
- **External AI Integration**: HTTP client via native `fetch` / `FormData` with timeout and mock fallback

---

## Implemented Architecture Phases

- **Phase 1: Backend Foundation**: Express server, local MongoDB connection, dynamic database health check (`GET /api/health`), 404 handler, centralized error middleware.
- **Phase 2: Database Models**: Mongoose schemas for `User`, `ClothingItem`, `Outfit`, and `OutfitHistory` with indexing and relationships.
- **Phase 3: Authentication & Authorization**: User registration, login, logout, password hashing with bcrypt, JWT protection middleware (`protect`), and profile management (`/api/users/profile`).
- **Phase 4: Wardrobe Management CRUD**: Full wardrobe inventory APIs (`/api/clothes`) with multi-attribute filtering, case-insensitive regex, name search, pagination, and IDOR protection.
- **Phase 5: Clothing Image Upload & Local Storage**: Multer disk storage for local image uploads, UUID naming, automatic file cleanup, replacement, and safe static asset serving.
- **Phase 6: AI Clothing Recognition Integration**: Decoupled HTTP client connecting to an external Python computer vision service with schema validation, metadata preservation, manual overrides, and offline mock fallback.
- **Phase 7: Outfit Management APIs**: Custom user outfit curation referencing saved clothing items, strict user ownership verification, IDOR protection, compound indexes, pagination, filtering, search, favorite toggling, and item addition/removal.
- **Phase 8: AI Outfit Recommendation System Integration**: Decoupled backend integration layer communicating with an external AI outfit recommendation service, user wardrobe extraction, preference formatting, strict IDOR validation, optional wear history persistence, and offline mock fallback.
- **Phase 9: Integration Testing, Security & Final Optimization**: Full multi-tenant IDOR protection matrix, X-Powered-By header suppression, multi-origin CORS whitelist, compound indexing optimizations, 10MB payload guarding, health monitoring, and 107 passing automated assertions.

---

## Phase 6: AI Clothing Recognition Integration

### 1. Architecture Flow

```
React Frontend / Unity VR
           |
  HTTP REST API
           |
Node.js + Express Backend
           |
services/aiRecognitionService.js (HTTP Client)
           |
HTTP POST multipart/form-data (/predict)
           |
Separate Python AI Service (FastAPI / PyTorch / Gemini Vision)
           |
Structured JSON Predictions
           |
MongoDB (ClothingItem.aiAnalysis + Metadata Updates)
```

### 2. Configuration & Environment Variables

Add to your `.env` file:

```env
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_TIMEOUT_MS=10000
AI_MOCK_FALLBACK=true
```

* `AI_SERVICE_URL`: URL where the Python AI service is hosted (default: `http://127.0.0.1:8000`).
* `AI_SERVICE_TIMEOUT_MS`: Milliseconds to wait before timing out (default: `10000` = 10s).
* `AI_MOCK_FALLBACK`: When `true`, if the Python service is offline or unreachable, the system automatically uses an isolated local mock adapter for testing, explicitly flagged with `"isMock": true`.

---

### 3. Python AI Service Contract

The Python service (maintained by the AI team member) should expose:

* **Endpoint**: `POST /predict`
* **Content-Type**: `multipart/form-data`
* **Form Field**: `image` (binary image file)
* **Expected JSON Response**:
```json
{
  "success": true,
  "data": {
    "category": "Jacket",
    "subCategory": "Denim Jacket",
    "color": "Blue",
    "secondaryColors": [],
    "pattern": "Solid",
    "material": "Denim",
    "season": ["Winter", "Autumn"],
    "occasion": ["Casual", "College"],
    "style": ["Casual", "Streetwear"],
    "confidence": 0.94
  }
}
```

*Supported categories in Node.js backend:* `Shirt`, `T-Shirt`, `Jeans`, `Trousers`, `Jacket`, `Dress`, `Skirt`, `Shoes`, `Accessories`, `Other`.

---

### 4. Metadata Update & Manual Edit Preservation Policy

1. **First Analysis**: Populates item metadata (`category`, `color`, `material`, etc.) directly from AI predictions.
2. **Manual Edits**: If a user updates a field via `PATCH /api/clothes/:id/analysis` or `PUT /api/clothes/:id`, that field is tagged in `manuallyEditedFields`.
3. **Re-Analysis**: Running `POST /api/clothes/:id/reanalyze` updates the AI analysis log while preserving any field in `manuallyEditedFields`.
4. **Force Replace**: Sending `{ "forceReplace": true }` in `reanalyze` overrides all manual edits and resets the override list.

---

### 5. Phase 6 Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/clothes/:id/analyze` | Private | Sends item's uploaded image to AI recognition service and populates metadata |
| `GET` | `/api/clothes/:id/analysis` | Private | Retrieves saved AI prediction details, confidence, and manual edit status |
| `PATCH` | `/api/clothes/:id/analysis` | Private | Corrects AI-generated metadata and marks fields as manually edited |
| `POST` | `/api/clothes/:id/reanalyze` | Private | Re-runs AI analysis while preserving user-customized fields (unless `forceReplace: true`) |

---

## Postman Testing Guide (Phase 6)

### Prerequisites
1. Start the Node.js backend:
   ```bash
   cd backend
   npm run dev
   ```
2. *(Optional)* Start the Python AI service independently:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *(If the Python service is not running and `AI_MOCK_FALLBACK=true`, the backend automatically falls back to the isolated mock adapter).*

3. Log in to get your token (`POST http://localhost:5000/api/auth/login`).
4. Create an item and upload an image using Phase 4 & 5 endpoints to get an item ID.

---

### Step-by-Step AI Scenarios

#### 1. Analyze Clothing Item
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/clothes/<ITEM_ID>/analyze`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Expected Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Clothing item analyzed successfully",
    "data": {
      "clothingItem": {
        "_id": "<ITEM_ID>",
        "category": "Jacket",
        "color": "Blue",
        "material": "Denim",
        "aiAnalyzed": true
      },
      "analysis": {
        "category": "Jacket",
        "confidence": 0.94,
        "isMock": true
      },
      "isMock": true
    }
  }
  ```

#### 2. Get Analysis Details
* **Method**: `GET`
* **URL**: `http://localhost:5000/api/clothes/<ITEM_ID>/analysis`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Expected Response**: `200 OK` showing prediction confidence, category, and metadata.

#### 3. Correct AI Predictions Manually
* **Method**: `PATCH`
* **URL**: `http://localhost:5000/api/clothes/<ITEM_ID>/analysis`
* **Headers**:
  * `Authorization`: `Bearer <TOKEN>`
  * `Content-Type`: `application/json`
* **Body**:
  ```json
  {
    "material": "100% Genuine Italian Leather",
    "color": "Midnight Black"
  }
  ```
* **Expected Response**: `200 OK`. The fields are saved and recorded in `manuallyEditedFields: ["material", "color"]`.

#### 4. Re-analyze Item (Preserving Manual Edits)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/clothes/<ITEM_ID>/reanalyze`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Expected Response**: `200 OK`. Notice that `material` and `color` remain `'100% Genuine Italian Leather'` and `'Midnight Black'`, while other fields are refreshed from AI.

#### 5. Force Re-analyze (Overwriting All Edits)
* **Method**: `POST`
* **URL**: `http://localhost:5000/api/clothes/<ITEM_ID>/reanalyze`
* **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **Body**:
  ```json
  {
    "forceReplace": true
  }
  ```
* **Expected Response**: `200 OK`. All fields are re-written with AI predictions, and `manuallyEditedFields` is cleared.

---

## Phase 7: Outfit Management APIs

### 1. Data Model Relationships

```
+--------------------------------------------------------------+
|                          User                                |
|  - _id: ObjectId                                             |
|  - name: String                                              |
|  - email: String                                             |
+------------------------------+-------------------------------+
                               | 1
                               |
               +---------------+---------------+
               | 1                             | 1
               v *                             v *
+------------------------------+  ref [M:N]   +------------------------------+
|            Outfit            | ------------>|         ClothingItem         |
|  - _id: ObjectId             |  (array of   |  - _id: ObjectId             |
|  - userId: ObjectId (Ref)    |  ObjectIds)  |  - userId: ObjectId (Ref)    |
|  - name: String              |              |  - name: String              |
|  - clothingItems: [ObjectId] |              |  - category: String          |
|  - occasion: String          |              |  - imageUrl: String          |
|  - season: String            |              |  - aiAnalyzed: Boolean       |
|  - description: String       |              |  - isFavorite: Boolean       |
|  - previewImage: String      |              +------------------------------+
|  - isFavorite: Boolean       |
+------------------------------+
```

* **User Ownership**: Both `Outfit` and `ClothingItem` belong to a specific `User` via `userId`.
* **Clothing References**: `clothingItems` contains an array of `ObjectId`s referencing `ClothingItem`.
* **Cascade Boundary**: Deleting an `Outfit` does **not** delete the underlying `ClothingItem` documents.
* **Integrity Constraints**: All items in an outfit must be owned by the authenticated user; duplicates and empty arrays are rejected.

---

### 2. Authentication Requirements

All outfit endpoints require a valid JWT Bearer token obtained from `/api/auth/login` or `/api/auth/register`:
```http
Authorization: Bearer <JWT_TOKEN>
```
The authenticated user ID is extracted from `req.user._id`. Users cannot query, view, modify, or delete outfits or clothing items belonging to other users.

---

### 3. Outfit API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/outfits` | Private | Create an outfit with $\ge 1$ user-owned clothing item references |
| `GET` | `/api/outfits` | Private | List outfits with pagination (`page`, `limit`), filtering (`occasion`, `season`, `isFavorite`), search (`search`), and sorting (`sortBy`, `sortOrder`) |
| `GET` | `/api/outfits/:id` | Private | Retrieve single outfit with populated `clothingItems` details |
| `PUT` | `/api/outfits/:id` | Private | Update outfit metadata and clothing items (ownership strictly checked) |
| `DELETE` | `/api/outfits/:id` | Private | Delete outfit document without deleting referenced clothing items |
| `PATCH` | `/api/outfits/:id/favorite` | Private | Toggle `isFavorite` flag between `true` and `false` |
| `PATCH` | `/api/outfits/:id/items` | Private | Add or remove clothing items (`action: "add" \| "remove"`) without emptying outfit |

---

### 4. Request & Response Examples

#### A. Create Outfit (`POST /api/outfits`)
**Request Body:**
```json
{
  "name": "Casual College Look",
  "clothingItems": [
    "65e0123456789abcdef00001",
    "65e0123456789abcdef00002",
    "65e0123456789abcdef00003"
  ],
  "occasion": "College",
  "season": "Winter",
  "description": "Comfortable everyday outfit",
  "previewImage": "https://example.com/preview.jpg",
  "isFavorite": false
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Outfit created successfully",
  "data": {
    "outfit": {
      "_id": "65e0987654321fedcba00001",
      "userId": "65e000000000000000000001",
      "name": "Casual College Look",
      "clothingItems": [
        {
          "_id": "65e0123456789abcdef00001",
          "name": "Denim Jacket",
          "category": "Jacket",
          "color": "Blue"
        },
        {
          "_id": "65e0123456789abcdef00002",
          "name": "White Crewneck T-Shirt",
          "category": "T-Shirt",
          "color": "White"
        },
        {
          "_id": "65e0123456789abcdef00003",
          "name": "Black Chino Pants",
          "category": "Trousers",
          "color": "Black"
        }
      ],
      "occasion": "College",
      "season": "Winter",
      "description": "Comfortable everyday outfit",
      "previewImage": "https://example.com/preview.jpg",
      "isFavorite": false,
      "createdAt": "2026-10-30T10:00:00.000Z",
      "updatedAt": "2026-10-30T10:00:00.000Z"
    }
  }
}
```

#### B. Get All Outfits with Query Filters (`GET /api/outfits`)
**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 12, max: 100)
- `occasion`: Exact case-insensitive match (e.g. `College`)
- `season`: Exact case-insensitive match (e.g. `Winter`)
- `isFavorite`: Boolean (`true` or `false`)
- `search`: Case-insensitive partial name match (e.g. `Casual`)
- `sortBy`: `createdAt` (default) or `name`
- `sortOrder`: `desc` (default) or `asc`

**Example Request:**
`GET /api/outfits?occasion=College&season=Winter&page=1&limit=12`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65e0987654321fedcba00001",
      "name": "Casual College Look",
      "occasion": "College",
      "season": "Winter",
      "clothingItems": [ ... ],
      "isFavorite": false
    }
  ],
  "pagination": {
    "totalItems": 1,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 12
  }
}
```

#### C. Update Outfit Items (`PATCH /api/outfits/:id/items`)
**Add items:**
```json
{
  "action": "add",
  "clothingItemIds": ["65e0123456789abcdef00004"]
}
```
**Remove items:**
```json
{
  "action": "remove",
  "clothingItemIds": ["65e0123456789abcdef00002"]
}
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Clothing items added to outfit successfully",
  "data": {
    "outfit": {
      "_id": "65e0987654321fedcba00001",
      "clothingItems": [ ... ]
    }
  }
}
```

#### D. Toggle Favorite (`PATCH /api/outfits/:id/favorite`)
**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Outfit marked as favorite",
  "data": {
    "outfit": {
      "_id": "65e0987654321fedcba00001",
      "isFavorite": true
    }
  }
}
```

---

## Postman Testing Guide (Phase 7)

### 17-Scenario Test Matrix

1. **Create Outfit with Multiple Items**:
   - `POST /api/outfits` with valid `name`, 3 valid user item IDs in `clothingItems`.
   - Expect: `201 Created` with populated clothing item details.
2. **Missing Name Validation**:
   - `POST /api/outfits` without `name`.
   - Expect: `400 Bad Request` (`"Outfit name is required"`).
3. **Empty Clothing Items Array**:
   - `POST /api/outfits` with `"clothingItems": []`.
   - Expect: `400 Bad Request` (`"An outfit must contain at least one clothing item"`).
4. **Invalid Clothing Item ID Format**:
   - `POST /api/outfits` with `"clothingItems": ["not-valid-id"]`.
   - Expect: `400 Bad Request` (`"Invalid clothing item ID format"`).
5. **Foreign User Item (IDOR Rejection)**:
   - `POST /api/outfits` containing another user's clothing item ID.
   - Expect: `400 Bad Request` (`"One or more clothing items do not exist or do not belong to you"`).
6. **Get All Outfits & Pagination**:
   - `GET /api/outfits?page=1&limit=12`.
   - Expect: `200 OK` with pagination metadata (`totalItems`, `currentPage`, `totalPages`, `limit`).
7. **Filter by Occasion**:
   - `GET /api/outfits?occasion=College`.
   - Expect: `200 OK` returning only outfits with `occasion === 'College'`.
8. **Filter by Season**:
   - `GET /api/outfits?season=Winter`.
   - Expect: `200 OK` returning only outfits with `season === 'Winter'`.
9. **Search by Outfit Name**:
   - `GET /api/outfits?search=Casual`.
   - Expect: `200 OK` returning outfits matching "Casual".
10. **Get Individual Outfit by ID**:
    - `GET /api/outfits/:id`.
    - Expect: `200 OK` with fully populated `clothingItems`.
11. **Update Outfit Metadata**:
    - `PUT /api/outfits/:id` with new `name` and `description`.
    - Expect: `200 OK`, unsupplied fields (like `occasion`, `season`) are preserved.
12. **Add Clothing Item via PATCH**:
    - `PATCH /api/outfits/:id/items` with `{"action": "add", "clothingItemIds": ["<NEW_ITEM_ID>"]}`.
    - Expect: `200 OK` with updated item list. Duplicate adds return `400 Bad Request`.
13. **Remove Clothing Item via PATCH**:
    - `PATCH /api/outfits/:id/items` with `{"action": "remove", "clothingItemIds": ["<EXISTING_ITEM_ID>"]}`.
    - Expect: `200 OK`. Attempting to remove all items returns `400 Bad Request` to prevent empty outfits.
14. **Toggle Favourite Status**:
    - `PATCH /api/outfits/:id/favorite`.
    - Expect: `200 OK`, `isFavorite` toggles from `false` $\rightarrow$ `true` $\rightarrow$ `false`.
15. **Delete Outfit (Without Deleting Items)**:
    - `DELETE /api/outfits/:id`.
    - Expect: `200 OK`. Subsequent `GET /api/outfits/:id` returns `404`. Checking `GET /api/clothes` confirms referenced clothing items still exist.
16. **Access Another User's Outfit (IDOR Isolation)**:
    - With User B's token, send `GET`, `PUT`, or `DELETE /api/outfits/<USER_A_OUTFIT_ID>`.
    - Expect: `404 Not Found`. Never exposes another user's outfits.
17. **Unauthenticated Request Rejection**:
    - Send `GET /api/outfits` without `Authorization` header.
    - Expect: `401 Unauthorized`.

---

## Phase 8: AI Outfit Recommendation System Integration

### 1. Architectural Flow & Separation of Concerns

```
+---------------------------------------------------------------------------------+
|                       Frontend (Web / React / Unity VR)                        |
|  - Sends user styling preferences (occasion, style, weather, colors)            |
|  - Displays recommended outfit cards with full garment previews                 |
+----------------------------------------+----------------------------------------+
                                         |
                                         | HTTP POST /api/recommendations/outfits
                                         | (Bearer JWT Auth)
                                         v
+---------------------------------------------------------------------------------+
|                       Node.js + Express Backend                                |
|  - Authenticates user via authMiddleware (protect)                             |
|  - Retrieves authenticated user's active wardrobe items from MongoDB           |
|  - Rejects request with HTTP 400 if wardrobe is empty                           |
|  - Formats wardrobe items into clean JSON schema (id, category, colors, etc.)   |
|  - Dispatches HTTP POST to external AI Recommendation Service                  |
|  - Enforces strict IDOR protection: verifies all recommended item IDs belong   |
|    to the authenticated user (filters/rejects foreign item IDs)                 |
|  - Populates full clothing item documents for frontend rendering               |
|  - Optionally records top recommendation to OutfitHistory collection           |
+----------------------------------------+----------------------------------------+
                                         |
                                         | HTTP POST /recommend/outfits
                                         | Payload: { wardrobe: [...], preferences: {...} }
                                         v
+---------------------------------------------------------------------------------+
|               External Python AI Recommendation Service (Teammate)             |
|  - Implements fashion recommendation models (matrix factorization / deep-learning|
|    / compatibility heuristics)                                                 |
|  - Evaluates wardrobe compatibility against occasion, style, and weather       |
|  - Returns structured recommended combinations with confidence & explanations  |
+---------------------------------------------------------------------------------+
```

---

### 2. Configuration & Environment Variables

Add to your `.env` file:

```env
AI_RECOMMENDATION_SERVICE_URL=http://127.0.0.1:8000
AI_RECOMMENDATION_TIMEOUT_MS=10000
AI_RECOMMENDATION_MOCK_FALLBACK=true
```

- `AI_RECOMMENDATION_SERVICE_URL`: URL where the external AI recommendation service is running.
- `AI_RECOMMENDATION_TIMEOUT_MS`: Request timeout in milliseconds (default: `10000` = 10s).
- `AI_RECOMMENDATION_MOCK_FALLBACK`: When `true`, if the recommendation service is unreachable or returns 404/502/503 during local development, an isolated mock adapter is used with `"isMock": true`.

---

### 3. API Contract for AI Teammate (Python Service)

The AI recommendation service (developed by the AI teammate) must expose:

- **Endpoint**: `POST /recommend/outfits`
- **Headers**: `Content-Type: application/json`

#### Request Payload sent by Node.js Backend:
```json
{
  "wardrobe": [
    {
      "id": "65e0123456789abcdef00001",
      "name": "Classic Denim Jacket",
      "category": "Jacket",
      "subCategory": "Denim Jacket",
      "color": "Blue",
      "secondaryColors": [],
      "pattern": "Solid",
      "material": "Denim",
      "season": ["Winter", "Autumn"],
      "occasion": ["Casual", "College"],
      "style": ["Casual"],
      "imageUrl": "/uploads/clothing/jacket.jpg",
      "isFavorite": false
    },
    {
      "id": "65e0123456789abcdef00002",
      "name": "Cotton White T-Shirt",
      "category": "T-Shirt",
      "subCategory": "Crewneck",
      "color": "White",
      "secondaryColors": [],
      "pattern": "Solid",
      "material": "Cotton",
      "season": ["Summer", "All Season"],
      "occasion": ["Casual", "College"],
      "style": ["Casual"],
      "imageUrl": "/uploads/clothing/tshirt.jpg",
      "isFavorite": true
    },
    {
      "id": "65e0123456789abcdef00003",
      "name": "Slim Fit Black Trousers",
      "category": "Trousers",
      "subCategory": "Chino",
      "color": "Black",
      "secondaryColors": [],
      "pattern": "Solid",
      "material": "Cotton",
      "season": ["All Season"],
      "occasion": ["Casual", "Formal", "College"],
      "style": ["Casual"],
      "imageUrl": "/uploads/clothing/pants.jpg",
      "isFavorite": false
    }
  ],
  "preferences": {
    "occasion": "College",
    "style": "Casual",
    "weather": "Winter",
    "preferredColors": ["Blue", "White"],
    "otherPreferences": "Warm and comfortable for walking"
  }
}
```

#### Expected Response from Python AI Service:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "outfitName": "Winter College Casual Ensemble",
        "clothingItemIds": [
          "65e0123456789abcdef00001",
          "65e0123456789abcdef00002",
          "65e0123456789abcdef00003"
        ],
        "confidence": 0.94,
        "explanation": "A classic layered winter college look pairing a blue denim jacket with a crisp white tee and versatile black chinos.",
        "occasion": "College",
        "style": "Casual",
        "season": "Winter"
      }
    ]
  }
}
```

---

### 4. Backend Recommendation API

#### Endpoint
`POST /api/recommendations/outfits` (Private, requires `Authorization: Bearer <TOKEN>`)

#### Request Body
```json
{
  "occasion": "College",
  "style": "Casual",
  "weather": "Winter",
  "preferredColors": ["Blue", "White"],
  "otherPreferences": "Warm and comfortable for walking",
  "saveToHistory": false
}
```

#### Successful Backend Response (`200 OK`)
```json
{
  "success": true,
  "message": "Outfit recommendations generated successfully",
  "data": {
    "recommendations": [
      {
        "outfitName": "Winter College Casual Ensemble",
        "clothingItems": [
          {
            "_id": "65e0123456789abcdef00001",
            "name": "Classic Denim Jacket",
            "category": "Jacket",
            "color": "Blue",
            "imageUrl": "/uploads/clothing/jacket.jpg"
          },
          {
            "_id": "65e0123456789abcdef00002",
            "name": "Cotton White T-Shirt",
            "category": "T-Shirt",
            "color": "White",
            "imageUrl": "/uploads/clothing/tshirt.jpg"
          },
          {
            "_id": "65e0123456789abcdef00003",
            "name": "Slim Fit Black Trousers",
            "category": "Trousers",
            "color": "Black",
            "imageUrl": "/uploads/clothing/pants.jpg"
          }
        ],
        "clothingItemIds": [
          "65e0123456789abcdef00001",
          "65e0123456789abcdef00002",
          "65e0123456789abcdef00003"
        ],
        "confidence": 0.94,
        "explanation": "A classic layered winter college look pairing a blue denim jacket with a crisp white tee and versatile black chinos.",
        "occasion": "College",
        "style": "Casual",
        "season": "Winter"
      }
    ],
    "preferences": {
      "occasion": "College",
      "style": "Casual",
      "weather": "Winter",
      "preferredColors": ["Blue", "White"],
      "otherPreferences": "Warm and comfortable for walking"
    },
    "isMock": false
  }
}
```

#### Error Responses
- **Empty Wardrobe (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Your wardrobe is empty. Please add clothing items before requesting recommendations."
  }
  ```
- **Unauthorized (`401 Unauthorized`)**: Missing or invalid Bearer token.
- **AI Service Unavailable (`503 Service Unavailable`)**: When external service is offline and `mockFallback=false`.
- **Gateway Timeout (`504 Gateway Timeout`)**: When external service exceeds `timeoutMs`.
- **Bad Gateway (`502 Bad Gateway`)**: When external AI service returns invalid JSON or unresolvable item IDs.

---

## Postman Testing Guide (Phase 8)

1. **Unauthenticated Request**:
   - `POST http://localhost:5000/api/recommendations/outfits` without `Authorization` header.
   - Expect: `401 Unauthorized`.
2. **Empty Wardrobe Check**:
   - Register a fresh user (`POST /api/auth/register`) with zero clothing items.
   - Send `POST http://localhost:5000/api/recommendations/outfits`.
   - Expect: `400 Bad Request` with message `"Your wardrobe is empty. Please add clothing items before requesting recommendations."`
3. **Valid Recommendation with Preferences**:
   - Add 3 clothing items (shirt, pants, jacket) using `POST /api/clothes`.
   - Send `POST http://localhost:5000/api/recommendations/outfits` with preferences in body.
   - Expect: `200 OK` with populated `clothingItems`, confidence, and explanation.
4. **Save to History Verification**:
   - Send `POST /api/recommendations/outfits` with `"saveToHistory": true`.
   - Expect: `200 OK` with a non-null `data.historyId`.
5. **IDOR Multi-Tenant Verification**:
   - Create users A and B. Request recommendations for User A.
   - Verify that all recommended items strictly belong to User A and no items belonging to User B are ever returned.

---

## Phase 9: Security, Optimization & Integration Readiness

### 1. Security Architecture & Controls

- **Password Hashing**: `bcryptjs` with salt round factor of 10 applied in Mongoose pre-save middleware. Password hashes are never returned in JSON or query projections.
- **JWT Protection & Expiration**: Strict Bearer token verification with token expiration checks and user existence validation on every protected route.
- **Multi-Tenant IDOR Isolation**:
  - Every resource query filters by `userId: req.user._id`.
  - Creating outfits validates that all referenced clothing item IDs belong to the caller.
  - Updating or deleting items or outfits belonging to another user returns `404 Not Found` (never leaks existence).
  - AI outfit recommendation requests strictly filter out any foreign item references.
- **Technology Leakage Prevention**: `app.disable('x-powered-by')` removes Express fingerprints from HTTP response headers.
- **Flexible CORS Whitelist**: Supports single or comma-separated origins from `CLIENT_URL`, allowing seamless integration with Vite (`http://localhost:5173`), Next.js, and mobile / desktop VR clients.
- **Request Body Flood Protection**: Express body parsers explicitly capped at `10mb` (`express.json({ limit: '10mb' })`).
- **File Upload Guardrails**: Multer restricts uploads to JPEG, JPG, PNG, and WEBP with a 5 MB file size ceiling and randomized UUID filenames to eliminate path traversal vulnerabilities.

---

### 2. Database Optimization Matrix

| Collection | Compound Indexes | Optimization Target |
| :--- | :--- | :--- |
| `ClothingItem` | `{ userId: 1, category: 1 }` | Fast filtering by user and clothing category |
| `ClothingItem` | `{ userId: 1, isFavorite: 1 }` | Quick retrieval of favorite garments |
| `ClothingItem` | `{ userId: 1, createdAt: -1 }` | Accelerated sorting by latest added garments |
| `Outfit` | `{ userId: 1, createdAt: -1 }` | Rapid pagination and sorting of user's curated outfits |
| `Outfit` | `{ userId: 1, occasion: 1 }` | Fast filtering of outfits by event occasion |
| `OutfitHistory` | `{ userId: 1, wornDate: -1 }` | Chronological wear history and timeline analytics |
| `User` | `{ email: 1 }` (unique) | O(1) email lookups during login & registration |

---

### 3. Master API Quick Reference

| Method | Endpoint | Access | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Backend server and MongoDB connection health check |
| `POST` | `/api/auth/register` | Public | Register new user account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and return signed JWT |
| `POST` | `/api/auth/logout` | Public | Instruct client to clear stored JWT credentials |
| `GET` | `/api/users/profile` | Private | Retrieve authenticated user profile (password excluded) |
| `PUT` | `/api/users/profile` | Private | Update profile details (email/password tampering protected) |
| `POST` | `/api/clothes` | Private | Add new clothing item to digital wardrobe |
| `GET` | `/api/clothes` | Private | List wardrobe items with multi-filtering, search, & pagination |
| `GET` | `/api/clothes/:id` | Private | Retrieve single clothing item by ID (IDOR protected) |
| `PUT` | `/api/clothes/:id` | Private | Update clothing item attributes |
| `DELETE` | `/api/clothes/:id` | Private | Delete clothing item and clean up local image file |
| `PATCH` | `/api/clothes/:id/favorite` | Private | Toggle clothing item favorite flag |
| `POST` | `/api/clothes/:id/image` | Private | Upload or replace clothing garment image (Multer) |
| `DELETE` | `/api/clothes/:id/image` | Private | Delete garment image from disk and clear DB reference |
| `POST` | `/api/clothes/:id/analyze` | Private | Dispatch garment image to AI recognition service |
| `GET` | `/api/clothes/:id/analysis` | Private | Retrieve garment AI analysis details and confidence |
| `PATCH` | `/api/clothes/:id/analysis` | Private | Manually correct AI prediction fields |
| `POST` | `/api/clothes/:id/reanalyze` | Private | Re-run AI analysis with edit preservation policy |
| `POST` | `/api/outfits` | Private | Create outfit with $\ge 1$ owned clothing item references |
| `GET` | `/api/outfits` | Private | List outfits with pagination, filters, and search |
| `GET` | `/api/outfits/:id` | Private | Retrieve single outfit with populated clothing details |
| `PUT` | `/api/outfits/:id` | Private | Update outfit metadata and items |
| `DELETE` | `/api/outfits/:id` | Private | Delete outfit document (referenced clothing items preserved) |
| `PATCH` | `/api/outfits/:id/favorite` | Private | Toggle outfit favorite flag |
| `PATCH` | `/api/outfits/:id/items` | Private | Add or remove clothing items without emptying outfit |
| `POST` | `/api/recommendations/outfits` | Private | Request AI outfit recommendations based on wardrobe & preferences |

---

## Running Automated Tests

All tests run locally against the local MongoDB instance using clean ephemeral mock data that automatically rolls back upon completion:

```bash
# Run all 107 test assertions across all 9 backend phases
npm test

# Run only Phase 9 Security & Integration tests (15 assertions)
npm run test:security

# Run only Phase 8 AI Recommendation tests (11 assertions)
npm run test:recommendations

# Run only Phase 7 Outfit Management tests (26 assertions)
npm run test:outfits

# Run only Phase 6 AI Recognition tests (13 assertions)
npm run test:ai

# Run only Phase 5 Image Upload tests (14 assertions)
npm run test:upload

# Run only Phase 4 CRUD tests (14 assertions)
npm run test:clothes

# Run only Phase 3 Auth tests (14 assertions)
npm run test:auth

# Run only Phase 2 Model tests
npm run test:models
```

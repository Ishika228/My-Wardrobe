# WardrobeWise — Member 1: Frontend + 3D Virtual Room

A local React + Vite starter for the WardrobeWise virtual dressing room. It uses React Three Fiber, Three.js and Drei. No paid API keys, backend, or database are required for this demo.

## Requirements
- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm

## Run locally
1. Extract the ZIP.
2. Open a terminal in this folder (the folder containing `package.json`).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Features included
- Interactive 3D dressing room with orbit/zoom controls.
- Clothing rail, hangers, shelves, mirror, bench, rug, plant and mannequin.
- Sample closet with category filters and search.
- Select/remove pieces; selected colours update the mannequin.
- Occasion selector and simple outfit suggestion presets.
- Save-look button (demo UI state only).
- Responsive dashboard layout.

## Notes
- This is the frontend/3D prototype for Member 1. The sample wardrobe is hard-coded in `src/App.jsx` for now.
- The Save look button currently changes local UI state only; connect it to Member 2's outfit API later.
- The occasion suggestions are starter presets, not the final AI engine. Connect Member 3's recommendation endpoint later.
- The 3D mannequin uses simple primitive geometry as a placeholder. Replace it with a licensed GLB/GLTF avatar and garment assets when available.
- This is a desktop 3D experience, not immersive VR yet. WebXR/headset support can be added after the core room is stable.
- The Google Fonts import is optional; if offline, the app falls back to sans-serif fonts.

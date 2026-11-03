import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default Tripo3D OpenAPI v3 base URLs
 */
const DEFAULT_TRIPO_BASE_URL = 'https://openapi.tripo3d.ai/v3';

/**
 * Returns configuration status of Tripo3D API
 */
export const getTripoConfig = () => {
  const apiKey = (process.env.TRIPO_API_KEY || '').trim();
  const rawBase = (process.env.TRIPO_API_BASE_URL || '').trim();
  const baseUrl = rawBase.replace(/\/+$/, '') || DEFAULT_TRIPO_BASE_URL;

  return {
    isConfigured: !!apiKey && apiKey !== 'your_tripo_api_key_here' && apiKey.length > 5,
    apiKey,
    baseUrl,
  };
};

/**
 * Uploads an image buffer or file path to Tripo's file storage API
 * Endpoint: POST /v3/files
 * Returns: file_token (string)
 */
export const uploadImageToTripo = async (imageInput, filename = 'clothing.png', mimeType = 'image/png') => {
  const { apiKey, baseUrl, isConfigured } = getTripoConfig();

  if (!isConfigured) {
    throw new Error(
      'TRIPO_API_KEY is not configured in backend/.env. Please obtain an API key from https://platform.tripo3d.ai/'
    );
  }

  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string' && fs.existsSync(imageInput)) {
    buffer = fs.readFileSync(imageInput);
    filename = path.basename(imageInput);
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (filename.endsWith('.webp')) mimeType = 'image/webp';
    else mimeType = 'image/png';
  } else {
    throw new Error('Invalid image input for Tripo upload: must be a Buffer or valid file path.');
  }

  // Node 24 native Blob & FormData
  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);

  const uploadUrl = `${baseUrl}/files`;
  console.log(`[Tripo Service] Uploading ${filename} (${buffer.length} bytes) to ${uploadUrl}...`);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tripo file upload failed (HTTP ${response.status}): ${errorBody}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data?.file_token) {
    throw new Error(`Tripo file upload returned error code: ${JSON.stringify(json)}`);
  }

  console.log(`[Tripo Service] Upload successful. File token: ${json.data.file_token}`);
  return json.data.file_token;
};

/**
 * Creates an asynchronous Image-to-3D generation task in Tripo3D API v3
 * Endpoint: POST /v3/generation/image-to-model
 * Returns: task_id (string)
 */
export const createImageTo3DTask = async (fileTokenOrUrl, options = {}) => {
  const { apiKey, baseUrl, isConfigured } = getTripoConfig();

  if (!isConfigured) {
    throw new Error(
      'TRIPO_API_KEY is not configured in backend/.env. Please obtain an API key from https://platform.tripo3d.ai/'
    );
  }

  const isUrl = typeof fileTokenOrUrl === 'string' && fileTokenOrUrl.startsWith('http');
  const payload = {
    type: 'image_to_model',
    model: options.model || 'v3.1-20260211',
    input: isUrl
      ? { url: fileTokenOrUrl }
      : { file_token: fileTokenOrUrl },
    texture: options.texture !== false,
    pbr: options.pbr !== false,
  };

  const endpointUrl = `${baseUrl}/generation/image-to-model`;
  console.log(`[Tripo Service] Creating 3D generation task at ${endpointUrl}...`);

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tripo task creation failed (HTTP ${response.status}): ${errorBody}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data?.task_id) {
    throw new Error(`Tripo task creation returned error code: ${JSON.stringify(json)}`);
  }

  console.log(`[Tripo Service] Task created successfully. Task ID: ${json.data.task_id}`);
  return json.data.task_id;
};

/**
 * Polls status and progress of a Tripo generation task
 * Endpoint: GET /v3/tasks/:task_id
 * Returns: { taskId, status, progress, output, raw }
 */
export const getTaskStatusFromTripo = async (taskId) => {
  const { apiKey, baseUrl, isConfigured } = getTripoConfig();

  if (!isConfigured) {
    throw new Error('TRIPO_API_KEY is not configured in backend/.env.');
  }

  const endpointUrl = `${baseUrl}/tasks/${taskId}`;
  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tripo poll status failed (HTTP ${response.status}): ${errorBody}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data) {
    throw new Error(`Tripo poll status returned error: ${JSON.stringify(json)}`);
  }

  const data = json.data;
  return {
    taskId: data.task_id || taskId,
    status: (data.status || 'unknown').toLowerCase(),
    progress: typeof data.progress === 'number' ? data.progress : 0,
    output: data.output || {},
    modelUrl: data.output?.model_url || null,
    renderedImageUrl: data.output?.rendered_image_url || null,
    raw: data,
  };
};

/**
 * Downloads a remote GLB asset immediately (CDN links expire in 5 minutes)
 * and saves to permanent local backend & frontend storage.
 * Returns: local serving URL
 */
export const downloadAndPersistGlb = async (remoteUrl, outputFilename) => {
  if (!remoteUrl || !remoteUrl.startsWith('http')) {
    throw new Error(`Invalid remote GLB URL for download: ${remoteUrl}`);
  }

  console.log(`[Tripo Service] Downloading GLB asset from ${remoteUrl}...`);
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to download GLB asset (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Save in backend uploads/models/
  const backendDir = path.resolve('uploads', 'models');
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  const backendFilePath = path.join(backendDir, outputFilename);
  fs.writeFileSync(backendFilePath, buffer);

  // 2. Also save in Frontend/public/models/generated/ for direct client static loading
  try {
    const frontendDir = path.resolve('..', 'Frontend', 'public', 'models', 'generated');
    if (fs.existsSync(path.resolve('..', 'Frontend', 'public'))) {
      if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
      fs.writeFileSync(path.join(frontendDir, outputFilename), buffer);
    }
  } catch (feErr) {
    console.warn(`[Tripo Service] Could not copy to Frontend/public/models/generated: ${feErr.message}`);
  }

  const localServeUrl = `/uploads/models/${outputFilename}`;
  console.log(`[Tripo Service] GLB asset saved successfully (${buffer.length} bytes) to ${backendFilePath}`);
  return {
    localFilePath: backendFilePath,
    localUrl: localServeUrl,
    size: buffer.length,
  };
};

/**
 * In-memory registry for mock/simulated tasks when TRIPO_API_KEY is not yet supplied by user
 */
const mockTasks = new Map();

/**
 * Simulates a cloud generation task for testing when TRIPO_API_KEY is missing
 */
export const createSimulatedTask = (category = 'dress', originalImage = '') => {
  const taskId = `sim_tripo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cat = (category || '').toLowerCase();

  let targetGlb = 'dress_floral_puff.glb';
  let silhouette = 'floral-puff';

  if (cat.includes('bottom') || cat.includes('jean') || cat.includes('trouser')) {
    targetGlb = 'trouser_jeans.glb';
    silhouette = 'wide-jeans';
  } else if (cat.includes('top') || cat.includes('shirt')) {
    targetGlb = 'top_casual.glb';
    silhouette = 'casual-top';
  } else if (cat.includes('saree') || cat.includes('ethnic')) {
    targetGlb = 'dress_saree.glb';
    silhouette = 'saree';
  } else if (cat.includes('slip') || cat.includes('gown')) {
    targetGlb = 'dress_slip.glb';
    silhouette = 'slip-dress';
  }

  mockTasks.set(taskId, {
    taskId,
    status: 'queued',
    progress: 0,
    category,
    silhouette,
    targetGlb,
    startTime: Date.now(),
    originalImage,
  });

  return taskId;
};

/**
 * Advances and returns the simulated task status
 */
export const getSimulatedTaskStatus = (taskId) => {
  const task = mockTasks.get(taskId);
  if (!task) return null;

  const elapsed = (Date.now() - task.startTime) / 1000;

  if (elapsed < 2.0) {
    task.status = 'queued';
    task.progress = 10;
  } else if (elapsed < 5.0) {
    task.status = 'running';
    task.progress = Math.min(85, Math.floor(10 + (elapsed - 2) * 25));
  } else {
    task.status = 'success';
    task.progress = 100;
    task.output = {
      model_url: `/models/garments/${task.targetGlb}`,
      rendered_image_url: task.originalImage || '/models/garments/pink_floral_texture.png',
      silhouette: task.silhouette,
    };
  }

  return {
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
    output: task.output || {},
    modelUrl: task.output?.model_url || null,
    renderedImageUrl: task.output?.rendered_image_url || null,
    isSimulated: true,
  };
};


/**
 * tripoGarmentService.js
 * Frontend client for Cloud-Based 2D-to-3D Garment Generation
 * Powered by Google Gemini Multimodal AI & Cloud 3D Engine.
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Checks AI 3D garment generation configuration status on the backend
 */
export async function getTripoApiConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/garments/config`);
    if (!res.ok) return { isConfigured: false, instructions: '' };
    const json = await res.json();
    return json.data || { isConfigured: false, instructions: '' };
  } catch (err) {
    console.warn('[tripoGarmentService] Could not reach garment config endpoint:', err.message);
    return { isConfigured: false, instructions: '' };
  }
}

/**
 * Initiates 2D-to-3D garment generation on the backend via Gemini Multimodal AI
 * @param {File|Blob|string} imageSource - File object or image URL
 * @param {object} metadata - { category, name, clothingItemId, color }
 */
export async function start3DGarmentGeneration(imageSource, metadata = {}) {
  let response;

  if (imageSource instanceof File || imageSource instanceof Blob) {
    const formData = new FormData();
    formData.append('image', imageSource);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.clothingItemId) formData.append('clothingItemId', metadata.clothingItemId);
    if (metadata.name) formData.append('name', metadata.name);

    response = await fetch(`${API_BASE_URL}/garments/generate-3d`, {
      method: 'POST',
      body: formData,
    });
  } else {
    response = await fetch(`${API_BASE_URL}/garments/generate-3d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalImageUrl: typeof imageSource === 'string' ? imageSource : '',
        category: metadata.category || 'dress',
        clothingItemId: metadata.clothingItemId || null,
        name: metadata.name || '',
      }),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to initiate 3D garment generation (HTTP ${response.status}): ${errorText}`);
  }

  const json = await response.json();
  if (!json.success || !json.data?.taskId) {
    throw new Error(json.message || 'Server did not return a valid task ID');
  }

  return json.data;
}

/**
 * Polls 3D generation task until complete, invoking onProgress callback
 * @param {string} taskId - The task ID to poll
 * @param {function} onProgress - Callback receiving { progress, status }
 * @param {number} maxAttempts - Maximum polling attempts (default: 60 = 2 minutes)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 1500)
 * @param {object} initialData - Optional pre-resolved task data from start3DGarmentGeneration
 */
export async function pollGarmentGenerationTask(
  taskId,
  onProgress = null,
  maxAttempts = 60,
  intervalMs = 1500,
  initialData = null
) {
  // Fast path: If Gemini already completed in the initial request
  if (initialData && initialData.status === 'success') {
    if (typeof onProgress === 'function') {
      onProgress({
        progress: 100,
        status: 'success',
        modelUrl: initialData.modelUrl,
      });
    }
    return {
      success: true,
      taskId: initialData.taskId,
      modelUrl: initialData.modelUrl,
      renderedImageUrl: initialData.renderedImageUrl,
      silhouette: initialData.silhouette || 'custom',
      geminiAnalysis: initialData.geminiAnalysis,
      isSimulated: false,
    };
  }

  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const res = await fetch(`${API_BASE_URL}/garments/tasks/${taskId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} when checking task status`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || 'Failed to retrieve task data');
      }

      const task = json.data;
      if (typeof onProgress === 'function') {
        onProgress({
          progress: task.progress || 0,
          status: task.status || 'running',
          modelUrl: task.modelUrl,
        });
      }

      if (task.status === 'success') {
        return {
          success: true,
          taskId: task.taskId,
          modelUrl: task.modelUrl,
          renderedImageUrl: task.renderedImageUrl,
          silhouette: task.silhouette || 'custom',
          geminiAnalysis: task.geminiAnalysis,
          isSimulated: task.isSimulated || false,
        };
      }

      if (task.status === 'failed' || task.status === 'cancelled') {
        throw new Error(task.errorMessage || 'Cloud 3D garment generation failed or was cancelled');
      }
    } catch (pollErr) {
      console.warn(`[tripoGarmentService] Polling attempt ${attempts} warning:`, pollErr.message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('3D garment generation timed out after 2 minutes.');
}

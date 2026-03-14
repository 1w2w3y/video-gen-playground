const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface VideoJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt: string;
  width: number;
  height: number;
  duration: number;
  variants: number;
  model: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  generations: { id: string }[];
}

export interface AppConfig {
  provider: 'azure' | 'openai';
  azureEndpoint: string;
  azureDeploymentName: string;
  hasOpenaiKey: boolean;
}

export const api = {
  createVideo(data: {
    prompt: string;
    width: number;
    height: number;
    duration: number;
    variants: number;
    model?: string;
    inputImageBase64?: string;
    inputImageMediaType?: string;
  }) {
    return apiFetch<VideoJob>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listVideos() {
    return apiFetch<VideoJob[]>('/videos');
  },

  getVideo(id: string) {
    return apiFetch<VideoJob>(`/videos/${id}`);
  },

  deleteVideo(id: string) {
    return apiFetch<{ success: boolean }>(`/videos/${id}`, { method: 'DELETE' });
  },

  getVideoContentUrl(id: string) {
    return `${API_BASE}/videos/${id}/content`;
  },

  extendVideo(data: { videoId: string; prompt: string; duration?: number }) {
    return apiFetch<VideoJob>('/videos/extensions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  editVideo(data: { videoId: string; prompt: string }) {
    return apiFetch<VideoJob>('/videos/edits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getConfig() {
    return apiFetch<AppConfig>('/config');
  },

  updateConfig(data: Partial<{
    provider: string;
    azureEndpoint: string;
    azureDeploymentName: string;
    openaiApiKey: string;
  }>) {
    return apiFetch<AppConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

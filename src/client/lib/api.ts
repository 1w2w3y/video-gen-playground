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
  hasAzureEndpoint: boolean;
  azureDeploymentName: string;
  hasOpenaiKey: boolean;
  adminEnabled: boolean;
}

// localStorage-backed job ID tracker
const JOB_STORE_KEY = 'video-gen-job-ids';

export const jobStore = {
  getIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem(JOB_STORE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  addId(id: string) {
    const ids = this.getIds();
    if (!ids.includes(id)) {
      ids.unshift(id); // newest first
      localStorage.setItem(JOB_STORE_KEY, JSON.stringify(ids));
    }
  },

  removeId(id: string) {
    const ids = this.getIds().filter(i => i !== id);
    localStorage.setItem(JOB_STORE_KEY, JSON.stringify(ids));
  },
};

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

  getVideo(id: string) {
    return apiFetch<VideoJob>(`/videos/${id}`);
  },

  deleteVideo(id: string) {
    return apiFetch<{ success: boolean }>(`/videos/${id}`, { method: 'DELETE' });
  },

  getVideoContentUrl(id: string) {
    return `${API_BASE}/videos/${id}/content`;
  },

  editVideo(data: { videoId: string; prompt: string }) {
    return apiFetch<VideoJob>('/videos/edits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin endpoints — list all jobs from remote API
  adminListVideos() {
    return apiFetch<VideoJob[]>('/admin/videos');
  },

  adminDeleteVideo(id: string) {
    return apiFetch<{ success: boolean }>(`/admin/videos/${id}`, { method: 'DELETE' });
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

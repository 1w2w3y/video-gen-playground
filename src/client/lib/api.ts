import { trackEvent, trackException } from './telemetry';

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
    const err = new Error(body.error || `Request failed: ${res.status}`);
    trackException(err, { path, status: String(res.status) });
    throw err;
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
  appInsightsConnectionString?: string;
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
  async createVideo(data: {
    prompt: string;
    width: number;
    height: number;
    duration: number;
    model?: string;
  }) {
    const job = await apiFetch<VideoJob>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    trackEvent('VideoCreated', {
      jobId: job.id,
      resolution: `${data.width}x${data.height}`,
      duration: String(data.duration),
    });
    return job;
  },

  getVideo(id: string) {
    return apiFetch<VideoJob>(`/videos/${id}`);
  },

  async deleteVideo(id: string) {
    const result = await apiFetch<{ success: boolean }>(`/videos/${id}`, { method: 'DELETE' });
    trackEvent('VideoDeleted', { jobId: id });
    return result;
  },

  getVideoContentUrl(id: string) {
    return `${API_BASE}/videos/${id}/content`;
  },

  async editVideo(data: { videoId: string; prompt: string }) {
    const job = await apiFetch<VideoJob>('/videos/edits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    trackEvent('VideoEditStarted', { sourceJobId: data.videoId, newJobId: job.id });
    return job;
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

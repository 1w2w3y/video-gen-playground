import { getAzureToken } from '../auth/azure-credential.js';
import { getConfig } from '../config.js';
import type { CreateVideoRequest, VideoJob, VideoAdapter, EditVideoRequest } from './types.js';

function mapStatus(azureStatus: string): VideoJob['status'] {
  switch (azureStatus) {
    case 'queued': return 'queued';
    case 'preprocessing':
    case 'running':
    case 'processing':
    case 'in_progress':
      return 'processing';
    case 'succeeded':
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    default: return 'processing';
  }
}

function sizeString(w: number, h: number): string {
  return `${w}x${h}`;
}

function parseSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map(Number);
  return { width: w || 1280, height: h || 720 };
}

function mapJob(data: any): VideoJob {
  const size = data.size ? parseSize(data.size) : { width: data.width || 1280, height: data.height || 720 };
  return {
    id: data.id,
    status: mapStatus(data.status),
    prompt: data.prompt || '',
    width: size.width,
    height: size.height,
    duration: data.seconds || data.n_seconds || 0,
    variants: data.n || data.n_variants || 1,
    model: data.model || '',
    createdAt: data.created_at ? new Date(data.created_at * 1000).toISOString() : new Date().toISOString(),
    completedAt: data.completed_at || data.finished_at ? new Date((data.completed_at || data.finished_at) * 1000).toISOString() : null,
    error: data.error?.message || data.failure_reason || null,
    generations: data.generations || (data.id && data.status === 'completed' ? [{ id: data.id }] : []),
  };
}

async function azureFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  const token = await getAzureToken();
  const url = `${config.azureEndpoint}${path}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...options.headers as Record<string, string>,
  };
  if (!headers['Content-Type'] && options.method !== 'GET' && options.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Azure API error ${res.status}: ${body}`);
  }
  return res;
}

export const azureAdapter: VideoAdapter = {
  async createVideo(req: CreateVideoRequest): Promise<VideoJob> {
    const config = getConfig();
    const body: any = {
      prompt: req.prompt,
      size: sizeString(req.width, req.height),
      seconds: String(req.duration),
      model: config.azureDeploymentName,
    };
    if (req.variants > 1) body.n = req.variants;

    const res = await azureFetch('/openai/v1/videos', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return mapJob(data);
  },

  async getVideo(id: string): Promise<VideoJob> {
    const res = await azureFetch(`/openai/v1/videos/${id}`);
    const data = await res.json();
    return mapJob(data);
  },

  async listVideos(): Promise<VideoJob[]> {
    const res = await azureFetch('/openai/v1/videos');
    const data = await res.json();
    const items = data.data || data || [];
    return Array.isArray(items) ? items.map(mapJob) : [];
  },

  async deleteVideo(id: string): Promise<void> {
    await azureFetch(`/openai/v1/videos/${id}`, { method: 'DELETE' });
  },

  async getVideoContent(id: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    const res = await azureFetch(`/openai/v1/videos/${id}/content?variant=video`);
    return {
      stream: res.body as unknown as NodeJS.ReadableStream,
      contentType: res.headers.get('content-type') || 'video/mp4',
    };
  },

  async editVideo(req: EditVideoRequest): Promise<VideoJob> {
    const body: any = { prompt: req.prompt };
    const res = await azureFetch(`/openai/v1/videos/${req.videoId}/remix`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return mapJob(data);
  },
};

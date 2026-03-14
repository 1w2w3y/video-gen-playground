import { getConfig } from '../config.js';
import type { CreateVideoRequest, VideoJob, VideoAdapter, ExtendVideoRequest, EditVideoRequest } from './types.js';

const OPENAI_BASE = 'https://api.openai.com/v1';

function mapStatus(status: string): VideoJob['status'] {
  switch (status) {
    case 'queued': return 'queued';
    case 'in_progress': return 'processing';
    case 'completed': return 'completed';
    case 'failed':
    case 'expired':
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
  const size = data.size ? parseSize(data.size) : { width: 1280, height: 720 };
  return {
    id: data.id,
    status: mapStatus(data.status),
    prompt: data.prompt || '',
    width: size.width,
    height: size.height,
    duration: data.seconds || 0,
    variants: data.n || 1,
    model: data.model || 'sora-2',
    createdAt: data.created_at ? new Date(data.created_at * 1000).toISOString() : new Date().toISOString(),
    completedAt: data.completed_at ? new Date(data.completed_at * 1000).toISOString() : null,
    error: data.error?.message || null,
    generations: data.id && (data.status === 'completed') ? [{ id: data.id }] : [],
  };
}

async function openAiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.openaiApiKey}`,
    ...options.headers as Record<string, string>,
  };
  if (!headers['Content-Type'] && options.method !== 'GET' && options.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${OPENAI_BASE}${path}`, { ...options, headers });
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }
  return res;
}

export const openaiAdapter: VideoAdapter = {
  async createVideo(req: CreateVideoRequest): Promise<VideoJob> {
    const body: any = {
      model: req.model || 'sora-2',
      prompt: req.prompt,
      size: sizeString(req.width, req.height),
      seconds: req.duration,
    };
    if (req.variants > 1) body.n = req.variants;

    const res = await openAiFetch('/videos', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return mapJob(data);
  },

  async getVideo(id: string): Promise<VideoJob> {
    const res = await openAiFetch(`/videos/${id}`);
    const data = await res.json();
    return mapJob(data);
  },

  async listVideos(): Promise<VideoJob[]> {
    const res = await openAiFetch('/videos?limit=50');
    const data = await res.json();
    const items = data.data || [];
    return items.map(mapJob);
  },

  async deleteVideo(id: string): Promise<void> {
    await openAiFetch(`/videos/${id}`, { method: 'DELETE' });
  },

  async getVideoContent(id: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
    const res = await openAiFetch(`/videos/${id}/content?variant=video`);
    return {
      stream: res.body as unknown as NodeJS.ReadableStream,
      contentType: res.headers.get('content-type') || 'video/mp4',
    };
  },

  async extendVideo(req: ExtendVideoRequest): Promise<VideoJob> {
    const body: any = {
      video: { id: req.videoId },
      prompt: req.prompt,
    };
    if (req.duration) body.seconds = req.duration;

    const res = await openAiFetch('/videos/extensions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return mapJob(data);
  },

  async editVideo(req: EditVideoRequest): Promise<VideoJob> {
    const body = {
      video: { id: req.videoId },
      prompt: req.prompt,
    };

    const res = await openAiFetch('/videos/edits', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return mapJob(data);
  },
};

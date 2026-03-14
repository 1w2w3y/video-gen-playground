import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { videosRouter } from './videos.js';

const mockAdapter = {
  createVideo: vi.fn(),
  getVideo: vi.fn(),
  listVideos: vi.fn(),
  deleteVideo: vi.fn(),
  getVideoContent: vi.fn(),
  editVideo: vi.fn(),
};

vi.mock('../adapters/index.js', () => ({
  getAdapter: () => mockAdapter,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/videos', videosRouter);
  return app;
}

async function request(app: express.Express, method: string, path: string, body?: any) {
  return new Promise<{ status: number; body: any }>((resolve) => {
    const { createServer } = require('http');
    const server = createServer(app);
    server.listen(0, async () => {
      const addr = server.address();
      const port = typeof addr === 'object' ? addr?.port : 0;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await res.json().catch(() => ({}));
        resolve({ status: res.status, body: json });
      } finally {
        server.close();
      }
    });
  });
}

const sampleJob = {
  id: 'v1',
  status: 'queued',
  prompt: 'test',
  width: 1280,
  height: 720,
  duration: 8,
  variants: 1,
  model: 'sora-2',
  createdAt: '2024-01-01T00:00:00.000Z',
  completedAt: null,
  error: null,
  generations: [],
};

describe('videos routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('POST /api/videos', () => {
    it('creates a video job', async () => {
      mockAdapter.createVideo.mockResolvedValue(sampleJob);

      const res = await request(app, 'POST', '/api/videos', {
        prompt: 'test',
        width: 1280,
        height: 720,
        duration: 8,
        variants: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('v1');
      expect(mockAdapter.createVideo).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'test', width: 1280 }),
      );
    });

    it('returns 500 on adapter error', async () => {
      mockAdapter.createVideo.mockRejectedValue(new Error('API down'));

      const res = await request(app, 'POST', '/api/videos', { prompt: 'test' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('API down');
    });
  });

  describe('GET /api/videos/:id', () => {
    it('gets a video by id', async () => {
      mockAdapter.getVideo.mockResolvedValue(sampleJob);

      const res = await request(app, 'GET', '/api/videos/v1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('v1');
    });
  });

  describe('DELETE /api/videos/:id', () => {
    it('deletes a video', async () => {
      mockAdapter.deleteVideo.mockResolvedValue(undefined);

      const res = await request(app, 'DELETE', '/api/videos/v1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/videos/edits', () => {
    it('edits a video', async () => {
      mockAdapter.editVideo.mockResolvedValue({ ...sampleJob, id: 'v-edit' });

      const res = await request(app, 'POST', '/api/videos/edits', {
        videoId: 'v1',
        prompt: 'make it blue',
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('v-edit');
    });
  });
});

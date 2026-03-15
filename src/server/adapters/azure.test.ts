import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../auth/azure-credential.js', () => ({
  getAzureToken: vi.fn().mockResolvedValue('mock-azure-token'),
}));

vi.mock('../config.js', () => ({
  getConfig: vi.fn().mockReturnValue({
    provider: 'azure',
    azureEndpoint: 'https://test.azure.com',
    azureDeploymentName: 'sora-2',
    openaiApiKey: '',
  }),
}));

import { azureAdapter } from './azure.js';

function mockFetchResponse(data: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'video/mp4' }),
    body: null,
  });
}

describe('azureAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createVideo', () => {
    it('sends correct payload and maps response', async () => {
      const responseData = {
        id: 'video-123',
        status: 'queued',
        prompt: 'A cat',
        size: '1280x720',
        seconds: 8,
        n: 1,
        model: 'sora-2',
        created_at: 1700000000,
      };
      globalThis.fetch = mockFetchResponse(responseData);

      const job = await azureAdapter.createVideo({
        prompt: 'A cat',
        width: 1280,
        height: 720,
        duration: 8,
        variants: 1,
      });

      expect(job.id).toBe('video-123');
      expect(job.status).toBe('queued');
      expect(job.prompt).toBe('A cat');
      expect(job.width).toBe(1280);
      expect(job.height).toBe(720);

      // Verify fetch was called with correct URL and body
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.azure.com/openai/v1/videos',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-azure-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('does not include n even when variants > 1', async () => {
      globalThis.fetch = mockFetchResponse({ id: 'v1', status: 'queued', created_at: 1700000000 });

      await azureAdapter.createVideo({
        prompt: 'A dog',
        width: 1280,
        height: 720,
        duration: 4,
        variants: 3,
      });

      const call = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.n).toBeUndefined();
    });
  });

  describe('listVideos', () => {
    it('maps array of jobs', async () => {
      globalThis.fetch = mockFetchResponse({
        data: [
          { id: 'v1', status: 'completed', size: '1920x1080', created_at: 1700000000, seconds: 8 },
          { id: 'v2', status: 'running', size: '720x1280', created_at: 1700000000, seconds: 4 },
        ],
      });

      const jobs = await azureAdapter.listVideos();
      expect(jobs).toHaveLength(2);
      expect(jobs[0].status).toBe('completed');
      expect(jobs[1].status).toBe('processing'); // running → processing
    });
  });

  describe('getVideo', () => {
    it('fetches a single video by id', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'succeeded',
        prompt: 'sunset',
        size: '1280x720',
        seconds: 12,
        created_at: 1700000000,
        completed_at: 1700001000,
        generations: [{ id: 'gen-1' }],
      });

      const job = await azureAdapter.getVideo('v1');
      expect(job.id).toBe('v1');
      expect(job.status).toBe('completed'); // succeeded → completed
      expect(job.completedAt).not.toBeNull();
      expect(job.generations).toEqual([{ id: 'gen-1' }]);
    });
  });

  describe('deleteVideo', () => {
    it('calls DELETE endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });

      await azureAdapter.deleteVideo('v1');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.azure.com/openai/v1/videos/v1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('editVideo', () => {
    it('sends remix request to correct endpoint', async () => {
      globalThis.fetch = mockFetchResponse({ id: 'v-edit', status: 'queued', created_at: 1700000000 });

      const job = await azureAdapter.editVideo!({
        videoId: 'v1',
        prompt: 'make it blue',
      });

      expect(job.id).toBe('v-edit');
      const call = (globalThis.fetch as any).mock.calls[0];
      expect(call[0]).toBe('https://test.azure.com/openai/v1/videos/v1/remix');
      const body = JSON.parse(call[1].body);
      expect(body.prompt).toBe('make it blue');
    });
  });

  describe('status mapping', () => {
    it.each([
      ['queued', 'queued'],
      ['preprocessing', 'processing'],
      ['running', 'processing'],
      ['processing', 'processing'],
      ['in_progress', 'processing'],
      ['succeeded', 'completed'],
      ['completed', 'completed'],
      ['failed', 'failed'],
      ['cancelled', 'failed'],
      ['unknown_status', 'processing'],
    ])('maps "%s" to "%s"', async (input, expected) => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: input,
        created_at: 1700000000,
      });

      const job = await azureAdapter.getVideo('v1');
      expect(job.status).toBe(expected);
    });
  });

  describe('size parsing', () => {
    it('parses size string correctly', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'queued',
        size: '1920x1080',
        created_at: 1700000000,
      });

      const job = await azureAdapter.getVideo('v1');
      expect(job.width).toBe(1920);
      expect(job.height).toBe(1080);
    });

    it('uses defaults when no size', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'queued',
        created_at: 1700000000,
      });

      const job = await azureAdapter.getVideo('v1');
      expect(job.width).toBe(1280);
      expect(job.height).toBe(720);
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(azureAdapter.listVideos()).rejects.toThrow('Azure API error 400: Bad Request');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', () => ({
  getConfig: vi.fn().mockReturnValue({
    provider: 'openai',
    azureEndpoint: '',
    azureDeploymentName: '',
    openaiApiKey: 'sk-test-key',
  }),
}));

import { openaiAdapter } from './openai.js';

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

describe('openaiAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createVideo', () => {
    it('sends correct payload to OpenAI', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'video-abc',
        status: 'queued',
        prompt: 'A sunrise',
        size: '1280x720',
        seconds: 16,
        model: 'sora-2',
        created_at: 1700000000,
      });

      const job = await openaiAdapter.createVideo({
        prompt: 'A sunrise',
        width: 1280,
        height: 720,
        duration: 16,
        variants: 1,
        model: 'sora-2-pro',
      });

      expect(job.id).toBe('video-abc');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/videos',
        expect.objectContaining({ method: 'POST' }),
      );

      const call = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('sora-2-pro');
      expect(body.size).toBe('1280x720');
      expect(body.seconds).toBe(16);
    });

    it('defaults model to sora-2', async () => {
      globalThis.fetch = mockFetchResponse({ id: 'v1', status: 'queued', created_at: 1700000000 });

      await openaiAdapter.createVideo({
        prompt: 'test',
        width: 1280,
        height: 720,
        duration: 8,
        variants: 1,
      });

      const call = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.model).toBe('sora-2');
    });
  });

  describe('listVideos', () => {
    it('fetches with limit=50', async () => {
      globalThis.fetch = mockFetchResponse({
        data: [
          { id: 'v1', status: 'completed', size: '1280x720', seconds: 8, created_at: 1700000000 },
        ],
      });

      const jobs = await openaiAdapter.listVideos();
      expect(jobs).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/videos?limit=50',
        expect.anything(),
      );
    });
  });

  describe('status mapping', () => {
    it.each([
      ['queued', 'queued'],
      ['in_progress', 'processing'],
      ['completed', 'completed'],
      ['failed', 'failed'],
      ['expired', 'failed'],
      ['something_else', 'processing'],
    ])('maps "%s" to "%s"', async (input, expected) => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: input,
        created_at: 1700000000,
      });

      const job = await openaiAdapter.getVideo('v1');
      expect(job.status).toBe(expected);
    });
  });

  describe('mapJob', () => {
    it('generates generations array for completed jobs', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'completed',
        created_at: 1700000000,
        completed_at: 1700001000,
      });

      const job = await openaiAdapter.getVideo('v1');
      expect(job.generations).toEqual([{ id: 'v1' }]);
    });

    it('returns empty generations for non-completed jobs', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'queued',
        created_at: 1700000000,
      });

      const job = await openaiAdapter.getVideo('v1');
      expect(job.generations).toEqual([]);
    });

    it('defaults model to sora-2', async () => {
      globalThis.fetch = mockFetchResponse({
        id: 'v1',
        status: 'queued',
        created_at: 1700000000,
      });

      const job = await openaiAdapter.getVideo('v1');
      expect(job.model).toBe('sora-2');
    });
  });

  describe('editVideo', () => {
    it('sends remix request to correct endpoint', async () => {
      globalThis.fetch = mockFetchResponse({ id: 'v-edit', status: 'queued', created_at: 1700000000 });

      await openaiAdapter.editVideo!({
        videoId: 'v1',
        prompt: 'change colors',
      });

      const call = (globalThis.fetch as any).mock.calls[0];
      expect(call[0]).toBe('https://api.openai.com/v1/videos/v1/remix');
      const body = JSON.parse(call[1].body);
      expect(body.prompt).toBe('change colors');
    });
  });

  describe('error handling', () => {
    it('throws on API error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(openaiAdapter.listVideos()).rejects.toThrow('OpenAI API error 401: Unauthorized');
    });
  });

  describe('auth header', () => {
    it('uses API key from config', async () => {
      globalThis.fetch = mockFetchResponse({ data: [] });

      await openaiAdapter.listVideos();
      const call = (globalThis.fetch as any).mock.calls[0];
      expect(call[1].headers['Authorization']).toBe('Bearer sk-test-key');
    });
  });
});

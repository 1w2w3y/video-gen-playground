import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

function mockFetch(data: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  });
}

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createVideo', () => {
    it('POSTs to /api/videos', async () => {
      const job = { id: 'v1', status: 'queued' };
      globalThis.fetch = mockFetch(job);

      const result = await api.createVideo({
        prompt: 'A cat',
        width: 1280,
        height: 720,
        duration: 8,
      });

      expect(result).toEqual(job);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/videos', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('adminListVideos', () => {
    it('GETs /api/admin/videos', async () => {
      const jobs = [{ id: 'v1' }, { id: 'v2' }];
      globalThis.fetch = mockFetch(jobs);

      const result = await api.adminListVideos();
      expect(result).toEqual(jobs);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/videos', expect.anything());
    });
  });

  describe('getVideo', () => {
    it('GETs /api/videos/:id', async () => {
      globalThis.fetch = mockFetch({ id: 'v1' });

      await api.getVideo('v1');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/videos/v1', expect.anything());
    });
  });

  describe('deleteVideo', () => {
    it('DELETEs /api/videos/:id', async () => {
      globalThis.fetch = mockFetch({ success: true });

      const result = await api.deleteVideo('v1');
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/videos/v1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  describe('getVideoContentUrl', () => {
    it('returns correct URL', () => {
      expect(api.getVideoContentUrl('v1')).toBe('/api/videos/v1/content');
    });
  });

  describe('editVideo', () => {
    it('POSTs to /api/videos/edits', async () => {
      globalThis.fetch = mockFetch({ id: 'v-edit' });

      await api.editVideo({ videoId: 'v1', prompt: 'make blue' });
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/videos/edits', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('getConfig', () => {
    it('GETs /api/config', async () => {
      globalThis.fetch = mockFetch({ provider: 'azure' });

      const config = await api.getConfig();
      expect(config.provider).toBe('azure');
    });
  });

  describe('updateConfig', () => {
    it('PUTs to /api/config', async () => {
      globalThis.fetch = mockFetch({ provider: 'openai' });

      await api.updateConfig({ provider: 'openai' });
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({
        method: 'PUT',
      }));
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Something broke' }),
      });

      await expect(api.getVideo('v1')).rejects.toThrow('Something broke');
    });

    it('falls back to statusText when no error in body', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      });

      await expect(api.getVideo('v1')).rejects.toThrow('Internal Server Error');
    });
  });
});

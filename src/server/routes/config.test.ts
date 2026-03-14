import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { configRouter } from './config.js';

vi.mock('../config.js', () => {
  let config = {
    provider: 'azure' as const,
    azureEndpoint: 'https://test.azure.com',
    azureDeploymentName: 'sora-2',
    openaiApiKey: 'sk-secret',
    adminEnabled: false,
  };
  return {
    getConfig: vi.fn(() => ({ ...config })),
    updateConfig: vi.fn((partial: any) => {
      config = { ...config, ...partial };
      return { ...config };
    }),
  };
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRouter);
  return app;
}

// Simple request helper using the app directly
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
        const json = await res.json();
        resolve({ status: res.status, body: json });
      } finally {
        server.close();
      }
    });
  });
}

describe('config routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/config', () => {
    it('returns config without exposing secrets', async () => {
      const res = await request(app, 'GET', '/api/config');
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('azure');
      expect(res.body.hasAzureEndpoint).toBe(true);
      expect(res.body.hasOpenaiKey).toBe(true);
      expect(res.body.azureEndpoint).toBeUndefined();
      expect(res.body.openaiApiKey).toBeUndefined();
    });
  });

  describe('PUT /api/config', () => {
    it('updates provider', async () => {
      const res = await request(app, 'PUT', '/api/config', { provider: 'openai' });
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('openai');
    });

    it('returns hasOpenaiKey boolean, not the key', async () => {
      const res = await request(app, 'PUT', '/api/config', { openaiApiKey: 'sk-new' });
      expect(res.status).toBe(200);
      expect(res.body.hasOpenaiKey).toBe(true);
      expect(res.body.openaiApiKey).toBeUndefined();
    });
  });
});

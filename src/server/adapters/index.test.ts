import { describe, it, expect, vi, beforeEach } from 'vitest';
import { azureAdapter } from './azure.js';
import { openaiAdapter } from './openai.js';

vi.mock('../config.js', () => {
  let provider = 'azure';
  return {
    getConfig: vi.fn(() => ({
      provider,
      azureEndpoint: 'https://test.azure.com',
      azureDeploymentName: 'sora-2',
      openaiApiKey: 'sk-test',
    })),
    __setProvider: (p: string) => { provider = p; },
  };
});

vi.mock('../auth/azure-credential.js', () => ({
  getAzureToken: vi.fn().mockResolvedValue('mock-token'),
}));

import { getAdapter } from './index.js';

describe('getAdapter', () => {
  beforeEach(async () => {
    const config = await import('../config.js') as any;
    config.__setProvider('azure');
  });

  it('returns azureAdapter when provider is azure', () => {
    const adapter = getAdapter();
    expect(adapter).toBe(azureAdapter);
  });

  it('returns openaiAdapter when provider is openai', async () => {
    const config = await import('../config.js') as any;
    config.__setProvider('openai');

    const adapter = getAdapter();
    expect(adapter).toBe(openaiAdapter);
  });
});

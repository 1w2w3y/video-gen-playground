import { describe, it, expect, beforeEach, vi } from 'vitest';

// Reset module between tests so singleton config resets
beforeEach(() => {
  vi.resetModules();
  // Clear relevant env vars
  delete process.env.PROVIDER;
  delete process.env.AZURE_ENDPOINT;
  delete process.env.AZURE_DEPLOYMENT_NAME;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ADMIN_ENABLED;
});

async function loadConfig() {
  return import('./config.js');
}

describe('getConfig', () => {
  it('returns default config when no env vars set', async () => {
    const { getConfig } = await loadConfig();
    const config = getConfig();
    expect(config).toEqual({
      provider: 'azure',
      azureEndpoint: '',
      azureDeploymentName: 'sora-2',
      openaiApiKey: '',
      adminEnabled: false,
    });
  });

  it('reads from environment variables', async () => {
    process.env.PROVIDER = 'openai';
    process.env.AZURE_ENDPOINT = 'https://my-endpoint.azure.com';
    process.env.AZURE_DEPLOYMENT_NAME = 'my-model';
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.ADMIN_ENABLED = 'true';

    const { getConfig } = await loadConfig();
    const config = getConfig();
    expect(config).toEqual({
      provider: 'openai',
      azureEndpoint: 'https://my-endpoint.azure.com',
      azureDeploymentName: 'my-model',
      openaiApiKey: 'sk-test-key',
      adminEnabled: true,
    });
  });

  it('returns a copy (not the singleton)', async () => {
    const { getConfig } = await loadConfig();
    const a = getConfig();
    const b = getConfig();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('updateConfig', () => {
  it('merges partial updates', async () => {
    const { getConfig, updateConfig } = await loadConfig();
    updateConfig({ provider: 'openai' });
    expect(getConfig().provider).toBe('openai');
    expect(getConfig().azureDeploymentName).toBe('sora-2'); // unchanged
  });

  it('returns updated config', async () => {
    const { updateConfig } = await loadConfig();
    const result = updateConfig({ azureEndpoint: 'https://new.azure.com' });
    expect(result.azureEndpoint).toBe('https://new.azure.com');
  });

  it('applies multiple sequential updates', async () => {
    const { getConfig, updateConfig } = await loadConfig();
    updateConfig({ provider: 'openai' });
    updateConfig({ openaiApiKey: 'sk-123' });
    const config = getConfig();
    expect(config.provider).toBe('openai');
    expect(config.openaiApiKey).toBe('sk-123');
  });
});

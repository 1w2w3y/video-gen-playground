export interface AppConfig {
  provider: 'azure' | 'openai';
  azureEndpoint: string;
  azureDeploymentName: string;
  openaiApiKey: string;
  adminEnabled: boolean;
}

let config: AppConfig | null = null;

function initConfig(): AppConfig {
  return {
    provider: (process.env.PROVIDER as 'azure' | 'openai') || 'azure',
    azureEndpoint: process.env.AZURE_ENDPOINT || '',
    azureDeploymentName: process.env.AZURE_DEPLOYMENT_NAME || 'sora-2',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    adminEnabled: process.env.ADMIN_ENABLED === 'true',
  };
}

export function getConfig(): AppConfig {
  if (!config) config = initConfig();
  return { ...config };
}

export function updateConfig(partial: Partial<AppConfig>): AppConfig {
  if (!config) config = initConfig();
  config = { ...config, ...partial };
  return getConfig();
}

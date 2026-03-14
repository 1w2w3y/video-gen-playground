export interface AppConfig {
  provider: 'azure' | 'openai';
  azureEndpoint: string;
  azureDeploymentName: string;
  openaiApiKey: string;
  adminEnabled: boolean;
  appInsightsConnectionString: string;
}

let config: AppConfig | null = null;

function initConfig(): AppConfig {
  return {
    provider: (process.env.PROVIDER as 'azure' | 'openai') || 'azure',
    azureEndpoint: process.env.AZURE_ENDPOINT || '',
    azureDeploymentName: process.env.AZURE_DEPLOYMENT_NAME || 'sora-2',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    adminEnabled: process.env.ADMIN_ENABLED === 'true',
    appInsightsConnectionString: process.env.APPINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=e9620b9b-7561-4b6e-8e1e-9b6ec71a2009;IngestionEndpoint=https://westus2-2.in.applicationinsights.azure.com/;LiveEndpoint=https://westus2.livediagnostics.monitor.azure.com/;ApplicationId=652fc8f2-a6f1-4dbf-b687-9300685c24e6',
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

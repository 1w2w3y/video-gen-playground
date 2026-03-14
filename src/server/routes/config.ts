import { Router } from 'express';
import { getConfig, updateConfig } from '../config.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  const config = getConfig();
  // Don't expose secrets or full endpoint
  res.json({
    provider: config.provider,
    hasAzureEndpoint: !!config.azureEndpoint,
    azureDeploymentName: config.azureDeploymentName,
    hasOpenaiKey: !!config.openaiApiKey,
    adminEnabled: config.adminEnabled,
  });
});

configRouter.put('/', (req, res) => {
  const { provider, azureEndpoint, azureDeploymentName, openaiApiKey } = req.body;
  const updates: any = {};
  if (provider) updates.provider = provider;
  if (azureEndpoint !== undefined) updates.azureEndpoint = azureEndpoint;
  if (azureDeploymentName !== undefined) updates.azureDeploymentName = azureDeploymentName;
  if (openaiApiKey !== undefined) updates.openaiApiKey = openaiApiKey;

  const config = updateConfig(updates);
  res.json({
    provider: config.provider,
    hasAzureEndpoint: !!config.azureEndpoint,
    azureDeploymentName: config.azureDeploymentName,
    hasOpenaiKey: !!config.openaiApiKey,
    adminEnabled: config.adminEnabled,
  });
});

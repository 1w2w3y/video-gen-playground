import { getConfig } from '../config.js';
import type { VideoAdapter } from './types.js';
import { azureAdapter } from './azure.js';
import { openaiAdapter } from './openai.js';

export function getAdapter(): VideoAdapter {
  const config = getConfig();
  return config.provider === 'openai' ? openaiAdapter : azureAdapter;
}

export type { VideoAdapter, VideoJob, CreateVideoRequest, ExtendVideoRequest, EditVideoRequest } from './types.js';

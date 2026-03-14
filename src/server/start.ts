import dotenv from 'dotenv';
dotenv.config();

import { initTelemetry } from './telemetry.js';
initTelemetry();

await import('./index.js');

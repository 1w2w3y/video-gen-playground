import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initClientTelemetry } from './lib/telemetry';

// Initialize telemetry asynchronously — does not block rendering
fetch('/api/config')
  .then(r => r.json())
  .then(config => {
    if (config.appInsightsConnectionString) {
      initClientTelemetry(config.appInsightsConnectionString);
    }
  })
  .catch(() => { /* telemetry is optional */ });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

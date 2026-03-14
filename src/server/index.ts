import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { videosRouter } from './routes/videos.js';
import { configRouter } from './routes/config.js';
import { adminRouter } from './routes/admin.js';
import { getConfig } from './config.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/videos', videosRouter);
app.use('/api/config', configRouter);

// Admin routes — gated by ADMIN_ENABLED env var
app.use('/api/admin', (_req, res, next) => {
  if (!getConfig().adminEnabled) {
    res.status(403).json({ error: 'Admin features are disabled' });
    return;
  }
  next();
}, adminRouter);

// In production, serve the built frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDir));
app.get('{*path}', (_req, res, next) => {
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  const cfg = getConfig();
  console.log(`Provider: ${cfg.provider}`);
  console.log(`Azure endpoint: ${cfg.azureEndpoint}`);
});

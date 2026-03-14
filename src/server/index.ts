import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { videosRouter } from './routes/videos.js';
import { configRouter } from './routes/config.js';
import { getConfig } from './config.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/videos', videosRouter);
app.use('/api/config', configRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  const cfg = getConfig();
  console.log(`Provider: ${cfg.provider}`);
  console.log(`Azure endpoint: ${cfg.azureEndpoint}`);
});

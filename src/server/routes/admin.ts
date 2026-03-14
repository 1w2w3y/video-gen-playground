import { Router } from 'express';
import { getAdapter } from '../adapters/index.js';

export const adminRouter = Router();

adminRouter.get('/videos', async (_req, res) => {
  try {
    const jobs = await getAdapter().listVideos();
    res.json(jobs);
  } catch (err: any) {
    console.error('Admin list videos error:', err);
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/videos/:id', async (req, res) => {
  try {
    await getAdapter().deleteVideo(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Admin delete video error:', err);
    res.status(500).json({ error: err.message });
  }
});

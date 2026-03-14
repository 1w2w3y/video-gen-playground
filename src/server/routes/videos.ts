import { Router } from 'express';
import { getAdapter } from '../adapters/index.js';

export const videosRouter = Router();

videosRouter.post('/', async (req, res) => {
  try {
    const { prompt, width, height, duration, variants, model, inputImageBase64, inputImageMediaType } = req.body;
    const job = await getAdapter().createVideo({
      prompt,
      width: width || 1280,
      height: height || 720,
      duration: duration || 8,
      variants: variants || 1,
      model,
      inputImageBase64,
      inputImageMediaType,
    });
    res.json(job);
  } catch (err: any) {
    console.error('Create video error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.get('/', async (_req, res) => {
  try {
    const jobs = await getAdapter().listVideos();
    res.json(jobs);
  } catch (err: any) {
    console.error('List videos error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.get('/:id', async (req, res) => {
  try {
    const job = await getAdapter().getVideo(req.params.id);
    res.json(job);
  } catch (err: any) {
    console.error('Get video error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.get('/:id/content', async (req, res) => {
  try {
    const generationId = req.query.generationId as string | undefined;
    const { stream, contentType } = await getAdapter().getVideoContent(req.params.id, generationId);
    res.setHeader('Content-Type', contentType);
    // Pipe the readable stream to the response
    const reader = (stream as any).getReader?.();
    if (reader) {
      // Web ReadableStream
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      pump().catch(err => {
        console.error('Stream error:', err);
        res.end();
      });
    } else {
      // Node ReadableStream
      (stream as any).pipe(res);
    }
  } catch (err: any) {
    console.error('Get video content error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.delete('/:id', async (req, res) => {
  try {
    await getAdapter().deleteVideo(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete video error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.post('/extensions', async (req, res) => {
  try {
    const adapter = getAdapter();
    if (!adapter.extendVideo) {
      res.status(501).json({ error: 'Video extension not supported by current provider' });
      return;
    }
    const { videoId, prompt, duration } = req.body;
    const job = await adapter.extendVideo({ videoId, prompt, duration });
    res.json(job);
  } catch (err: any) {
    console.error('Extend video error:', err);
    res.status(500).json({ error: err.message });
  }
});

videosRouter.post('/edits', async (req, res) => {
  try {
    const adapter = getAdapter();
    if (!adapter.editVideo) {
      res.status(501).json({ error: 'Video editing not supported by current provider' });
      return;
    }
    const { videoId, prompt } = req.body;
    const job = await adapter.editVideo({ videoId, prompt });
    res.json(job);
  } catch (err: any) {
    console.error('Edit video error:', err);
    res.status(500).json({ error: err.message });
  }
});

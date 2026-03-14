export interface CreateVideoRequest {
  prompt: string;
  width: number;
  height: number;
  duration: number;
  variants: number;
  model?: string;
}

export interface VideoJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt: string;
  width: number;
  height: number;
  duration: number;
  variants: number;
  model: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  generations: { id: string }[];
}

export interface EditVideoRequest {
  videoId: string;
  prompt: string;
}

export interface VideoAdapter {
  createVideo(req: CreateVideoRequest): Promise<VideoJob>;
  getVideo(id: string): Promise<VideoJob>;
  listVideos(): Promise<VideoJob[]>;
  deleteVideo(id: string): Promise<void>;
  getVideoContent(id: string, generationId?: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string }>;
  editVideo?(req: EditVideoRequest): Promise<VideoJob>;
}

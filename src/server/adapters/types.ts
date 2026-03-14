export interface CreateVideoRequest {
  prompt: string;
  width: number;
  height: number;
  duration: number;
  variants: number;
  model?: string;
  inputImageBase64?: string;
  inputImageMediaType?: string;
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

export interface ExtendVideoRequest {
  videoId: string;
  prompt: string;
  duration?: number;
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
  extendVideo?(req: ExtendVideoRequest): Promise<VideoJob>;
  editVideo?(req: EditVideoRequest): Promise<VideoJob>;
}

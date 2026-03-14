import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Trash2, Scissors, FastForward } from 'lucide-react';
import { api, type VideoJob } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getVideo(id);
      setJob(data);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-poll while processing
  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'processing')) return;
    const interval = setInterval(fetchJob, 5000);
    return () => clearInterval(interval);
  }, [job, fetchJob]);

  const handleDelete = async () => {
    if (!id || !confirm(t('jobs.deleteConfirm'))) return;
    try {
      await api.deleteVideo(id);
      navigate('/jobs');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  if (loading || !job) {
    return <div className="text-zinc-500 text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/jobs')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        {t('jobs.back')}
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('jobs.viewDetail')}</h2>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'completed' && (
            <>
              <button
                onClick={() => navigate(`/extend/${job.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <FastForward size={14} />
                {t('jobs.extend')}
              </button>
              <button
                onClick={() => navigate(`/edit/${job.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Scissors size={14} />
                {t('jobs.edit')}
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-900 text-red-300 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            {t('jobs.delete')}
          </button>
        </div>
      </div>

      {/* Video Player */}
      {job.status === 'completed' && (
        <div className="space-y-3">
          <video
            controls
            className="w-full rounded-lg border border-zinc-800"
            src={api.getVideoContentUrl(job.id)}
          />
          <a
            href={api.getVideoContentUrl(job.id)}
            download={`video-${job.id}.mp4`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            {t('jobs.download')}
          </a>
        </div>
      )}

      {/* Error */}
      {job.status === 'failed' && job.error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-300">
          {job.error}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 text-sm">
        <div>
          <span className="text-zinc-500">{t('jobs.id')}:</span>{' '}
          <span className="font-mono text-xs">{job.id}</span>
        </div>
        <div>
          <span className="text-zinc-500">{t('jobs.prompt')}:</span>{' '}
          <span>{job.prompt}</span>
        </div>
        <div>
          <span className="text-zinc-500">{t('jobs.resolution')}:</span>{' '}
          <span>{job.width}×{job.height}</span>
        </div>
        <div>
          <span className="text-zinc-500">{t('jobs.duration')}:</span>{' '}
          <span>{job.duration}s</span>
        </div>
        <div>
          <span className="text-zinc-500">{t('create.model')}:</span>{' '}
          <span>{job.model}</span>
        </div>
        <div>
          <span className="text-zinc-500">{t('jobs.created')}:</span>{' '}
          <span>{new Date(job.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

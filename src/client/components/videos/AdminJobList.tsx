import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2 } from 'lucide-react';
import { api, type VideoJob } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';

export function AdminJobList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.adminListVideos();
      setJobs(data);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-poll for non-terminal jobs
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('jobs.deleteConfirm'))) return;
    try {
      await api.adminDeleteVideo(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      toast(t('jobs.delete') + ' - OK', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="text-zinc-500 text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('admin.title')}</h2>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          {t('jobs.refresh')}
        </button>
      </div>

      <p className="text-xs text-zinc-500">{t('admin.description')}</p>

      {jobs.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">{t('admin.empty')}</div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="cursor-pointer w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-100 truncate">{job.prompt}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span className="font-mono">{job.id.slice(0, 12)}...</span>
                    <span>{job.width}x{job.height}</span>
                    <span>{job.duration}s</span>
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  <button
                    onClick={(e) => handleDelete(e, job.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-300 rounded transition-colors"
                  >
                    <Trash2 size={12} />
                    {t('jobs.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

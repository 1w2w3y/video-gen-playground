import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Film } from 'lucide-react';
import { api, jobStore, type VideoJob } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';

type Filter = 'all' | 'in_progress' | 'completed' | 'failed';

function timeAgo(date: string | number, t: (key: string) => string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return t('time.justNow');
  if (seconds < 60) return t('time.secondsAgo').replace('{{count}}', String(seconds));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutesAgo').replace('{{count}}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo').replace('{{count}}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 7) return t('time.daysAgo').replace('{{count}}', String(days));
  return new Date(date).toLocaleDateString();
}

function matchesFilter(job: VideoJob, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'in_progress') return job.status === 'queued' || job.status === 'processing';
  if (filter === 'completed') return job.status === 'completed';
  return job.status === 'failed';
}

export function JobList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchJobs = useCallback(async () => {
    const ids = jobStore.getIds();
    if (ids.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }
    try {
      const results = await Promise.allSettled(ids.map(id => api.getVideo(id)));
      const fetched: VideoJob[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          fetched.push(result.value);
        }
      }
      setJobs(fetched);
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

  if (loading) {
    return <div className="text-zinc-500 text-center py-12">Loading...</div>;
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('jobs.filterAll') },
    { key: 'in_progress', label: t('jobs.filterInProgress') },
    { key: 'completed', label: t('jobs.filterCompleted') },
    { key: 'failed', label: t('jobs.filterFailed') },
  ];

  const filteredJobs = jobs.filter(j => matchesFilter(j, filter));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('jobs.title')}</h2>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          {t('jobs.refresh')}
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <Film size={28} className="text-zinc-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-zinc-300 font-medium">{t('jobs.empty')}</p>
            <p className="text-zinc-500 text-sm">{t('jobs.emptyDescription')}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors mt-2"
          >
            <Plus size={18} />
            {t('jobs.emptyAction')}
          </button>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${
                  filter === f.key
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1.5 text-xs text-zinc-500">
                    {jobs.filter(j => matchesFilter(j, f.key)).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-zinc-500 text-center py-12">
              {t('jobs.empty')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-100 truncate">{job.prompt}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        <span>{job.width}×{job.height}</span>
                        <span>{job.duration}s</span>
                        <span>{timeAgo(job.createdAt, t)}</span>
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

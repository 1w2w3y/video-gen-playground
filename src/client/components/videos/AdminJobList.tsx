import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { api, type VideoJob } from '../../lib/api';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';

type SortKey = 'id' | 'prompt' | 'status' | 'resolution' | 'duration' | 'createdAt';
type SortDir = 'asc' | 'desc';

export function AdminJobList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.adminListVideos();
      setJobs(data);
      setSelected(prev => {
        const validIds = new Set(data.map(j => j.id));
        return new Set([...prev].filter(id => validIds.has(id)));
      });
      // The list API doesn't return prompts — fetch them individually in the background
      const needsPrompt = data.filter(j => !j.prompt);
      if (needsPrompt.length > 0) {
        const results = await Promise.allSettled(needsPrompt.map(j => api.getVideo(j.id)));
        setJobs(prev => {
          const promptMap = new Map<string, string>();
          needsPrompt.forEach((j, i) => {
            const r = results[i];
            if (r.status === 'fulfilled' && r.value.prompt) {
              promptMap.set(j.id, r.value.prompt);
            }
          });
          if (promptMap.size === 0) return prev;
          return prev.map(j => promptMap.has(j.id) ? { ...j, prompt: promptMap.get(j.id)! } : j);
        });
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const sortedJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = a.id.localeCompare(b.id);
          break;
        case 'prompt':
          cmp = a.prompt.localeCompare(b.prompt);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'resolution':
          cmp = (a.width * a.height) - (b.width * b.height);
          break;
        case 'duration':
          cmp = a.duration - b.duration;
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [jobs, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map(j => j.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(t('admin.deleteSelectedConfirm', { count }))) return;
    setDeleting(true);
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map(id => api.adminDeleteVideo(id)));
      const failedIds = new Set(ids.filter((_, i) => results[i].status === 'rejected'));
      const succeeded = ids.length - failedIds.size;
      setJobs(prev => prev.filter(j => failedIds.has(j.id) || !selected.has(j.id)));
      setSelected(new Set());
      if (failedIds.size > 0) {
        toast(`${succeeded} deleted, ${failedIds.size} failed`, 'error');
      } else {
        toast(`${succeeded} ${t('jobs.delete')} - OK`, 'success');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('jobs.deleteConfirm'))) return;
    try {
      await api.adminDeleteVideo(id);
      setJobs(prev => prev.filter(j => j.id !== id));
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast(t('jobs.delete') + ' - OK', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp size={12} className="opacity-0 group-hover:opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const ColHeader = ({ column, children, className = '' }: { column: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => handleSort(column)}
      className={`px-3 py-2 text-left text-xs font-medium text-zinc-400 cursor-pointer select-none group hover:text-zinc-200 transition-colors ${className}`}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon column={column} />
      </div>
    </th>
  );

  if (loading) {
    return <div className="text-zinc-500 text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('admin.title')}</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-900 text-red-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? '...' : t('admin.deleteSelected', { count: selected.size })}
            </button>
          )}
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            {t('jobs.refresh')}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">{t('admin.description')}</p>

      {jobs.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">{t('admin.empty')}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === jobs.length}
                    onChange={toggleSelectAll}
                    className="accent-blue-600"
                  />
                </th>
                <ColHeader column="id">{t('jobs.id')}</ColHeader>
                <ColHeader column="prompt" className="min-w-[200px]">{t('jobs.prompt')}</ColHeader>
                <ColHeader column="status">{t('jobs.status')}</ColHeader>
                <ColHeader column="resolution">{t('jobs.resolution')}</ColHeader>
                <ColHeader column="duration">{t('jobs.duration')}</ColHeader>
                <ColHeader column="createdAt">{t('jobs.created')}</ColHeader>
                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">{t('jobs.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedJobs.map(job => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className={`cursor-pointer transition-colors ${
                    selected.has(job.id) ? 'bg-blue-950/30' : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      className="accent-blue-600"
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-500">{job.id.slice(0, 16)}...</td>
                  <td className="px-3 py-3">
                    <p className={`truncate max-w-[300px] ${job.prompt ? 'text-zinc-100' : 'text-zinc-600 italic'}`}>
                      {job.prompt || '...'}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{job.width}x{job.height}</td>
                  <td className="px-3 py-3 text-zinc-400">{job.duration}s</td>
                  <td className="px-3 py-3 text-zinc-400 whitespace-nowrap">{new Date(job.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(e, job.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-300 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                      {t('jobs.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

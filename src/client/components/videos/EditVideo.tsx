import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Scissors } from 'lucide-react';
import { api, type VideoJob } from '../../lib/api';
import { useToast } from '../ui/Toast';

export function EditVideo() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) api.getVideo(id).then(setJob).catch(() => {});
  }, [id]);

  const handleSubmit = async () => {
    if (!id || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const newJob = await api.editVideo({ videoId: id, prompt: prompt.trim() });
      toast(t('edit.title') + ' - OK', 'success');
      navigate(`/jobs/${newJob.id}`);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(`/jobs/${id}`)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        {t('jobs.back')}
      </button>

      <h2 className="text-2xl font-bold">{t('edit.title')}</h2>

      {job && job.status === 'completed' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">{t('edit.sourceVideo')}</label>
          <video controls className="w-full rounded-lg border border-zinc-800" src={api.getVideoContentUrl(job.id)} />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">{t('edit.prompt')}</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('edit.promptPlaceholder')}
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!prompt.trim() || submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        <Scissors size={18} />
        {submitting ? '...' : t('edit.submit')}
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api, jobStore, type AppConfig } from '../../lib/api';
import { AZURE_RESOLUTIONS, OPENAI_RESOLUTIONS, AZURE_DURATIONS, OPENAI_DURATIONS, OPENAI_MODELS } from '../../lib/constants';
import { useToast } from '../ui/Toast';

export function CreateVideo() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolutionIdx, setResolutionIdx] = useState(0);
  const [duration, setDuration] = useState(8);
  const [variants, setVariants] = useState(1);
  const [model, setModel] = useState('sora-2');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  const resolutions = config?.provider === 'openai' ? OPENAI_RESOLUTIONS : AZURE_RESOLUTIONS;
  const durations = config?.provider === 'openai' ? OPENAI_DURATIONS : AZURE_DURATIONS;
  const showModelPicker = config?.provider === 'openai';

  useEffect(() => {
    // Reset to valid defaults when provider changes
    setResolutionIdx(0);
    setDuration(durations[0]);
  }, [config?.provider, durations]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setSubmitting(true);
    try {
      const res = resolutions[resolutionIdx];
      const job = await api.createVideo({
        prompt: prompt.trim(),
        width: res.width,
        height: res.height,
        duration,
        variants,
        model: showModelPicker ? model : undefined,
      });
      jobStore.addId(job.id);
      toast(t('create.title') + ' - OK', 'success');
      navigate('/jobs');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{t('create.title')}</h2>

      {/* Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">{t('create.prompt')}</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={t('create.promptPlaceholder')}
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Resolution */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">{t('create.resolution')}</label>
          <select
            value={resolutionIdx}
            onChange={e => setResolutionIdx(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {resolutions.map((r, i) => (
              <option key={i} value={i}>{t(r.labelKey)}</option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">{t('create.duration')}</label>
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {durations.map(d => (
              <option key={d} value={d}>{d} {t('create.durationUnit')}</option>
            ))}
          </select>
        </div>

        {/* Variants */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">{t('create.variants')}</label>
          <select
            value={variants}
            onChange={e => setVariants(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Model (OpenAI only) */}
        {showModelPicker && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">{t('create.model')}</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {OPENAI_MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!prompt.trim() || submitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        <Send size={18} />
        {submitting ? t('create.submitting') : t('create.submit')}
      </button>
    </div>
  );
}

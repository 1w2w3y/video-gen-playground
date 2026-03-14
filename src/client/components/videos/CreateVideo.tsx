import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Send, ImagePlus, X } from 'lucide-react';
import { api, type AppConfig } from '../../lib/api';
import { AZURE_RESOLUTIONS, OPENAI_RESOLUTIONS, AZURE_DURATIONS, OPENAI_DURATIONS, OPENAI_MODELS } from '../../lib/constants';
import { useToast } from '../ui/Toast';

export function CreateVideo() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolutionIdx, setResolutionIdx] = useState(0);
  const [duration, setDuration] = useState(8);
  const [variants, setVariants] = useState(1);
  const [model, setModel] = useState('sora-2');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
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

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Extract base64 and media type
      const [header, base64] = dataUrl.split(',');
      const mediaType = header.match(/data:(.*?);/)?.[1] || 'image/png';
      setImageBase64(base64);
      setImageMediaType(mediaType);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setSubmitting(true);
    try {
      const res = resolutions[resolutionIdx];
      await api.createVideo({
        prompt: prompt.trim(),
        width: res.width,
        height: res.height,
        duration,
        variants,
        model: showModelPicker ? model : undefined,
        inputImageBase64: imageBase64 || undefined,
        inputImageMediaType: imageMediaType || undefined,
      });
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

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">{t('create.inputImage')}</label>
        <p className="text-xs text-zinc-500">{t('create.inputImageHint')}</p>
        {imagePreview ? (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Input" className="max-h-48 rounded-lg border border-zinc-700" />
            <button
              onClick={removeImage}
              className="absolute top-1 right-1 bg-zinc-900/80 rounded-full p-1 hover:bg-red-900"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-zinc-700 rounded-lg p-6 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
          >
            <ImagePlus size={20} />
            {t('create.dropImage')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
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

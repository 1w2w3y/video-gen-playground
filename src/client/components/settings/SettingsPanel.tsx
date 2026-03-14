import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { api, type AppConfig } from '../../lib/api';
import { useToast } from '../ui/Toast';

export function SettingsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [provider, setProvider] = useState<'azure' | 'openai'>('azure');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureDeployment, setAzureDeployment] = useState('sora-2');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getConfig().then(c => {
      setConfig(c);
      setProvider(c.provider);
      setAzureDeployment(c.azureDeploymentName);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { provider, azureDeploymentName: azureDeployment };
      if (azureEndpoint) updates.azureEndpoint = azureEndpoint;
      if (openaiKey) updates.openaiApiKey = openaiKey;
      const c = await api.updateConfig(updates);
      setConfig(c);
      setAzureEndpoint('');
      setOpenaiKey('');
      toast(t('settings.saved'), 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{t('settings.title')}</h2>

      {/* Provider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">{t('settings.provider')}</label>
        <div className="flex gap-2">
          {(['azure', 'openai'] as const).map(p => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                provider === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {t(`settings.provider${p === 'azure' ? 'Azure' : 'Openai'}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Azure Settings */}
      {provider === 'azure' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">{t('settings.azureEndpoint')}</label>
            <p className="text-xs text-zinc-500">
              {config?.hasAzureEndpoint ? t('settings.azureEndpointSet') : t('settings.azureEndpointNotSet')}
            </p>
            <input
              type="text"
              value={azureEndpoint}
              onChange={e => setAzureEndpoint(e.target.value)}
              placeholder={t('settings.azureEndpointPlaceholder')}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">{t('settings.azureDeployment')}</label>
            <input
              type="text"
              value={azureDeployment}
              onChange={e => setAzureDeployment(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </>
      )}

      {/* OpenAI Settings */}
      {provider === 'openai' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">{t('settings.openaiKey')}</label>
          <input
            type="password"
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder={t('settings.openaiKeyPlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-zinc-500">
            {config?.hasOpenaiKey ? t('settings.openaiKeySet') : t('settings.openaiKeyNotSet')}
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        <Save size={18} />
        {saving ? t('settings.saving') : t('settings.save')}
      </button>
    </div>
  );
}

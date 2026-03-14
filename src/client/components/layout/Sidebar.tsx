import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, ListVideo, Settings, Languages, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

const navItems = [
  { path: '/', icon: Plus, labelKey: 'nav.create' },
  { path: '/jobs', icon: ListVideo, labelKey: 'nav.jobs' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [adminEnabled, setAdminEnabled] = useState(false);

  useEffect(() => {
    api.getConfig().then(cfg => setAdminEnabled(cfg.adminEnabled)).catch(() => {});
  }, []);

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  const allNavItems = adminEnabled
    ? [...navItems.slice(0, 2), { path: '/admin/jobs', icon: ShieldCheck, labelKey: 'nav.admin' }, ...navItems.slice(2)]
    : navItems;

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white">{t('app.title')}</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {allNavItems.map(({ path, icon: Icon, labelKey }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname === path
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            )}
          >
            <Icon size={18} />
            {t(labelKey)}
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={toggleLang}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <Languages size={18} />
          {i18n.language === 'en' ? '中文' : 'English'}
        </button>
      </div>
    </aside>
  );
}

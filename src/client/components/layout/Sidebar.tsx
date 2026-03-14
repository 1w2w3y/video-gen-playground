import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, ListVideo, Settings, Languages } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: Plus, labelKey: 'nav.create' },
  { path: '/jobs', icon: ListVideo, labelKey: 'nav.jobs' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white">{t('app.title')}</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
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

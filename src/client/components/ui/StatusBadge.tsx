import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const statusStyles = {
  queued: 'bg-zinc-700 text-zinc-300',
  processing: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  completed: 'bg-green-900/50 text-green-300 border border-green-700',
  failed: 'bg-red-900/50 text-red-300 border border-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const key = status as keyof typeof statusStyles;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[key] || statusStyles.queued)}>
      {status === 'processing' && <Loader2 size={12} className="animate-spin" />}
      {t(`status.${status}`, status)}
    </span>
  );
}

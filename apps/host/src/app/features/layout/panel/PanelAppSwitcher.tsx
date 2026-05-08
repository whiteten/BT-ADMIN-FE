import { ChevronRight, LayoutGrid } from 'lucide-react';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { APP_SWITCHER_ACTIVE_KEY, useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/**
 * 앱 전환 row.
 * PanelMenuRow와 동일한 스타일로 좌측 사이드 상단에 위치.
 * 클릭 시 activeMenuKey를 sentinel로 세팅 → PanelDetail이 앱 리스트를 렌더.
 */
const PanelAppSwitcher = () => {
  const { selectedRemote } = useRemoteSelector();
  const { activeMenuKey, setActiveMenuKey } = useMenuPanelStore();
  const isActive = activeMenuKey === APP_SWITCHER_ACTIVE_KEY;

  if (!selectedRemote) return null;

  const Icon = selectedRemote.icon ?? LayoutGrid;

  const handleActivate = () => setActiveMenuKey(APP_SWITCHER_ACTIVE_KEY);

  return (
    <button
      type="button"
      onClick={handleActivate}
      className={cn(
        'group/row flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors cursor-pointer',
        'text-[#212529] hover:bg-[var(--color-bt-primary)]/[0.08]',
        isActive && 'bg-[var(--color-bt-primary)]/10 text-[var(--color-bt-primary)]',
      )}
    >
      <span className={cn('flex items-center justify-center size-5 shrink-0', isActive ? 'text-[var(--color-bt-primary)]' : 'text-[#495057]')}>
        <Icon className="!size-5" />
      </span>
      <span className="flex-1 min-w-0 truncate text-sm font-semibold">{selectedRemote.appName}</span>
      <ChevronRight className={cn('size-4 shrink-0 opacity-60 transition-transform', isActive && 'translate-x-0.5 opacity-100 text-[var(--color-bt-primary)]')} />
    </button>
  );
};

export default PanelAppSwitcher;

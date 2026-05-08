import { Check, LayoutGrid } from 'lucide-react';
import PanelControls from './PanelControls';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/**
 * AppSwitcher row가 활성화됐을 때 PanelDetail 자리에 표시되는 앱 리스트.
 * 카드를 클릭하면 selectedRemote가 바뀌지만 패널은 유지된다(MenuPanel useEffect가
 * AppSwitcher 활성 상태에서는 라우트 변경에 의한 자동 close를 skip).
 */
const PanelAppList = () => {
  const { remotes, selectedRemote, setSelectedRemote } = useRemoteSelector();

  const handleSelect = (remote: (typeof remotes)[number]) => {
    setSelectedRemote(remote);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 flex items-center justify-between gap-2 px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center size-7 text-[var(--color-bt-primary)]">
            <LayoutGrid className="size-7" />
          </span>
          <h2 className="text-lg font-bold tracking-tight text-[#212529] truncate">앱 선택</h2>
        </div>
        <PanelControls />
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {remotes.length === 0 ? (
          <p className="text-sm text-[#878a99]">사용 가능한 앱이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {remotes.map((remote) => {
              const Icon = remote.icon ?? LayoutGrid;
              const isSelected = remote.appId === selectedRemote?.appId;
              return (
                <button
                  key={remote.appId}
                  type="button"
                  onClick={() => handleSelect(remote)}
                  className={cn(
                    'group/card flex items-center gap-3 rounded-xl bg-[#f8f9fb] hover:bg-[var(--color-bt-primary)]/[0.06] border border-transparent hover:border-[var(--color-bt-primary)]/20 px-4 py-3.5 text-left transition-colors cursor-pointer',
                    isSelected && 'bg-[var(--color-bt-primary)]/10 border-[var(--color-bt-primary)]/30',
                  )}
                >
                  <span className="flex items-center justify-center size-9 rounded-lg bg-white shadow-sm shrink-0">
                    <Icon className="size-5 text-[var(--color-bt-primary)]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold truncate', isSelected ? 'text-[var(--color-bt-primary)]' : 'text-[#212529]')}>{remote.appName}</p>
                  </div>
                  {isSelected && <Check className="size-4 shrink-0 text-[var(--color-bt-primary)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelAppList;

import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const APP_BADGE_COLORS = [
  '#DC2626', // red
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#CA8A04', // yellow
  '#16A34A', // green
  '#EA580C', // orange
  '#2563EB', // blue
  '#475569', // slate
  '#DB2777', // pink
  '#B45309', // brown
];

const getAppInitials = (appId: string) => appId.slice(0, 3).toUpperCase();

/**
 * 패널 가장 왼쪽 60px 컬럼. 모든 remote 앱을 3글자 색상 뱃지로 세로 나열.
 * - 뱃지 hover → displayedAppId 갱신 + 그 앱 첫 visible 메뉴로 activeMenuKey 자동 select (cascade UX)
 * - 뱃지 click → no-op (실제 navigate은 leaf 메뉴 클릭 시 자연 발생)
 * - 활성 표시: displayedAppId(현재 보고 있는 앱) / selectedRemote(URL상 현재 앱)을 시각 우선순위로 구분
 */
const PanelAppBadgeStrip = () => {
  const { remotes, selectedRemote } = useRemoteSelector();
  const displayedAppId = useMenuPanelStore((s) => s.displayedAppId);
  const setDisplayedAppId = useMenuPanelStore((s) => s.setDisplayedAppId);
  const setActiveMenuKey = useMenuPanelStore((s) => s.setActiveMenuKey);

  const handleEnter = (appId: string) => {
    setDisplayedAppId(appId);
    setActiveMenuKey(null);
  };

  return (
    <aside className="w-[60px] shrink-0 h-full bg-[#f8f9fb] border-r border-[#e9ecef] flex flex-col items-center gap-2 py-4 overflow-y-auto">
      {remotes.map((remote, index) => {
        const isDisplayed = remote.appId === displayedAppId;
        const isSelected = remote.appId === selectedRemote?.appId;
        const badgeColor = APP_BADGE_COLORS[index % APP_BADGE_COLORS.length];
        const badgeText = getAppInitials(remote.appId);

        return (
          <div key={remote.appId} className="relative">
            {isDisplayed && <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--color-bt-primary)]" />}
            <button
              type="button"
              title={remote.appName}
              onMouseEnter={() => handleEnter(remote.appId)}
              className={cn(
                'relative flex items-center justify-center size-9 rounded-lg text-white text-xs font-bold tracking-tight transition-transform cursor-default',
                isDisplayed && 'scale-110 ring-2 ring-[var(--color-bt-primary)]/40',
              )}
              style={{ backgroundColor: badgeColor }}
            >
              {badgeText}
              {isSelected && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-white ring-2 ring-[var(--color-bt-primary)]" />}
            </button>
          </div>
        );
      })}
    </aside>
  );
};

export default PanelAppBadgeStrip;

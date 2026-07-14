/**
 * 카드형 / 리스트형 표기 전환 토글.
 *
 * 목록 영역 헤더 우측에 두고 쓴다. 선택값은 useViewMode(화면키) 로 관리되며 localStorage 에 유지된다.
 *
 * 사용:
 *   const [viewMode, setViewMode] = useViewMode('ipron-endpoint');
 *   <ViewModeToggle value={viewMode} onChange={setViewMode} />
 */
import { Tooltip } from 'antd';
import { LayoutGrid, List } from 'lucide-react';
import { VIEW_MODE, type ViewMode } from '@/shared-store';
import { cn } from '../../lib/utils';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const OPTIONS: { mode: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { mode: VIEW_MODE.CARD, label: '카드형', Icon: LayoutGrid },
  { mode: VIEW_MODE.LIST, label: '리스트형', Icon: List },
];

export default function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div className={cn('inline-flex items-center rounded-md border border-gray-200 bg-gray-50 p-0.5', className)}>
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = value === mode;
        return (
          <Tooltip key={mode} title={label}>
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(mode)}
              className={cn(
                'flex items-center justify-center size-7 rounded transition-colors',
                active ? 'bg-white text-[#405189] shadow-sm' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <Icon className="size-4" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

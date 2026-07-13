import { useOperatorScopeStore } from '@/shared-store';
import BreadcrumbSlot from './components/BreadcrumbSlot';
import MenuButton from './components/MenuButton';
import TabStrip from './components/TabStrip';
import { cn } from '@/lib/utils';

export const SUB_HEADER_HEIGHT = 40;

export default function SubHeader() {
  // 운영자 모드: 탭 바를 다크 차콜로 — TopHeader(#1E293B)와 일체감.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  return (
    <div
      style={{ height: SUB_HEADER_HEIGHT }}
      className={cn('shrink-0 border-b', operatorMode ? 'bg-[#0F172A] border-white/5' : 'bg-[color-mix(in_srgb,var(--color-bt-header),black_20%)] border-white/5')}
    >
      <div className="flex items-center gap-3 h-full px-4">
        <MenuButton />
        <div className="h-6 w-px bg-white/10 shrink-0" />
        <div className="flex-1 min-w-0 h-9 flex items-center">
          <TabStrip />
        </div>
        <BreadcrumbSlot />
      </div>
    </div>
  );
}

import { type MouseEvent } from 'react';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown, X } from 'lucide-react';
import type { OpenTab } from '@/shared-store';
import TabContextMenuContent from './TabContextMenuContent';
import { useTabActions } from '../hooks/useTabActions';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

interface TabOverflowMenuProps {
  tabs: OpenTab[];
  activeId: string | null;
}

export default function TabOverflowMenu({ tabs, activeId }: TabOverflowMenuProps) {
  const { activate, close } = useTabActions();

  if (tabs.length === 0) return null;

  const handleClose = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    close(id);
  };

  const items: MenuProps['items'] = tabs.map((tab) => ({
    key: tab.id,
    label: (
      // 항목 우클릭 시 TabChip과 동일한 컨텍스트 메뉴 노출(다른 탭/우측/모두 닫기). 좌클릭은 항목 onClick(활성화).
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-center justify-between gap-2 w-full">
            <span className={tab.id === activeId ? 'font-semibold text-[var(--color-bt-primary)]' : ''}>{tab.label}</span>
            <button
              type="button"
              onClick={(e) => handleClose(e, tab.id)}
              aria-label="탭 닫기"
              className="inline-flex items-center justify-center size-4 rounded-sm text-[#adb5bd] hover:text-[#212529] hover:bg-black/5 cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </div>
        </ContextMenuTrigger>
        <TabContextMenuContent tabId={tab.id} />
      </ContextMenu>
    ),
    onClick: () => activate(tab),
  }));

  // 활성 탭이 오버플로(숨김) 목록에 있으면 +N 버튼을 활성 탭처럼 표시(현재 화면이 여기 있음을 표시).
  const activeInOverflow = tabs.some((t) => t.id === activeId);

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className={cn(
          'shrink-0 inline-flex items-center h-7 px-2 text-xs cursor-pointer transition-colors border-b-2 border-transparent',
          activeInOverflow ? 'border-white text-white font-semibold' : 'text-white/85 hover:border-white/40 hover:text-white',
        )}
        aria-label="탭 더보기"
      >
        <span className="mr-1">+{tabs.length}</span>
        <ChevronDown className="size-3" />
      </button>
    </Dropdown>
  );
}

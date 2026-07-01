import { useNavigate } from 'react-router-dom';
import { ArrowRightFromLine, ListX, Trash2, X } from 'lucide-react';
import { useOpenTabsStore } from '@/shared-store';
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';

/**
 * 탭 우클릭 컨텍스트 메뉴 본문(닫기 액션 묶음). TabChip(스트립)·TabOverflowMenu(+N) 양쪽에서 동일하게 사용.
 * 반드시 <ContextMenu> 루트의 자식으로 렌더한다. 닫은 뒤 활성 탭이 바뀌면 그 path로 이동.
 */
export default function TabContextMenuContent({ tabId }: { tabId: string }) {
  const navigate = useNavigate();
  const tabs = useOpenTabsStore((s) => s.tabs);
  const closeTab = useOpenTabsStore((s) => s.closeTab);
  const closeOthers = useOpenTabsStore((s) => s.closeOthers);
  const closeToRight = useOpenTabsStore((s) => s.closeToRight);
  const closeAll = useOpenTabsStore((s) => s.closeAll);

  const go = (result: { nextPath: string | null }) => {
    if (result.nextPath) navigate(result.nextPath);
  };

  const idx = tabs.findIndex((t) => t.id === tabId);
  const hasOthers = tabs.length > 1;
  const hasRight = idx >= 0 && idx < tabs.length - 1;

  return (
    // z-[1100] — +N(TabOverflowMenu)은 antd Dropdown(zIndex 1050) 안에서 열리므로, 기본 z-50으론 그 뒤로
    // 깔린다. antd 팝업보다 위로 올린다(스트립 TabChip 쪽에도 무해).
    // onClick stopPropagation — radix Content는 body로 포털되지만 React 트리상 +N의 antd 메뉴 item 안에
    // 있어, 항목 클릭이 React 버블링으로 antd item onClick(activate+navigate(tab.path))까지 닿아 우리
    // navigate를 덮는다(모두닫기 시 '/'로 안 가고 잔상). 여기서 전파를 끊어 antd item 핸들러 발화를 막는다.
    <ContextMenuContent className="z-[1100] w-40" onClick={(e) => e.stopPropagation()}>
      <ContextMenuItem onClick={() => go(closeTab(tabId))}>
        <X />탭 닫기
      </ContextMenuItem>
      <ContextMenuItem onClick={() => go(closeOthers(tabId))} disabled={!hasOthers}>
        <ListX />
        다른 탭 닫기
      </ContextMenuItem>
      <ContextMenuItem onClick={() => go(closeToRight(tabId))} disabled={!hasRight}>
        <ArrowRightFromLine />
        우측 탭 닫기
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => go(closeAll())}>
        <Trash2 />
        모두 닫기
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
